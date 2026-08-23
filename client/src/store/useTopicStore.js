// ─────────────────────────────────────────────────────────────────────────────
// useTopicStore — Global Zustand store for topic progress.
// Single Source of Truth for all chapter/topic completion data.
// Powered by Central Progress Engine & Static Syllabus
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand';
import {
  subscribeTopicProgress,
  seedTopicsForChapter,
  getTopicProgress,
  updateTopicStatus,
  scheduleRevisionIfNeeded,
  batchGetTopicProgress,
} from '../firebase/db';
import {
  SYLLABUS,
  HSC_SUBJECT_KEYS,
  BUET_SUBJECT_KEYS,
  getTopicsForChapter,
  getAllChaptersList,
} from '../data/syllabus';
import {
  calculateChapterProgress,
  calculateSubjectProgress,
  calculateOverallProgress,
  COMPLETION_THRESHOLD,
} from '../lib/progressEngine';

// ── Non-reactive registries (outside Zustand to avoid re-render storms) ──────
const _listeners = {};   // { [chapterDocId]: unsubscribe fn }
const _seeded    = new Set(); // chapterDocIds that have been seeded

export const useTopicStore = create((set, get) => ({
  // { [chapterDocId]: { [slug]: { studied, studiedAt, revisions:{1,2,3}, ... } } }
  topicMaps: {},

  // ── startListening ──────────────────────────────────────────────────────────
  // Idempotent — safe to call many times. Starts Firestore listener once.
  startListening: async (chapterDocId, allTopics, legacyStatus) => {
    if (!chapterDocId || !allTopics?.length) return;
    if (_listeners[chapterDocId]) return; // already subscribed

    // Step 1: seed if no data exists yet
    if (!_seeded.has(chapterDocId)) {
      try {
        const existing = await getTopicProgress(chapterDocId);
        if (Object.keys(existing).length === 0) {
          await seedTopicsForChapter(chapterDocId, allTopics, legacyStatus);
        } else {
          // Pre-fill store immediately so UI shows data before snapshot fires
          set(s => ({
            topicMaps: { ...s.topicMaps, [chapterDocId]: existing },
          }));
        }
        _seeded.add(chapterDocId);
      } catch (e) {
        console.error('[TopicStore] seed error', chapterDocId, e);
      }
    }

    // Step 2: real-time listener — updates store on every Firestore change
    const unsub = subscribeTopicProgress(chapterDocId, (map) => {
      set(s => ({
        topicMaps: { ...s.topicMaps, [chapterDocId]: map },
      }));
    });
    _listeners[chapterDocId] = unsub;
  },

  // ── loadAllUserTopics ───────────────────────────────────────────────────────
  // Bulk pre-loads all chapter topic subcollections on initial app/dashboard mount
  loadAllUserTopics: async (userId) => {
    if (!userId) return;
    try {
      const allChapters = getAllChaptersList();
      const docIds = allChapters.map(ch => `${userId}_${ch.subject}_${ch.chapterNumber}`);
      const bulkMaps = await batchGetTopicProgress(docIds);
      
      const filtered = {};
      Object.entries(bulkMaps).forEach(([k, map]) => {
        if (map && Object.keys(map).length > 0) {
          filtered[k] = map;
          _seeded.add(k);
        }
      });

      if (Object.keys(filtered).length > 0) {
        set(s => ({
          topicMaps: { ...s.topicMaps, ...filtered },
        }));
      }
    } catch (err) {
      console.warn('[TopicStore] loadAllUserTopics error:', err);
    }
  },

  // ── updateTopic ──────────────────────────────────────────────────────────────
  // Optimistic-first write + smart revision auto-queue.
  // chapterMeta: { userId, subject, chapterNumber, status }
  updateTopic: async (chapterDocId, slug, update, chapterMeta) => {
    const { topicMaps } = get();
    // Build optimistic patch
    const current = topicMaps[chapterDocId]?.[slug] || {};
    const existingRevisions = current.revisions || {};

    const patch = {
      ...current,
      slug,
      revisions: { ...existingRevisions },
      updatedAt: new Date().toISOString(),
    };

    if (typeof update.studied === 'boolean') {
      patch.studied   = update.studied;
      patch.studiedAt = update.studied ? new Date().toISOString() : null;
      // When un-studying, clear all revisions
      if (!update.studied) {
        patch.revisions = {};
      }
    }

    if (update.revisionLevel != null) {
      const key = String(update.revisionLevel);
      const updatedRevs = { ...existingRevisions };
      if (update.revisionDone) {
        updatedRevs[key] = new Date().toISOString();
      } else {
        delete updatedRevs[key];
      }
      patch.revisions = updatedRevs;
    }

    const updatedChapterMap = {
      ...(topicMaps[chapterDocId] || {}),
      [slug]: patch,
    };

    // Apply optimistically to store → instant UI update everywhere
    set(s => ({
      topicMaps: {
        ...s.topicMaps,
        [chapterDocId]: updatedChapterMap,
      },
    }));

    try {
      await updateTopicStatus(chapterDocId, slug, update);

      // Check if chapter reached completion threshold and queue revision if so
      if (chapterMeta && chapterMeta.userId) {
        const topics = getTopicsForChapter(chapterMeta.subject, chapterMeta.chapterNumber);
        const prog = calculateChapterProgress({ ...chapterMeta, topics }, updatedChapterMap);
        if (prog.isCompleted) {
          scheduleRevisionIfNeeded(chapterDocId, { ...chapterMeta, isFullyCompleted: true }).catch(() => {});
        }
      }
    } catch (err) {
      // Rollback on failure
      console.error('[TopicStore] write error — rolling back', err);
      const fresh = await getTopicProgress(chapterDocId);
      set(s => ({
        topicMaps: { ...s.topicMaps, [chapterDocId]: fresh },
      }));
      throw err;
    }
  },

  // ── stopAllListeners ─────────────────────────────────────────────────────────
  // Call on logout to clean up all Firestore listeners.
  stopAllListeners: () => {
    Object.values(_listeners).forEach(unsub => unsub?.());
    Object.keys(_listeners).forEach(k => delete _listeners[k]);
    _seeded.clear();
    set({ topicMaps: {} });
  },

  // ── setTopicMapBulk ───────────────────────────────────────────────────────────
  // Populate store from a one-time batch read (no listener attached).
  setTopicMapBulk: (chapterDocId, map) => {
    set(s => ({
      topicMaps: { ...s.topicMaps, [chapterDocId]: map },
    }));
    _seeded.add(chapterDocId);
  },

  // ── Central Progress Engine Selectors ─────────────────────────────────────────

  getChapterProgress: (chapter, chapterDocId) => {
    const { topicMaps } = get();
    const map = topicMaps[chapterDocId] || topicMaps[chapter?.id] || topicMaps[chapter?.legacyDocId] || {};
    return calculateChapterProgress(chapter, map);
  },

  getSubjectProgress: (subjectKeyOrChapters) => {
    const { topicMaps } = get();
    if (typeof subjectKeyOrChapters === 'string') {
      return calculateSubjectProgress(subjectKeyOrChapters, topicMaps);
    }
    // Backward compatibility if array of chapters passed
    if (Array.isArray(subjectKeyOrChapters) && subjectKeyOrChapters.length > 0) {
      const subjKey = subjectKeyOrChapters[0].subject;
      if (subjKey && SYLLABUS[subjKey]) {
        return calculateSubjectProgress(subjKey, topicMaps);
      }
      let total = 0, done = 0;
      subjectKeyOrChapters.forEach(ch => {
        const topics = getTopicsForChapter(ch.subject, ch.chapterNumber);
        const map = topicMaps[ch.id] || {};
        total += topics.length;
        done += topics.filter(t => map[t.slug]?.studied).length;
      });
      return {
        completedUnits: done,
        totalUnits: total,
        progressPct: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    }
    return { completedUnits: 0, totalUnits: 0, progressPct: 0 };
  },

  getOverallProgress: (subjectKeys = null) => {
    const { topicMaps } = get();
    return calculateOverallProgress(subjectKeys, topicMaps);
  },

  getBuetProgress: () => {
    const { topicMaps } = get();
    return calculateOverallProgress(BUET_SUBJECT_KEYS, topicMaps);
  },

  getHscProgress: () => {
    const { topicMaps } = get();
    return calculateOverallProgress(HSC_SUBJECT_KEYS, topicMaps);
  },

  getAITopicSummary: () => {
    const { topicMaps } = get();
    const bySubject = {};
    HSC_SUBJECT_KEYS.forEach(subjKey => {
      const subj = SYLLABUS[subjKey];
      if (!subj) return;
      const sp = calculateSubjectProgress(subjKey, topicMaps);
      bySubject[subjKey] = {
        name: subj.name,
        shortName: subj.shortName,
        completedUnits: sp.completedUnits,
        totalUnits: sp.totalUnits,
        progressPct: sp.progressPct,
        completedChapters: sp.completedChapters,
        totalChapters: sp.totalChapters,
        isCompleted: sp.isCompleted,
      };
    });
    return bySubject;
  },
}));
