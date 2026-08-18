// ─────────────────────────────────────────────────────────────────────────────
// useTopicStore — Global Zustand store for topic progress.
// Single Source of Truth for all chapter/topic completion data.
//
// Architecture:
//   Firestore topics subcollection
//       ↓ onSnapshot (lazy, per chapter, kept alive once started)
//   useTopicStore.topicMaps[chapterDocId]
//       ↓ selectors
//   ChaptersPage · SubjectSection · Dashboard · AI context · Revision queue
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand';
import {
  subscribeTopicProgress,
  seedTopicsForChapter,
  getTopicProgress,
  updateTopicStatus,
  scheduleRevisionIfNeeded,
} from '../firebase/db';
import {
  calcChapterStudyPct,
  calcChapterRevisionPct,
  getTopicsForChapter,
} from '../lib/chapters-data';

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

  // ── updateTopic ──────────────────────────────────────────────────────────────
  // Optimistic-first write + revision auto-queue on first study.
  // chapterMeta: { userId, subject, chapterNumber, status }
  updateTopic: async (chapterDocId, slug, update, chapterMeta) => {
    const { topicMaps } = get();
    const current = topicMaps[chapterDocId]?.[slug] || { revisions: {} };

    // Build optimistic patch
    const patch = {
      ...current,
      revisions: { ...(current.revisions || {}) },
      updatedAt: new Date().toISOString(),
    };
    if (typeof update.studied === 'boolean') {
      patch.studied   = update.studied;
      patch.studiedAt = update.studied ? new Date().toISOString() : null;
    }
    if (update.revisionLevel != null) {
      patch.revisions[String(update.revisionLevel)] =
        update.revisionDone ? new Date().toISOString() : null;
    }

    // Apply optimistically to store → instant UI update
    set(s => ({
      topicMaps: {
        ...s.topicMaps,
        [chapterDocId]: { ...s.topicMaps[chapterDocId], [slug]: patch },
      },
    }));

    try {
      await updateTopicStatus(chapterDocId, slug, update);

      // Auto-queue chapter for revision when a topic is first studied
      if (update.studied === true && chapterMeta) {
        scheduleRevisionIfNeeded(chapterDocId, chapterMeta).catch(() => {});
      }
    } catch (err) {
      // Rollback on failure
      console.error('[TopicStore] write error — rolling back', err);
      const fresh = await getTopicProgress(chapterDocId);
      set(s => ({
        topicMaps: { ...s.topicMaps, [chapterDocId]: fresh },
      }));
      throw err; // rethrow so ChapterRow can show toast
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

  // ── Derived selectors ─────────────────────────────────────────────────────────

  getSubjectProgress: (chapters) => {
    const { topicMaps } = get();
    let totalTopics = 0, doneTopics = 0;
    chapters.forEach(ch => {
      const allTopics = getTopicsForChapter(ch.subject, ch.chapterNumber);
      const map = topicMaps[ch.id] || {};
      totalTopics += allTopics.filter(t => t.type === 'topic').length;
      doneTopics  += allTopics.filter(t => t.type === 'topic' && map[t.slug]?.studied).length;
    });
    return {
      done: doneTopics,
      total: totalTopics,
      studyPct: totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0,
    };
  },

  getOverallProgress: (allChapters) => {
    const { topicMaps } = get();
    let totalTopics = 0, doneTopics = 0;
    allChapters.forEach(ch => {
      const allTopics = getTopicsForChapter(ch.subject, ch.chapterNumber);
      const map = topicMaps[ch.id] || {};
      totalTopics += allTopics.filter(t => t.type === 'topic').length;
      doneTopics  += allTopics.filter(t => t.type === 'topic' && map[t.slug]?.studied).length;
    });
    return {
      done: doneTopics,
      total: totalTopics,
      studyPct: totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0,
    };
  },

  getAITopicSummary: (allChapters) => {
    const { topicMaps } = get();
    const bySubject = {};
    allChapters.forEach(ch => {
      const allTopics = getTopicsForChapter(ch.subject, ch.chapterNumber);
      const map = topicMaps[ch.id] || {};
      if (!bySubject[ch.subject]) bySubject[ch.subject] = { done: 0, total: 0, rev1: 0 };
      allTopics.filter(t => t.type === 'topic').forEach(t => {
        bySubject[ch.subject].total++;
        if (map[t.slug]?.studied)          bySubject[ch.subject].done++;
        if (map[t.slug]?.revisions?.['1']) bySubject[ch.subject].rev1++;
      });
    });
    return bySubject;
  },
}));
