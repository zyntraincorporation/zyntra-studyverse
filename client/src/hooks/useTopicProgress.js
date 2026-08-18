import { useEffect, useRef } from 'react';
import { useTopicStore } from '../store/useTopicStore';
import { calcChapterStudyPct, calcChapterRevisionPct } from '../lib/chapters-data';

// Stable empty object — prevents infinite re-render when map is missing
const EMPTY_MAP = {};

/**
 * useTopicProgress — thin wrapper around the global useTopicStore.
 * Returns live progress data for a single chapter.
 *
 * @param {string}  chapterDocId   - Firestore doc ID
 * @param {Array}   allTopics      - from TOPIC_DATA
 * @param {string}  legacyStatus   - for legacy migration on first seed
 * @param {boolean} isOpen         - start listener when chapter panel opens
 */
export function useTopicProgress(chapterDocId, allTopics, legacyStatus, isOpen) {
  const startListening = useTopicStore(s => s.startListening);
  const updateTopic    = useTopicStore(s => s.updateTopic);

  // Use a stable reference when no data exists — avoids infinite re-render
  // (new {} on every render causes Zustand to detect "change" every cycle)
  const rawMap      = useTopicStore(s => s.topicMaps[chapterDocId]);
  const completionMap = rawMap ?? EMPTY_MAP;

  // Start listener when chapter opens (idempotent)
  useEffect(() => {
    if (!isOpen || !chapterDocId || !allTopics?.length) return;
    startListening(chapterDocId, allTopics, legacyStatus);
  }, [isOpen, chapterDocId]); // eslint-disable-line react-hooks/exhaustive-deps

  const studyPct  = calcChapterStudyPct(allTopics, completionMap);
  const rev1Pct   = calcChapterRevisionPct(allTopics, completionMap, 1);
  const rev2Pct   = calcChapterRevisionPct(allTopics, completionMap, 2);
  const rev3Pct   = calcChapterRevisionPct(allTopics, completionMap, 3);

  const doneCount = allTopics
    ? allTopics.filter(t => completionMap[t.slug]?.studied).length
    : 0;

  const loading = isOpen && !rawMap; // only loading when explicitly open + no data

  return {
    completionMap,
    loading,
    error: null,
    updateTopic: (slug, update, meta) => updateTopic(chapterDocId, slug, update, meta),
    studyPct,
    rev1Pct,
    rev2Pct,
    rev3Pct,
    doneCount,
    totalCount: allTopics?.length ?? 0,
  };
}
