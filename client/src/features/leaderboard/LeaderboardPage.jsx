import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { subscribeToDailyLeaderboard, getSessionsByDateRange } from '../../firebase/db';
import { getBSTDateString, getDateRange, formatDuration } from '../../lib/bst';

const SUBJECTS_COLOR = {
  Physics:   '#06b6d4', Chemistry: '#a855f7', Math:    '#f59e0b',
  Botany:    '#10b981', Zoology:   '#ef4444', English: '#3b82f6',
  Bangla:    '#ec4899', ICT:       '#8b5cf6',
};

function ScoreRing({ score, color, size = 80 }) {
  const r = 30, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
      <motion.circle
        cx="36" cy="36" r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      <text x="36" y="40" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
        {score}
      </text>
    </svg>
  );
}

function UserCard({ uid, data, rank, isMe }) {
  const crown   = rank === 1 ? '👑' : rank === 2 ? '🥈' : '🎖️';
  const minutes = data?.studyMinutes || 0;
  const sessions = data?.sessionsCompleted || 0;
  const score    = data?.score || 0;
  const color    = isMe ? '#06b6d4' : '#a855f7';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1 }}
      className={`relative p-5 rounded-2xl border ${
        rank === 1
          ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/20'
          : 'bg-white/[0.03] border-white/10'
      }`}
    >
      {rank === 1 && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">{crown}</div>
      )}
      <div className="flex items-center gap-4">
        <div className="relative">
          <ScoreRing score={score} color={color} />
          {rank !== 1 && <span className="absolute -bottom-1 -right-1 text-lg">{crown}</span>}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base">{data?.displayName || 'User'}</span>
            {isMe && <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full">You</span>}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Study time</p>
              <p className="text-sm font-semibold text-white">{formatDuration(minutes)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Sessions</p>
              <p className="text-sm font-semibold text-white">{sessions}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function LeaderboardPage() {
  const user    = useAuthStore(s => s.user);
  const partner = useAuthStore(s => s.partner);
  const [tab,       setTab]       = useState('today');
  const [todayData, setTodayData] = useState({});
  const [weekData,  setWeekData]  = useState({});
  const [loading,   setLoading]   = useState(true);

  // Today — real-time
  useEffect(() => {
    const today = getBSTDateString();
    const unsub = subscribeToDailyLeaderboard(today, data => {
      setTodayData(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Week — compute from sessions
  useEffect(() => {
    if (tab !== 'week' || !user?.uid) return;
    const range = getDateRange(7);
    const start = range[0].date, end = range[range.length - 1].date;
    const uids  = [user.uid, partner?.uid].filter(Boolean);

    Promise.all(uids.map(uid =>
      getSessionsByDateRange(uid, start, end).then(sessions => ({
        uid,
        // Custom sessions excluded from leaderboard
        minutes:  sessions
          .filter(s => s.type !== 'custom')
          .reduce((s, se) => s + (se.durationMinutes || 0), 0),
        sessions: sessions
          .filter(s => s.type !== 'custom' && s.completed !== false)
          .length,
        name:     uid === user.uid ? user.displayName : partner?.displayName,
      }))
    )).then(results => {
      const obj = {};
      results.forEach(r => {
        obj[r.uid] = { displayName: r.name, studyMinutes: r.minutes, sessionsCompleted: r.sessions, score: Math.min(100, r.minutes * 2 + r.sessions * 10) };
      });
      setWeekData(obj);
    });
  }, [tab, user?.uid, partner?.uid]);

  const data    = tab === 'today' ? todayData : weekData;
  const entries = Object.entries(data)
    .filter(([k]) => k !== 'updatedAt')
    .sort(([, a], [, b]) => (b.score || 0) - (a.score || 0));

  const leaderMsg = () => {
    if (!entries.length || !user?.uid) return null;
    const topUid = entries[0]?.[0];
    if (topUid === user.uid) return { text: "You're leading! Keep it up 🔥", color: 'text-cyan-400' };
    return { text: `${partner?.displayName || 'Partner'} is ahead! Catch up 💪`, color: 'text-yellow-400' };
  };
  const msg = leaderMsg();

  return (
    <div className="min-h-screen bg-[#080b14] p-4 lg:p-6 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-5xl">🏆</span>
          <h1 className="text-2xl font-bold text-white mt-3">Leaderboard</h1>
          {msg && <p className={`text-sm mt-1 ${msg.color}`}>{msg.text}</p>}
        </div>

        {/* Tabs */}
        <div className="flex bg-white/[0.03] border border-white/10 rounded-xl p-1 mb-6">
          {['today', 'week'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t === 'today' ? 'Today' : 'This Week'}
            </button>
          ))}
        </div>

        <div className="mb-4 px-4 py-2 bg-white/[0.02] border border-white/[0.06] rounded-xl text-center">
          <p className="text-[11px] text-slate-500">Score = study minutes × 2 + sessions × 10</p>
          <p className="text-[10px] text-slate-600 mt-0.5">⚠️ Custom study sessions are not counted</p>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-slate-600">
            <p className="text-4xl mb-3">📊</p>
            <p>No data yet — start studying!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map(([uid, d], i) => (
              <UserCard key={uid} uid={uid} data={d} rank={i + 1} isMe={uid === user?.uid} />
            ))}
          </div>
        )}

        <div className="text-center mt-6">
          <Link to="/timer" className="text-xs text-cyan-500 hover:text-cyan-300 transition-colors">
            → Go study to earn points
          </Link>
        </div>
      </div>
    </div>
  );
}
