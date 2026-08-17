import { useState, useEffect } from 'react';
import { BarChart2, Flame, TrendingUp, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store';
import { getCheckinCenterStats } from '../../firebase/db';
import { formatDuration } from '../../lib/bst';

const PERIOD_OPTIONS = [
  { label: '7 Days',  value: 7  },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
];

const SUBJECT_COLORS = {
  Physics:   '#06b6d4', Chemistry: '#a855f7', Math:     '#f59e0b',
  Botany:    '#10b981', Zoology:   '#ef4444', English:  '#3b82f6',
  Bangla:    '#ec4899', ICT:       '#8b5cf6', default:  '#6b7280',
};

function StatCard({ icon: Icon, label, value, sub, color = 'text-white', bg = 'bg-white/[0.02]', border = 'border-white/10' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 flex flex-col ${bg} ${border}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        {Icon && <Icon size={14} className="text-slate-600" />}
      </div>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </motion.div>
  );
}

function SubjectRow({ subject, data }) {
  const color  = SUBJECT_COLORS[subject] || SUBJECT_COLORS.default;
  const rate   = data.rate || 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-white font-medium">{subject}</span>
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <span className="text-green-400">{data.completed} done</span>
          {data.missed > 0 && <span className="text-red-400">{data.missed} missed</span>}
          <span className={`font-bold ${rate >= 80 ? 'text-green-400' : rate >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{rate}%</span>
        </div>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${rate}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function WeeklyHeatmap({ matrix }) {
  return (
    <div className="flex gap-2">
      {matrix.map((day, i) => {
        const hasData   = day.total > 0;
        const allDone   = hasData && day.completed === day.total;
        const someDone  = hasData && day.completed > 0 && day.completed < day.total;
        const noneDone  = hasData && day.completed === 0;
        const dotColor  = !hasData ? 'bg-white/[0.04]'
                        : allDone  ? 'bg-green-500/60'
                        : someDone ? 'bg-yellow-500/50'
                        : 'bg-red-500/40';
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div className={`w-full aspect-square rounded-md ${dotColor} relative`}
              title={`${day.dayLabel} ${day.date}: ${day.completed}/${day.total} completed`}>
              {day.completed > 0 && (
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/70">
                  {day.completed}
                </span>
              )}
            </div>
            <span className="text-[9px] text-slate-600 font-medium">{day.dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function StatsTab() {
  const user = useAuthStore(s => s.user);
  const [period,  setPeriod]  = useState(30);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    getCheckinCenterStats(user.uid, period)
      .then(s => { setStats(s); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user?.uid, period]);

  const subjectEntries = stats
    ? Object.entries(stats.bySubject).sort((a,b) => b[1].total - a[1].total)
    : [];

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Check-In Statistics</p>
        <div className="flex gap-1 bg-white/[0.03] border border-white/10 rounded-xl p-1">
          {PERIOD_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === opt.value
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !stats ? (
        <div className="text-center py-12 text-slate-500">Failed to load stats</div>
      ) : (
        <>
          {/* Primary stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Completed" value={stats.completed}
              color="text-green-400" bg="bg-green-500/[0.04]" border="border-green-500/15"
              sub={`of ${stats.total} sessions`}
            />
            <StatCard
              label="Missed" value={stats.missed}
              color="text-red-400" bg="bg-red-500/[0.04]" border="border-red-500/15"
            />
            <StatCard
              label="Completion Rate" value={`${stats.completionRate}%`}
              color={stats.completionRate >= 80 ? 'text-green-400' : stats.completionRate >= 60 ? 'text-yellow-400' : 'text-red-400'}
              icon={TrendingUp}
            />
            <StatCard
              label="Skipped" value={stats.skipped}
              color="text-slate-400"
            />
          </div>

          {/* Time stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Planned Time" value={formatDuration(stats.plannedMinutes)}
              icon={Target} color="text-cyan-400"
              bg="bg-cyan-500/[0.03]" border="border-cyan-500/10"
            />
            <StatCard
              label="Actual Time" value={formatDuration(stats.actualMinutes)}
              icon={BarChart2} color="text-purple-400"
              bg="bg-purple-500/[0.03]" border="border-purple-500/10"
              sub={stats.plannedMinutes > 0
                ? `${Math.round((stats.actualMinutes/stats.plannedMinutes)*100)}% of planned`
                : undefined}
            />
          </div>

          {/* Streak */}
          <div className="rounded-2xl border border-orange-500/15 bg-gradient-to-br from-orange-900/20 to-red-900/10 p-5 flex items-center gap-5">
            <div className="text-4xl filter drop-shadow-[0_0_12px_rgba(249,115,22,0.5)]">🔥</div>
            <div className="flex-1">
              <p className="text-2xl font-black text-orange-400">{stats.streak} Day Streak</p>
              <p className="text-sm text-orange-200/60 mt-0.5">
                {stats.streak === 0 ? 'Complete a session to start your streak!'
                 : stats.streak >= 7 ? 'Unstoppable! 🏆'
                 : 'Keep going!'}
              </p>
            </div>
            {stats.bestStreak > stats.streak && (
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-600 uppercase tracking-wider">Best</p>
                <p className="text-lg font-bold text-slate-400">{stats.bestStreak}</p>
              </div>
            )}
          </div>

          {/* Weekly heatmap */}
          {stats.weeklyMatrix?.length > 0 && (
            <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">This Week</h3>
              <WeeklyHeatmap matrix={stats.weeklyMatrix} />
              <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-600">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500/60" /> All done</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-500/50" /> Partial</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/40" /> Missed all</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-white/[0.04]" /> No sessions</span>
              </div>
            </div>
          )}

          {/* Subject breakdown */}
          {subjectEntries.length > 0 && (
            <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">By Subject</h3>
              <div className="space-y-4">
                {subjectEntries.map(([subject, data]) => (
                  <SubjectRow key={subject} subject={subject} data={data} />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {stats.total === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
              <BarChart2 size={32} className="mx-auto mb-3 opacity-20 text-slate-400" />
              <p className="text-slate-400 font-medium">No data yet</p>
              <p className="text-sm text-slate-600 mt-1">Complete some sessions to see your statistics.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
