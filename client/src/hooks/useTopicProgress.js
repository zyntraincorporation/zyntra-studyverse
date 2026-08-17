import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getTopicProgress,
  updateTopicStatus,
  seedTopicsForChapter,
  subscribeTopicProgress,
} from '../firebase/db';
import { calcChapterStudyPct, calcChapterRevisionPct } from '../lib/chapters-data';

/**
 * useTopicProgress — manages topic-level progress for a single chapter.
 *
 * @param {string}  chapterDocId   - Firestore doc ID, e.g. "uid_Physics1_1"
 * @param {Array}   allTopics      - from TOPIC_DATA[`${subject}_${chapterNumber}`]
 * @param {string}  legacyStatus   - chapter's existing status for migration
 * @param {boolean} isOpen         - only subscribe when chapter panel is open
 */
export function useTopicProgress(chapterDocId, allTopics, legacyStatus, isOpen) {
  // completionMap: { [slug]: { studied, studiedAt, revisions: { '1':..., '2':..., '3':... } } }
  const [completionMap, setCompletionMap]   = useState({});
  const [loading, setLoading]               = useState(false);
  const [seeded, setSeeded]                 = useState(false);
  const [error, setError]                   = useState(null);
  const unsubRef                            = useRef(null);
  const hasSeededRef                        = useRef(false);

  // ── Seed + subscribe when panel opens ───────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !chapterDocId || !allTopics?.length) return;

    let cancelled = false;

    const init = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Check if topics already exist (fast read)
        const existing = await getTopicProgress(chapterDocId);
        const hasData  = Object.keys(existing).length > 0;

        if (!hasData && !hasSeededRef.current) {
          // 2. First time — seed from TOPIC_DATA (with legacy migration)
          await seedTopicsForChapter(chapterDocId, allTopics, legacyStatus);
          hasSeededRef.current = true;
        } else if (hasData) {
          hasSeededRef.current = true;
        }

        if (cancelled) return;
        setSeeded(true);

        // 3. Subscribe for real-time updates
        unsubRef.current = subscribeTopicProgress(chapterDocId, map => {
          if (!cancelled) setCompletionMap(map);
        });

      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load topics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [isOpen, chapterDocId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Optimistic update handler ────────────────────────────────────────────────
  const updateTopic = useCallback(async (slug, update) => {
    // Optimistic update — apply immediately
    setCompletionMap(prev => {
      const current = prev[slug] || { revisions: {} };
      const next    = { ...current, revisions: { ...current.revisions } };

      if (typeof update.studied === 'boolean') {
        next.studied   = update.studied;
        next.studiedAt = update.studied ? new Date().toISOString() : null;
      }
      if (update.revisionLevel != null) {
        next.revisions[String(update.revisionLevel)] =
          update.revisionDone ? new Date().toISOString() : null;
      }

      return { ...prev, [slug]: next };
    });

    try {
      await updateTopicStatus(chapterDocId, slug, update);
      // onSnapshot will confirm the final state
    } catch (err) {
      // Rollback on failure
      setError(err.message || 'Update failed');
      // Re-fetch to restore accurate state
      const fresh = await getTopicProgress(chapterDocId);
      setCompletionMap(fresh);
    }
  }, [chapterDocId]);

  // ── Aggregated progress values ───────────────────────────────────────────────
  const studyPct   = calcChapterStudyPct(allTopics, completionMap);
  const rev1Pct    = calcChapterRevisionPct(allTopics, completionMap, 1);
  const rev2Pct    = calcChapterRevisionPct(allTopics, completionMap, 2);
  const rev3Pct    = calcChapterRevisionPct(allTopics, completionMap, 3);

  const doneCount  = allTopics
    ? allTopics.filter(t => completionMap[t.slug]?.studied).length
    : 0;

  return {
    completionMap,
    loading,
    seeded,
    error,
    updateTopic,
    studyPct,
    rev1Pct,
    rev2Pct,
    rev3Pct,
    doneCount,
    totalCount: allTopics?.length ?? 0,
  };
}
