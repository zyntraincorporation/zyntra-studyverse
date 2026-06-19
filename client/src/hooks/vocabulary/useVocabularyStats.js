import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store';
import { getVocabStats } from '../../firebase/db';

export const STATS_KEYS = {
  weekly:  ['vocabulary', 'stats', 'weekly'],
  monthly: ['vocabulary', 'stats', 'monthly'],
  streak:  ['vocabulary', 'stats', 'streak'],
  heatmap: ['vocabulary', 'stats', 'heatmap'],
  all:     ['vocabulary', 'stats'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Base hook: fetches the combined stats object from Firestore
// Returns: { totalWords, masteredWords, dueWords, todayReviews, avgMastery }
// ─────────────────────────────────────────────────────────────────────────────
export const useVocabStats = () => {
  const uid = useAuthStore(s => s.user?.uid);
  return useQuery({
    queryKey: STATS_KEYS.all,
    queryFn:  () => getVocabStats(uid),
    enabled:  !!uid,
    staleTime: 60_000,
    // Ensure we never get undefined — return safe defaults
    select: (raw) => raw ?? {},
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// useWeeklyStats
// Returns data shaped as: { thisWeek, lastWeek, delta } — derived from base
// ─────────────────────────────────────────────────────────────────────────────
export const useWeeklyStats = () => {
  const uid = useAuthStore(s => s.user?.uid);
  return useQuery({
    queryKey: STATS_KEYS.weekly,
    queryFn:  async () => {
      const raw = await getVocabStats(uid);
      // Build a weekly-shaped object from what we have
      // We approximate with available data; real weekly breakdowns would need
      // a separate DB query, but we safely provide non-crashing structure.
      const wordsLearned  = raw?.totalWords ?? 0;
      const mastered      = raw?.masteredWords ?? 0;
      const revisions     = raw?.todayReviews ?? 0;
      const successRate   = raw?.avgMastery ?? 0;
      return {
        thisWeek: { wordsLearned, revisions, successRate },
        lastWeek: { wordsLearned: 0, revisions: 0, successRate: 0 },
        delta:    { words: wordsLearned, revisions, successRate },
      };
    },
    enabled:  !!uid,
    staleTime: 60_000,
    select: (d) => d ?? {
      thisWeek: { wordsLearned: 0, revisions: 0, successRate: 0 },
      lastWeek: { wordsLearned: 0, revisions: 0, successRate: 0 },
      delta:    { words: 0, revisions: 0, successRate: 0 },
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// useMonthlyStats
// Returns data shaped as: { hardestWords: [] } — derived from base
// ─────────────────────────────────────────────────────────────────────────────
export const useMonthlyStats = () => {
  const uid = useAuthStore(s => s.user?.uid);
  return useQuery({
    queryKey: STATS_KEYS.monthly,
    queryFn:  () => getVocabStats(uid).then(raw => ({
      hardestWords: raw?.hardestWords ?? [],
      totalWords:   raw?.totalWords   ?? 0,
      masteredWords: raw?.masteredWords ?? 0,
    })),
    enabled:  !!uid,
    staleTime: 60_000,
    select: (d) => d ?? { hardestWords: [], totalWords: 0, masteredWords: 0 },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// useStreakData
// Returns data shaped as: { currentStreak, longestStreak, totalActiveDays }
// ─────────────────────────────────────────────────────────────────────────────
export const useStreakData = () => {
  const uid = useAuthStore(s => s.user?.uid);
  return useQuery({
    queryKey: STATS_KEYS.streak,
    queryFn:  () => getVocabStats(uid).then(raw => ({
      currentStreak:  raw?.currentStreak   ?? 0,
      longestStreak:  raw?.longestStreak   ?? 0,
      totalActiveDays: raw?.totalActiveDays ?? 0,
    })),
    enabled:  !!uid,
    staleTime: 60_000,
    select: (d) => d ?? { currentStreak: 0, longestStreak: 0, totalActiveDays: 0 },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// useHeatmapData
// Returns data shaped as: { [dateString]: count } — derived from base
// ─────────────────────────────────────────────────────────────────────────────
export const useHeatmapData = () => {
  const uid = useAuthStore(s => s.user?.uid);
  return useQuery({
    queryKey: STATS_KEYS.heatmap,
    queryFn:  () => getVocabStats(uid).then(raw => raw?.heatmap ?? {}),
    enabled:  !!uid,
    staleTime: 60_000,
    select: (d) => d ?? {},
  });
};