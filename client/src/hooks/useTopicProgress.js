import { useEffect } from 'react';
import { useTopicStore } from '../store/useTopicStore';
import { calculateChapterProgress } from '../lib/progressEngine';

// Stable empty object — prevents infinite re-render when map is missing
const EMPTY_MAP = {};

/**
 * useTopicProgress — thin wrapper around the global useTopicStore.
 * Returns live progress data for a single chapter.
 *
 * @param {string}  chapterDocId   - Firestore doc ID
 * @param {Array}   allTopics      - from SYLLABUS / TOPIC_DATA
 * @param {string}  legacyStatus   - for legacy migration on first seed
 * @param {boolean} isOpen         - start listener when chapter panel opens
 */
export function useTopicProgress(chapterDocId, allTopics, legacyStatus, isOpen) {
  const startListening = useTopicStore(s => s.startListening);
  const updateTopic    = useTopicStore(s => s.updateTopic);

  // Stable reference when no data exists
  const rawMap = useTopicStore(s => s.topicMaps[chapterDocId]);
  const completionMap = rawMap ?? EMPTY_MAP;

  // Start listener when chapter opens (idempotent)
  useEffect(() => {
    if (!isOpen || !chapterDocId || !allTopics?.length) return;
    startListening(chapterDocId, allTopics, legacyStatus);
  }, [isOpen, chapterDocId]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = calculateChapterProgress({ topics: allTopics }, completionMap);
  const loading = isOpen && !rawMap;

  return {
    completionMap,
    loading,
    error: null,
    updateTopic: (slug, update, meta) => updateTopic(chapterDocId, slug, update, meta),
    studyPct: progress.progressPct,
    status: progress.status,
    isCompleted: progress.isCompleted,
    rev1Pct: progress.rev1Pct,
    rev2Pct: progress.rev2Pct,
    rev3Pct: progress.rev3Pct,
    doneCount: progress.completedUnits,
    totalCount: progress.totalUnits,
  };
}
