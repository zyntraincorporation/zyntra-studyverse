import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Calendar, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store';
import { getWeeklyStats, getHeatmapData } from '../firebase/db';
import { getDateRange, formatDuration } from '../lib/bst';

const SUBJECT_COLOR = {
  Physics:'#06b6d4', Chemistry:'#a855f7', Math:'#f59e0b',
  Botany:'#10b981',  Zoology:'#ef4444',  English:'#3b82f6',
  Bangla:'#ec4899',  ICT:'#8b5cf6',
};

const HEATMAP_COLORS = [
  'bg-white/[0.04]',
  'bg-cyan-900/50',
  'bg-cyan-700/60',
  'bg-cyan-600/70',
  'bg-cyan-400/80',
];

function HeatmapGrid({ data }) {
  const weeks = [];
  let week = [];
  data.forEach((d, i) => {
    week.push(d);
    if (week.length === 7 || i === data.length - 1) { weeks.push(week); week = []; }
  });

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {weeks.map((wk, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {wk.map((d, di) => (
              <div
                key={di}
                title={`${d.date}: ${d.completed} sessions, ${d.extraMin}m extra`}
                className={`w-3 h-3 rounded-sm ${HEATMAP_COLORS[d.level]} border border-white/[0.04] cursor-default`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-[10px] text-slate-600">Less</span>
        {HEATMAP_COLORS.map((c, i) => <div key={i} className={`w-3 h-3 rounded-sm ${c} border border-white/[0.04]`} />)}
        <span className="text-[10px] text-slate-600">More</span>
      </div>
    </div>
  );
}

function WeeklyBarChart({ byDay }) {
  const maxScore = Math.max(...byDay.map(d => d.productivityScore), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {byDay.map((d, i) => {
        const h     = Math.max(4, Math.round((d.productivityScore / maxScore) * 100));
        const color = d.productivityScore >= 70 ? 'from-cyan-500 to-blue-600'
                    : d.productivityScore >= 40 ? 'from-yellow-500 to-orange-500'
                    : d.productivityScore > 0   ? 'from-red-600 to-red-700'
                    : 'from-white/5 to-white/5';
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-slate-500">{d.productivityScore > 0 ? d.productivityScore : ''}</span>
            <div className="w-full flex items-end" style={{ height: 100 }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                className={`w-full rounded-t-lg bg-gradient-to-t ${color}`}
                title={`${d.day}: ${d.productivityScore}%`}
              />
            </div>
            <span className="text-[10px] text-slate-600">{d.day.slice(0,2)}</span>
          </div>
        );
      })}
    </div>
  );
}

function SubjectPieChart({ distribution }) {
  const entries = Object.entries(distribution || {});
  const total   = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return <p className="text-xs text-slate-600 text-center py-4">No sessions yet</p>;

  return (
    <div className="space-y-2">
      {entries.sort(([, a], [, b]) => b - a).map(([subj, count]) => {
        const pct = Math.round((count / total) * 100);
        const col = SUBJECT_COLOR[subj] || '#6b7280';
        return (
          <div key={subj}>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: col }} className="font-medium">{subj}</span>
              <span className="text-slate-400">{pct}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: col }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StatsPage() {
  const user  = useAuthStore(s => s.user);
  const [period,  setPeriod]  = useState(7);
  const [stats,   setStats]   = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    Promise.all([
      getWeeklyStats(user.uid, period),
      getHeatmapData(user.uid, 84),
    ]).then(([weekStats, heat]) => {
      setStats(weekStats);
      setHeatmap(heat);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.uid, period]);

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart2 size={20} className="text-cyan-400" /> Statistics
        </h2>
        <div className="flex gap-1 bg-white/[0.03] border border-white/10 rounded-xl p-1">
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setPeriod(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === d ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'}`}
            >{d}d</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Completed',    value: stats?.summary?.totalCompleted || 0,  color: 'text-green-400',  icon: '✅' },
              { label: 'Missed',       value: stats?.summary?.totalMissed    || 0,  color: 'text-red-400',    icon: '❌' },
              { label: 'Extra Study',  value: formatDuration(stats?.summary?.totalExtraMin || 0), color: 'text-cyan-400', icon: '⚡' },
              { label: 'Avg Score',    value: `${stats?.summary?.avgScore || 0}%`,   color: 'text-purple-400', icon: '📊' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl bg-white/[0.02] border border-white/10 p-4 text-center">
                <span className="text-2xl">{s.icon}</span>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={15} className="text-cyan-400" /> Daily Productivity Score
            </h3>
            {stats?.byDay && <WeeklyBarChart byDay={stats.byDay} />}
          </div>

          {/* Subject distribution */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Subject Distribution</h3>
            <SubjectPieChart distribution={stats?.subjectDistribution} />
          </div>

          {/* Heatmap */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar size={15} className="text-cyan-400" /> Study Heatmap (12 weeks)
            </h3>
            <HeatmapGrid data={heatmap} />
          </div>

          {/* Streak info */}
          <div className="rounded-2xl bg-gradient-to-br from-orange-950/40 to-red-950/30 border border-orange-500/20 p-5 flex items-center gap-4">
            <div className="text-4xl">🔥</div>
            <div>
              <p className="text-2xl font-bold text-orange-400">{stats?.streak || 0} day streak</p>
              <p className="text-sm text-slate-500 mt-0.5">
                {(stats?.streak || 0) === 0 ? 'Start studying to build your streak!'
                  : (stats?.streak || 0) >= 7 ? 'Week champion! 🏆 Keep it up!'
                  : 'Great consistency! Keep going!'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}