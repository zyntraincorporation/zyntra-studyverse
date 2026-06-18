import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store';
import { getWeeklyStats } from '../../../firebase/db';
import { getBSTDateString, getDateRange } from '../../../lib/bst';

export default function StudyStreakWidget() {
  const user  = useAuthStore(s => s.user);
  const [streak,  setStreak]  = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    getWeeklyStats(user.uid, 30).then(data => {
      setStreak(data.streak || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.uid]);

  const flames = Math.min(streak, 5);

  return (
    <div className="h-full bg-gradient-to-br from-orange-950/50 to-red-950/40 border border-orange-500/20 rounded-2xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-orange-400/70 uppercase tracking-widest">Study Streak</p>
        <span className="text-lg">🔥</span>
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={`text-2xl transition-all ${i < flames ? 'opacity-100' : 'opacity-15'}`}>
                🔥
              </span>
            ))}
          </div>
          <div className="text-center">
            <span className="text-4xl font-bold text-orange-400">{streak}</span>
            <p className="text-xs text-slate-500 mt-1">
              {streak === 0 ? 'Start your streak today!' : streak === 1 ? 'Day streak' : 'Day streak 💪'}
            </p>
          </div>
          {streak >= 7 && (
            <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/20">
              🏆 Week champion!
            </span>
          )}
        </div>
      )}
    </div>
  );
}
