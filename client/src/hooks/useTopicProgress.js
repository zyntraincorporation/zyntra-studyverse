import { useEffect } from 'react';
import { useTopicStore } from '../store/useTopicStore';
import { calcChapterStudyPct, calcChapterRevisionPct } from '../lib/chapters-data';

/**
 * useTopicProgress — thin wrapper around the global useTopicStore.
 * Starts a real-time listener for the chapter on first call.
 * Reads data from the shared global store — no isolated local state.
 *
 * @param {string}  chapterDocId   - Firestore doc ID, e.g. "uid_Physics1_1"
 * @param {Array}   allTopics      - from TOPIC_DATA[`${subject}_${chapterNumber}`]
 * @param {string}  legacyStatus   - chapter's existing status for legacy migration
 * @param {boolean} isOpen         - start listener when chapter panel is opened
 */
export function useTopicProgress(chapterDocId, allTopics, legacyStatus, isOpen) {
  const startListening = useTopicStore(s => s.startListening);
  const updateTopic    = useTopicStore(s => s.updateTopic);
  const completionMap  = useTopicStore(s => s.topicMaps[chapterDocId] ?? {});

  // Start real-time listener the first time the chapter panel opens.
  // startListening is idempotent — safe to call on every render.
  useEffect(() => {
    if (!isOpen || !chapterDocId || !allTopics?.length) return;
    startListening(chapterDocId, allTopics, legacyStatus);
  }, [isOpen, chapterDocId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived progress values (computed from global store, always fresh) ────
  const studyPct  = calcChapterStudyPct(allTopics, completionMap);
  const rev1Pct   = calcChapterRevisionPct(allTopics, completionMap, 1);
  const rev2Pct   = calcChapterRevisionPct(allTopics, completionMap, 2);
  const rev3Pct   = calcChapterRevisionPct(allTopics, completionMap, 3);

  const doneCount = allTopics
    ? allTopics.filter(t => completionMap[t.slug]?.studied).length
    : 0;

  // loading = true only if chapter has no data in store yet and is open
  const loading = isOpen && Object.keys(completionMap).length === 0;

  return {
    completionMap,
    loading,
    error:      null, // errors surface via toast in updateTopic
    updateTopic: (slug, update) => updateTopic(chapterDocId, slug, update),
    studyPct,
    rev1Pct,
    rev2Pct,
    rev3Pct,
    doneCount,
    totalCount: allTopics?.length ?? 0,
  };
}
