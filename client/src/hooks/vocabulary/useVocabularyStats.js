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

// Single combined stats hook — getVocabStats returns { total, mastered, dueToday, streak, heatmap, byDay }
export const useVocabStats = () => {
  const uid = useAuthStore(s => s.user?.uid);
  return useQuery({
    queryKey: STATS_KEYS.all,
    queryFn:  () => getVocabStats(uid),
    enabled:  !!uid,
    staleTime: 60_000,
  });
};

// Legacy convenience exports (components may use these individually)
export const useWeeklyStats  = useVocabStats;
export const useMonthlyStats = useVocabStats;
export const useStreakData    = useVocabStats;
export const useHeatmapData  = useVocabStats;