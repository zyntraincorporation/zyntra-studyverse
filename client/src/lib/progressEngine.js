// ─────────────────────────────────────────────────────────────────────────────
// ZYNTRA StudyVerse — Central Progress Engine
// Single Source of Truth for all Progress, Completion, & Revision Metrics
// ─────────────────────────────────────────────────────────────────────────────

import { SYLLABUS, HSC_SUBJECT_KEYS, BUET_SUBJECT_KEYS, getTopicsForChapter } from '../data/syllabus';

/** Default completion threshold (90% topics completed = chapter Completed) */
export const COMPLETION_THRESHOLD = 0.90;

/**
 * Calculate bounded integer percentage from completed and total units.
 * @param {number} completedUnits
 * @param {number} totalUnits
 * @returns {number} 0-100
 */
export function calculateProgress(completedUnits, totalUnits) {
  if (!totalUnits || totalUnits <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completedUnits / totalUnits) * 100)));
}

/**
 * Determine completion status based on progress percentage and threshold.
 * @param {number} progressPct
 * @param {number} totalUnits
 * @param {number} threshold (default 0.90)
 * @returns {'not_started' | 'in_progress' | 'completed'}
 */
export function getCompletionStatus(progressPct, totalUnits, threshold = COMPLETION_THRESHOLD) {
  if (!totalUnits || totalUnits <= 0) return 'not_started';
  if (progressPct >= threshold * 100) return 'completed';
  if (progressPct > 0) return 'in_progress';
  return 'not_started';
}

/**
 * Calculate progress metrics for a single chapter.
 * Supports both syllabus chapter objects and legacy chapter metadata.
 *
 * @param {object} chapter - { id?, legacyDocId?, subject, chapterNumber, topics? }
 * @param {object} completionMap - { [slugOrId]: { studied, revisions, ... } }
 * @returns {{
 *   completedUnits: number,
 *   totalUnits: number,
 *   progressPct: number,
 *   status: 'not_started' | 'in_progress' | 'completed',
 *   isCompleted: boolean,
 *   rev1Pct: number,
 *   rev2Pct: number,
 *   rev3Pct: number
 * }}
 */
export function calculateChapterProgress(chapter, completionMap = {}) {
  if (!chapter) {
    return {
      completedUnits: 0,
      totalUnits: 0,
      progressPct: 0,
      status: 'not_started',
      isCompleted: false,
      rev1Pct: 0,
      rev2Pct: 0,
      rev3Pct: 0,
    };
  }

  const topics = chapter.topics || getTopicsForChapter(chapter.subject, chapter.chapterNumber) || [];
  const totalUnits = topics.length;

  if (totalUnits === 0) {
    return {
      completedUnits: 0,
      totalUnits: 0,
      progressPct: 0,
      status: 'not_started',
      isCompleted: false,
      rev1Pct: 0,
      rev2Pct: 0,
      rev3Pct: 0,
    };
  }

  let completedUnits = 0;
  let rev1Count = 0;
  let rev2Count = 0;
  let rev3Count = 0;

  topics.forEach(t => {
    // Lookup by topic permanent id or legacy slug for 100% backward compatibility
    const data = (t.id && completionMap[t.id]) || (t.slug && completionMap[t.slug]) || {};
    if (data.studied) completedUnits++;

    // Backward-compatible revisions lookup (nested object or legacy dot-notated key)
    const revs = data.revisions || {};
    if (revs['1'] || data['revisions.1']) rev1Count++;
    if (revs['2'] || data['revisions.2']) rev2Count++;
    if (revs['3'] || data['revisions.3']) rev3Count++;
  });

  const progressPct = calculateProgress(completedUnits, totalUnits);
  const status = getCompletionStatus(progressPct, totalUnits);

  return {
    completedUnits,
    totalUnits,
    progressPct,
    status,
    isCompleted: status === 'completed',
    rev1Pct: calculateProgress(rev1Count, totalUnits),
    rev2Pct: calculateProgress(rev2Count, totalUnits),
    rev3Pct: calculateProgress(rev3Count, totalUnits),
  };
}

/**
 * Calculate progress for a specific subject.
 *
 * @param {string | object} subject - subjectKey e.g. 'Physics1' or subject object
 * @param {object} topicMaps - { [chapterDocId]: { [slug]: topicData } }
 * @returns {{
 *   completedUnits: number,
 *   totalUnits: number,
 *   progressPct: number,
 *   completedChapters: number,
 *   totalChapters: number,
 *   status: 'not_started' | 'in_progress' | 'completed',
 *   isCompleted: boolean
 * }}
 */
export function calculateSubjectProgress(subject, topicMaps = {}) {
  const subjectData = typeof subject === 'string' ? SYLLABUS[subject] : subject;
  if (!subjectData || !subjectData.chapters) {
    return {
      completedUnits: 0,
      totalUnits: 0,
      progressPct: 0,
      completedChapters: 0,
      totalChapters: 0,
      status: 'not_started',
      isCompleted: false,
    };
  }

  const chapters = subjectData.chapters;
  let totalUnits = 0;
  let completedUnits = 0;
  let completedChapters = 0;

  chapters.forEach(ch => {
    // Topic map might be keyed by chapter.id (e.g. physics1-ch-01) or legacyDocId (e.g. Physics1_1) or full docId (userId_Physics1_1)
    let chMap = topicMaps[ch.id] || topicMaps[ch.legacyDocId];
    if (!chMap) {
      // Find by matching docId suffix if docId has userId prefix
      const matchKey = Object.keys(topicMaps).find(
        k => k === ch.id || k === ch.legacyDocId || k.endsWith(`_${ch.subject || subjectData.id}_${ch.chapterNumber}`)
      );
      chMap = matchKey ? topicMaps[matchKey] : {};
    }

    const chProg = calculateChapterProgress(ch, chMap);
    totalUnits += chProg.totalUnits;
    completedUnits += chProg.completedUnits;
    if (chProg.isCompleted) completedChapters++;
  });

  const progressPct = calculateProgress(completedUnits, totalUnits);
  const status = getCompletionStatus(progressPct, totalUnits);

  return {
    completedUnits,
    totalUnits,
    progressPct,
    completedChapters,
    totalChapters: chapters.length,
    status,
    isCompleted: status === 'completed',
  };
}

/**
 * Calculate overall aggregate progress across a list of subjects.
 *
 * @param {string[] | null} subjectKeys - Array of subject keys (defaults to all HSC subjects)
 * @param {object} topicMaps - Global topic maps
 * @returns {{
 *   completedUnits: number,
 *   totalUnits: number,
 *   progressPct: number,
 *   completedChapters: number,
 *   totalChapters: number,
 *   status: 'not_started' | 'in_progress' | 'completed'
 * }}
 */
export function calculateOverallProgress(subjectKeys = null, topicMaps = {}) {
  const keys = subjectKeys || HSC_SUBJECT_KEYS;
  let totalUnits = 0;
  let completedUnits = 0;
  let totalChapters = 0;
  let completedChapters = 0;

  keys.forEach(k => {
    const sp = calculateSubjectProgress(k, topicMaps);
    totalUnits += sp.totalUnits;
    completedUnits += sp.completedUnits;
    totalChapters += sp.totalChapters;
    completedChapters += sp.completedChapters;
  });

  const progressPct = calculateProgress(completedUnits, totalUnits);
  return {
    completedUnits,
    totalUnits,
    progressPct,
    completedChapters,
    totalChapters,
    status: getCompletionStatus(progressPct, totalUnits),
  };
}
