import { useState, useEffect, useMemo } from 'react';
import {
  BarChart2, TrendingUp, Calendar, Flame,
  Brain, Trophy, CheckCircle2, Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store';
import { getWeeklyStats, getHeatmapData, getBuetChallengeStats } from '../firebase/db';
import { formatDuration } from '../lib/bst';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const SUBJECT_COLOR = {
  Physics: '#06b6d4', Chemistry: '#a855f7', Math: '#f59e0b',
  Botany: '#10b981',  Zoology: '#ef4444',  English: '#3b82f6',
  Bangla: '#ec4899',  ICT: '#8b5cf6',      default: '#6b7280',
};

const HEATMAP_COLORS = [
  'bg-white/[0.04]',
  'bg-cyan-900/50',
  'bg-cyan-700/60',
  'bg-cyan-500/70',
  'bg-cyan-300/90',
];

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/* ─── HeatmapGrid ────────────────────────────────────────────────────────── */
function HeatmapGrid({ data }) {
  const weeks = [];
  let week = [];
  data.forEach((d, i) => {
    week.push(d);
    if (week.length === 7 || i === data.length - 1) { weeks.push(week); week = []; }
  });

  return (
    <div className="w-full">
      <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <div className="flex gap-1.5 min-w-max pr-4">
          {weeks.map((wk, wi) => (
            <div key={wi} className="flex flex-col gap-1.5">
              {wk.map((d, di) => (
                <div
                  key={di}
                  title={`${d.date}: ${d.completed} sessions, ${d.extraMin}m extra`}
                  className={`w-3.5 h-3.5 rounded-sm ${HEATMAP_COLORS[d.level]} transition-colors hover:ring-2 hover:ring-cyan-500/50 cursor-pointer`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-1">
        <span className="text-[10px] text-slate-500">Less</span>
        {HEATMAP_COLORS.map((c, i) => <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />)}
        <span className="text-[10px] text-slate-500">More</span>
      </div>
    </div>
  );
}

/* ─── ProductivityBarChart ───────────────────────────────────────────────── */
function ProductivityBarChart({ byDay, period }) {
  const maxScore = Math.max(...byDay.map(d => d.productivityScore), 1);

  // Responsive bar widths per period
  const barClass = period === 7  ? 'max-w-[44px]'
                 : period === 14 ? 'max-w-[28px]'
                 :                 'max-w-[16px]';

  // Label frequency: show every label for 7d, every 2nd for 14d, every 3rd for 30d
  const showLabel = (i) => period === 7 || (period === 14 && i % 2 === 0) || (period === 30 && i % 3 === 0);

  return (
    <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      <div
        className="flex items-end justify-between gap-1.5 mt-4 pb-2"
        style={{ minWidth: period > 14 ? `${byDay.length * 28}px` : 'auto' }}
      >
        {byDay.map((d, i) => {
          const h     = Math.max(4, Math.round((d.productivityScore / maxScore) * 100));
          const color = d.productivityScore >= 70 ? 'from-cyan-400 to-blue-500'
                      : d.productivityScore >= 40 ? 'from-yellow-400 to-orange-500'
                      : d.productivityScore > 0   ? 'from-red-400 to-red-600'
                      :                             'from-white/10 to-white/5';

          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group min-w-0">
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-1 text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white font-mono whitespace-nowrap z-10">
                {d.productivityScore}%
              </div>
              {/* Bar */}
              <div className={`w-full ${barClass} flex items-end justify-center h-32 bg-white/[0.02] rounded-t-xl overflow-hidden mx-auto`}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.7, delay: i * 0.03, ease: 'easeOut' }}
                  className={`w-full rounded-t-xl bg-gradient-to-t ${color} shadow-lg`}
                />
              </div>
              {/* Day label */}
              <span className={`text-[9px] text-slate-500 mt-1.5 font-medium uppercase tracking-widest transition-opacity ${showLabel(i) ? 'opacity-100' : 'opacity-0'}`}>
                {d.day.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── SvgPieChart ────────────────────────────────────────────────────────── */
function SvgPieChart({ distribution }) {
  const entries = Object.entries(distribution || {}).filter(([, v]) => v > 0);
  const total   = entries.reduce((s, [, v]) => s + v, 0);

  if (!total) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-xs text-slate-500">No session data</p>
      </div>
    );
  }

  let cumulativePercent = 0;
  const slices = entries.sort(([, a], [, b]) => b - a).map(([subj, count]) => {
    const pct = count / total;
    const startX = Math.cos(2 * Math.PI * cumulativePercent);
    const startY = Math.sin(2 * Math.PI * cumulativePercent);
    cumulativePercent += pct;
    const endX = Math.cos(2 * Math.PI * cumulativePercent);
    const endY = Math.sin(2 * Math.PI * cumulativePercent);
    const largeArcFlag = pct > 0.5 ? 1 : 0;
    const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
    return { subj, pct, pathData, color: SUBJECT_COLOR[subj] || SUBJECT_COLOR.default };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
      <div className="w-32 h-32 relative shrink-0">
        <svg viewBox="-1 -1 2 2" className="w-full h-full -rotate-90 filter drop-shadow-lg">
          {slices.map((slice, i) => (
            <motion.path
              key={slice.subj}
              d={slice.pathData}
              fill={slice.color}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="hover:opacity-80 transition-opacity cursor-pointer"
              title={`${slice.subj}: ${Math.round(slice.pct * 100)}%`}
            />
          ))}
        </svg>
      </div>
      <div className="flex-1 w-full grid grid-cols-2 gap-x-2 gap-y-3">
        {slices.map(slice => (
          <div key={slice.subj} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: slice.color }} />
            <span className="text-white truncate" title={slice.subj}>{slice.subj}</span>
            <span className="text-slate-500 ml-auto font-mono">{Math.round(slice.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── StatsPage ──────────────────────────────────────────────────────────── */
export default function StatsPage() {
  const user = useAuthStore(s => s.user);

  const [period,         setPeriod]         = useState(7);
  const [stats,          setStats]          = useState(null);
  const [heatmap,        setHeatmap]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [challengeStats, setChallengeStats] = useState(null);
  const [challengeHist,  setChallengeHist]  = useState([]);

  // Study stats + heatmap
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

  // Challenge stats
  useEffect(() => {
    if (!user?.uid) return;
    getBuetChallengeStats(user.uid)
      .then(s => setChallengeStats(s))
      .catch(() => setChallengeStats(null));
  }, [user?.uid]);

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6 pb-24 overflow-x-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart2 size={22} className="text-cyan-400" /> Analytics Hub
          </h2>
          <p className="text-sm text-slate-500 mt-1">Track your progress and consistency</p>
        </div>
        <div className="flex gap-1 bg-white/[0.03] border border-white/10 rounded-xl p-1 shrink-0">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === d
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Row 1: Summary Cards ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Completed',   value: stats?.summary?.totalCompleted || 0,             color: 'text-green-400',  icon: '✅', bg: 'bg-green-500/10',  border: 'border-green-500/20'  },
              { label: 'Missed',      value: stats?.summary?.totalMissed    || 0,             color: 'text-red-400',    icon: '❌', bg: 'bg-red-500/10',    border: 'border-red-500/20'    },
              { label: 'Extra Study', value: formatDuration(stats?.summary?.totalExtraMin || 0), color: 'text-cyan-400',   icon: '⚡', bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20'   },
              { label: 'Avg Score',   value: `${stats?.summary?.avgScore || 0}%`,             color: 'text-purple-400', icon: '📊', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
            ].map(s => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={s.label}
                className={`rounded-3xl border p-5 flex flex-col items-center justify-center text-center ${s.bg} ${s.border}`}
              >
                <span className="text-2xl mb-2 filter drop-shadow-md">{s.icon}</span>
                <p className={`text-2xl font-black ${s.color} drop-shadow-sm`}>{s.value}</p>
                <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* ── Row 2: Productivity Score Trend (Full Width) ─────────────────── */}
          <div className="w-full rounded-3xl bg-white/[0.02] border border-white/10 p-6 overflow-hidden">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-cyan-400" /> Productivity Score Trend
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Based on schedule completion &amp; extra study — last {period} days
            </p>
            {stats?.byDay && <ProductivityBarChart byDay={stats.byDay} period={period} />}
          </div>

          {/* ── Row 3: Subject Distribution + Daily Streak ──────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Subject Distribution */}
            <div className="rounded-3xl bg-white/[0.02] border border-white/10 p-6 flex flex-col overflow-hidden">
              <h3 className="text-sm font-semibold text-white">Subject Distribution</h3>
              <p className="text-xs text-slate-500 mt-1">Time spent per subject</p>
              <div className="flex-1">
                <SvgPieChart distribution={stats?.subjectDistribution} />
              </div>
            </div>

            {/* Daily Streak */}
            <div className="rounded-3xl bg-gradient-to-br from-orange-900/30 to-red-900/20 border border-orange-500/20 p-6 flex flex-col justify-center items-center text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                <Flame size={120} className="text-orange-500" />
              </div>
              <div className="text-5xl filter drop-shadow-[0_0_15px_rgba(249,115,22,0.5)] mb-4 relative z-10">🔥</div>
              <div className="relative z-10">
                <p className="text-3xl font-black text-orange-400 drop-shadow-md">
                  {stats?.streak || 0} Day Streak
                </p>
                <p className="text-sm font-medium text-orange-200/70 mt-2">
                  {(stats?.streak || 0) === 0
                    ? 'Start studying today!'
                    : (stats?.streak || 0) >= 7
                    ? 'Unstoppable momentum! 🏆'
                    : 'Great consistency, keep it up!'}
                </p>
              </div>
            </div>
          </div>

          {/* ── Row 4: Activity Heatmap + BUET Daily Challenge (Balanced Height) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

            {/* Activity Heatmap */}
            <div className="rounded-3xl bg-white/[0.02] border border-white/10 p-6 flex flex-col justify-between h-full overflow-hidden shadow-sm">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
                  <Calendar size={16} className="text-cyan-400" /> Activity Heatmap
                </h3>
                <p className="text-xs text-slate-500 mb-6">Last 12 weeks of study sessions</p>
                <HeatmapGrid data={heatmap} />
              </div>
              <div className="flex items-center justify-between pt-4 mt-6 border-t border-white/[0.06] text-xs text-slate-400">
                <span>Total Sessions: <strong className="text-white">{stats?.summary?.totalCompleted || 0}</strong></span>
                <span>Consistency: <strong className="text-cyan-400">{stats?.streak || 0}d streak</strong></span>
              </div>
            </div>

            {/* BUET Daily Challenge Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-950/30 to-slate-900/50 p-6 flex flex-col justify-between h-full overflow-hidden shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-0.5">
                      <Brain size={16} className="text-red-400" /> BUET Daily Challenge
                    </h3>
                    <p className="text-xs text-slate-500">Last 30 days completion history</p>
                  </div>
                  <span className="text-[10px] font-mono text-red-400/90 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20 font-bold">
                    PCM DRILL
                  </span>
                </div>

                {challengeStats ? (
                  <>
                    {/* Stats Top 3 Boxes: Completed | Missed | Rate */}
                    <div className="grid grid-cols-3 gap-2.5 mb-4">
                      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center flex flex-col justify-center">
                        <p className="text-xl font-black text-emerald-400">{challengeStats.completed || 0}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">COMPLETED</p>
                      </div>
                      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-center flex flex-col justify-center">
                        <p className="text-xl font-black text-red-400">{challengeStats.missed || 0}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">MISSED</p>
                      </div>
                      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-center flex flex-col justify-center">
                        <p className="text-xl font-black text-cyan-400">{challengeStats.rate || 0}%</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">RATE</p>
                        <p className="text-[9px] text-cyan-400/80 font-mono mt-0.5 font-semibold">
                          {challengeStats.completed || 0} / {challengeStats.generated || challengeStats.total || 0}
                        </p>
                      </div>
                    </div>

                    {/* Streak & Time Pills */}
                    <div className="grid grid-cols-3 gap-2.5 mb-4">
                      <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 p-2.5 flex items-center gap-2">
                        <span className="text-base">🔥</span>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-orange-400 leading-none">{challengeStats.currentStreak || 0}d</p>
                          <p className="text-[8px] text-slate-400 uppercase tracking-wider mt-0.5 font-bold">STREAK</p>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/20 p-2.5 flex items-center gap-2">
                        <Trophy size={15} className="text-yellow-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-black text-yellow-400 leading-none">{challengeStats.bestStreak || 0}d</p>
                          <p className="text-[8px] text-slate-400 uppercase tracking-wider mt-0.5 font-bold">BEST</p>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-purple-500/10 border border-purple-500/20 p-2.5 flex items-center gap-2">
                        <Clock size={15} className="text-purple-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-black text-purple-400 leading-none">{challengeStats.totalMinutes || 0}m</p>
                          <p className="text-[8px] text-slate-400 uppercase tracking-wider mt-0.5 font-bold">TIME</p>
                        </div>
                      </div>
                    </div>

                    {/* Subject Breakdown Progress Bars */}
                    <div className="mt-2 pt-3.5 border-t border-white/[0.08]">
                      <p className="text-[10px] text-slate-400 mb-2.5 font-bold uppercase tracking-wider">SUBJECT BREAKDOWN</p>
                      <div className="space-y-2.5">
                        {['Math', 'Physics', 'Chemistry'].map(subj => {
                          const data = challengeStats.bySubject?.[subj] || { completed: 0, total: 0 };
                          const completedCount = data.completed || 0;
                          const totalCount = data.total || 0;
                          const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                          const color = SUBJECT_COLOR[subj] || SUBJECT_COLOR.default;

                          return (
                            <div key={subj} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-300">{subj}</span>
                                <span className="font-mono text-[11px] text-slate-400 font-bold">{completedCount}/{totalCount}</span>
                              </div>
                              <div className="h-2 rounded-full bg-white/5 overflow-hidden border border-white/5">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-slate-400 mb-1">কোনো চ্যালেঞ্জের তথ্য পাওয়া যায়নি</p>
                    <p className="text-xs text-slate-500">ড্যাশবোর্ড থেকে প্রথম চ্যালেঞ্জ তৈরি করুন!</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}