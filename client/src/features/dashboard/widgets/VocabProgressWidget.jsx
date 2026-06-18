import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../store';
import { getVocabStats } from '../../../firebase/db';
import { motion } from 'framer-motion';

function Bar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-medium">{value}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
        />
      </div>
    </div>
  );
}

export default function VocabProgressWidget() {
  const user = useAuthStore(s => s.user);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    getVocabStats(user.uid).then(s => { setStats(s); setLoading(false); }).catch(() => setLoading(false));
  }, [user?.uid]);

  return (
    <div className="h-full bg-gradient-to-br from-emerald-950/50 to-teal-950/40 border border-emerald-500/20 rounded-2xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-emerald-400/70 uppercase tracking-widest">Vocabulary</p>
        <span className="text-lg">📚</span>
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !stats || stats.totalWords === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-600">
          <span className="text-3xl">📖</span>
          <p className="text-xs text-center">No words yet<br />Add your first word!</p>
          <Link to="/vocabulary" className="text-xs text-emerald-400 hover:text-emerald-300">→ Open Vocab</Link>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between">
          <div className="text-center mb-3">
            <span className="text-3xl font-bold text-white">{stats.totalWords}</span>
            <p className="text-xs text-slate-500">total words</p>
          </div>
          <div className="space-y-2.5">
            <Bar label="Mastered" value={stats.masteredWords} max={stats.totalWords} color="from-emerald-400 to-green-500" />
            <Bar label="Due today" value={stats.dueWords}     max={stats.totalWords} color="from-yellow-400 to-orange-500" />
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-slate-500">Avg mastery: <span className="text-white font-medium">{stats.avgMastery}%</span></p>
            <Link to="/vocabulary" className="text-[10px] text-emerald-400 hover:text-emerald-300">Open →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
