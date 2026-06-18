import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../store';
import { subscribeToDailyLeaderboard } from '../../../firebase/db';
import { getBSTDateString } from '../../../lib/bst';
import { motion } from 'framer-motion';

function formatMins(m) {
  const h = Math.floor(m / 60), min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

export default function LeaderboardWidget() {
  const user    = useAuthStore(s => s.user);
  const partner = useAuthStore(s => s.partner);
  const [data, setData] = useState({});

  useEffect(() => {
    const today = getBSTDateString();
    const unsub = subscribeToDailyLeaderboard(today, setData);
    return unsub;
  }, []);

  const entries = Object.entries(data)
    .filter(([k]) => k !== 'updatedAt' && k !== 'updatedAt')
    .sort(([, a], [, b]) => (b.score || 0) - (a.score || 0));

  const myEntry = entries.find(([uid]) => uid === user?.uid);
  const winning = entries[0]?.[0] === user?.uid;

  return (
    <div className="h-full bg-gradient-to-br from-yellow-950/40 to-orange-950/30 border border-yellow-500/20 rounded-2xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-yellow-500/70 uppercase tracking-widest">Today's Score</p>
        <span className="text-lg">🏆</span>
      </div>

      <div className="flex-1 space-y-3">
        {entries.length === 0 ? (
          <p className="text-xs text-slate-600 text-center mt-4">No data yet</p>
        ) : entries.map(([uid, d], i) => {
          const isMe = uid === user?.uid;
          const pct  = Math.min(100, d.score || 0);
          return (
            <div key={uid}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1">
                  <span>{i === 0 ? '👑' : '🥈'}</span>
                  <span className={isMe ? 'text-cyan-300 font-medium' : 'text-slate-400'}>{d.displayName}</span>
                </span>
                <span className={isMe ? 'text-cyan-300 font-bold' : 'text-slate-400'}>{pct}/100</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full rounded-full ${isMe ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}
                />
              </div>
              <p className="text-[10px] text-slate-600 mt-0.5">{formatMins(d.studyMinutes || 0)} · {d.sessionsCompleted || 0} sessions</p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-white/[0.06]">
        <p className={`text-xs ${winning ? 'text-green-400' : 'text-yellow-400'}`}>
          {winning ? "You're leading! 🔥 Keep going!" : `${partner?.displayName || 'Partner'} is ahead! 💪`}
        </p>
        <Link to="/leaderboard" className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
          Full leaderboard →
        </Link>
      </div>
    </div>
  );
}
