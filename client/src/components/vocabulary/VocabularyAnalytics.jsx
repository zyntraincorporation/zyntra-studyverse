import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  useWeeklyStats, useMonthlyStats,
  useStreakData, useHeatmapData
} from '../../hooks/vocabulary/useVocabularyStats';

const MASTERY_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

export default function VocabularyAnalytics() {
  const { data: weekly }  = useWeeklyStats();
  const { data: monthly } = useMonthlyStats();
  const { data: streak }  = useStreakData();
  const { data: heatmap } = useHeatmapData();

  return (
    <div className="space-y-4">
      {/* Streak Cards */}
      {streak && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Current Streak', value: streak.currentStreak, unit: 'days', color: 'from-amber-500 to-orange-600' },
            { label: 'Longest Streak', value: streak.longestStreak, unit: 'days', color: 'from-cyan-500 to-blue-600' },
            { label: 'Active Days',    value: streak.totalActiveDays, unit: 'total', color: 'from-purple-500 to-pink-600' },
          ].map(card => (
            <motion.div key={card.label}
              whileHover={{ scale: 1.03 }}
              className="rounded-2xl border border-white/10 bg-white/3 p-3 text-center overflow-hidden relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-10`} />
              <p className={`text-2xl font-bold bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>
                {card.value}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">{card.unit}</p>
              <p className="text-slate-400 text-[10px] mt-1">{card.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Weekly Comparison */}
      {weekly && (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
          <h3 className="text-white font-semibold text-sm mb-3">📅 Weekly Comparison</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={[
              { name: 'Words',     thisWeek: weekly.thisWeek.wordsLearned, lastWeek: weekly.lastWeek.wordsLearned },
              { name: 'Revisions', thisWeek: weekly.thisWeek.revisions,    lastWeek: weekly.lastWeek.revisions },
              { name: 'Success %', thisWeek: weekly.thisWeek.successRate,  lastWeek: weekly.lastWeek.successRate },
            ]}>
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
          {/* Delta Indicators */}
          <div className="flex gap-4 mt-2">
            {[
              { label: 'Words', delta: weekly.delta.words },
              { label: 'Revisions', delta: weekly.delta.revisions },
            ].map(d => (
              <div key={d.label} className="flex items-center gap-1 text-xs">
                <span className="text-slate-400">{d.label}:</span>
                <span className={d.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {d.delta >= 0 ? '+' : ''}{d.delta}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Hardest Words */}
      {monthly?.hardestWords?.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
          <h3 className="text-white font-semibold text-sm mb-3">🔥 Hardest Words</h3>
          <div className="space-y-2">
            {monthly.hardestWords.map((w, i) => (
              <div key={w.word} className="flex items-center gap-3">
                <span className="text-slate-600 text-xs w-4">{i + 1}</span>
                <span className="text-white text-sm flex-1">{w.word}</span>
                <span className="text-red-400 text-xs">{w.failCount} fails</span>
                <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${Math.min(w.masteryLevel, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Heatmap */}
      {heatmap && <HeatmapCalendar data={heatmap} />}
    </div>
  );
}

function HeatmapCalendar({ data }) {
  const today = new Date();
  const days = Array.from({ length: 84 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (83 - i));
    const key = d.toISOString().split('T')[0];
    return { key, count: data[key] || 0 };
  });

  const max = Math.max(...days.map(d => d.count), 1);

  function getColor(count) {
    if (count === 0) return 'bg-white/5';
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