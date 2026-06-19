import { motion } from 'framer-motion';
import {
  BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  useWeeklyStats, useMonthlyStats,
  useStreakData, useHeatmapData
} from '../../hooks/vocabulary/useVocabularyStats';

export default function VocabularyAnalytics() {
  const { data: weekly  } = useWeeklyStats();
  const { data: monthly } = useMonthlyStats();
  const { data: streak  } = useStreakData();
  const { data: heatmap } = useHeatmapData();

  // Safe-guard every slice with explicit defaults
  const currentStreak   = streak?.currentStreak   ?? 0;
  const longestStreak   = streak?.longestStreak   ?? 0;
  const totalActiveDays = streak?.totalActiveDays ?? 0;

  const thisWeekWords    = weekly?.thisWeek?.wordsLearned ?? 0;
  const thisWeekRevs     = weekly?.thisWeek?.revisions    ?? 0;
  const thisWeekSuccess  = weekly?.thisWeek?.successRate  ?? 0;
  const lastWeekWords    = weekly?.lastWeek?.wordsLearned ?? 0;
  const lastWeekRevs     = weekly?.lastWeek?.revisions    ?? 0;
  const lastWeekSuccess  = weekly?.lastWeek?.successRate  ?? 0;
  const deltaWords       = weekly?.delta?.words           ?? 0;
  const deltaRevs        = weekly?.delta?.revisions       ?? 0;

  const hardestWords = monthly?.hardestWords ?? [];

  const chartData = [
    { name: 'Words',     thisWeek: thisWeekWords,   lastWeek: lastWeekWords },
    { name: 'Revisions', thisWeek: thisWeekRevs,    lastWeek: lastWeekRevs },
    { name: 'Success %', thisWeek: thisWeekSuccess, lastWeek: lastWeekSuccess },
  ];

  return (
    <div className="space-y-4">
      {/* Streak Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Current Streak', value: currentStreak,   unit: 'days',  color: 'from-amber-500 to-orange-600' },
          { label: 'Longest Streak', value: longestStreak,   unit: 'days',  color: 'from-cyan-500 to-blue-600' },
          { label: 'Active Days',    value: totalActiveDays, unit: 'total', color: 'from-purple-500 to-pink-600' },
        ].map(card => (
          <motion.div key={card.label}
            whileHover={{ scale: 1.03 }}
            className="rounded-2xl border border-white/10 bg-white/3 p-3 text-center overflow-hidden relative"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-10`} />
            <p className={`text-2xl font-bold bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>
              {card.value}
            </p>
            <p className="text-slate-500 text-xs mt-0.5">{card.unit}</p>
            <p className="text-slate-400 text-[10px] mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Weekly Comparison */}
      <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <h3 className="text-white font-semibold text-sm mb-3">📅 Weekly Comparison</h3>
        {(thisWeekWords + thisWeekRevs + lastWeekWords + lastWeekRevs) === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-600">
            <span className="text-2xl mb-2">📊</span>
            <p className="text-xs">No weekly data yet. Keep studying!</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0d1120', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="thisWeek" name="This Week" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lastWeek" name="Last Week"  fill="#7c3aed" radius={[4, 4, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              {[
                { label: 'Words',     delta: deltaWords },
                { label: 'Revisions', delta: deltaRevs },
              ].map(d => (
                <div key={d.label} className="flex items-center gap-1 text-xs">
                  <span className="text-slate-400">{d.label}:</span>
                  <span className={d.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {d.delta >= 0 ? '+' : ''}{d.delta}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Monthly Hardest Words */}
      {hardestWords.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
          <h3 className="text-white font-semibold text-sm mb-3">🔥 Hardest Words</h3>
          <div className="space-y-2">
            {hardestWords.map((w, i) => (
              <div key={w?.word ?? i} className="flex items-center gap-3">
                <span className="text-slate-600 text-xs w-4">{i + 1}</span>
                <span className="text-white text-sm flex-1">{w?.word ?? '—'}</span>
                <span className="text-red-400 text-xs">{w?.failCount ?? 0} fails</span>
                <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${Math.min(w?.masteryLevel ?? 0, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no data at all */}
      {currentStreak === 0 && hardestWords.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-8 text-center">
          <span className="text-4xl">📖</span>
          <p className="text-slate-400 text-sm mt-3">Start learning words to see your analytics!</p>
        </div>
      )}

      {/* Activity Heatmap */}
      {heatmap && Object.keys(heatmap).length > 0 && <HeatmapCalendar data={heatmap} />}
    </div>
  );
}

function HeatmapCalendar({ data }) {
  const today = new Date();
  const days = Array.from({ length: 84 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (83 - i));
    const key = d.toISOString().split('T')[0];
    return { key, count: data?.[key] ?? 0 };
  });

  const max = Math.max(...days.map(d => d.count), 1);

  function getColor(count) {
    if (!count) return 'bg-white/5';
    const pct = count / max;
    if (pct < 0.25) return 'bg-cyan-900/60';
    if (pct < 0.5)  return 'bg-cyan-700/70';
    if (pct < 0.75) return 'bg-cyan-500/80';
    return 'bg-cyan-400';
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
      <h3 className="text-white font-semibold text-sm mb-3">📆 Activity Heatmap</h3>
      <div className="grid grid-cols-[repeat(12,1fr)] gap-1">
        {days.map(d => (
          <div
            key={d.key}
            title={`${d.key}: ${d.count} reviews`}
            className={`aspect-square rounded-sm ${getColor(d.count)} transition-all hover:scale-125`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs text-slate-600">
        <span>Less</span>
        {['bg-white/5', 'bg-cyan-900/60', 'bg-cyan-700/70', 'bg-cyan-500/80', 'bg-cyan-400'].map(c => (
          <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}