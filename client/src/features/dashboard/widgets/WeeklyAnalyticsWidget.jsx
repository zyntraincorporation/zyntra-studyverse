import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../../store';
import { getWeeklyStats } from '../../../firebase/db';

export default function WeeklyAnalyticsWidget() {
  const user  = useAuthStore(s => s.user);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    getWeeklyStats(user.uid, 7).then(data => {
      setStats(data); setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.uid]);

  if (loading) return (
    <div className="h-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { byDay = [], summary = {} } = stats || {};
  const maxScore = Math.max(...byDay.map(d => d.productivityScore), 1);

  return (
    <div className="h-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-slate-500 uppercase tracking-widest">7-Day Analytics</p>
        <span className="text-lg">📊</span>
      </div>

      {/* Bar chart */}
      <div className="flex-1 flex items-end gap-1.5 mb-3 min-h-[60px]">
        {byDay.map((d, i) => {
          const h   = Math.max(4, Math.round((d.productivityScore / maxScore) * 100));
          const color = d.productivityScore >= 70 ? 'from-cyan-500 to-blue-600'
                      : d.productivityScore >= 40 ? 'from-yellow-500 to-orange-500'
                      : 'from-red-600 to-red-700';
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: 60 }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                  className={`w-full rounded-t-md bg-gradient-to-t ${color} min-h-[2px]`}
                  style={{ height: `${h}%` }}
                  title={`${d.day}: ${d.productivityScore}%`}
                />
              </div>
              <span className="text-[9px] text-slate-600">{d.day.slice(0,2)}</span>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3">
        {[
          { label: 'Completed', value: summary.totalCompleted || 0, color: 'text-green-400' },
          { label: 'Missed',    value: summary.totalMissed    || 0, color: 'text-red-400'   },
          { label: 'Avg Score', value: `${summary.avgScore   || 0}%`, color: 'text-cyan-400' },
        ].map(item => (
          <div key={item.label} className="text-center">
            <p className={`text-base font-bold ${item.color}`}>{item.value}</p>
            <p className="text-[10px] text-slate-600">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
