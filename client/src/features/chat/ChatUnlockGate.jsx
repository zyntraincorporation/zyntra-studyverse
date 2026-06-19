import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useAuthStore } from '../../store';
import { usePartnerStats } from '../../hooks/usePartnerStats';
import { COUPLE_CONFIG } from '../../lib/constants';

const THRESHOLD = COUPLE_CONFIG.chatUnlockMinutes; // 480

function ProgressBar({ label, minutes, color }) {
  const pct  = Math.min(100, Math.round((minutes / THRESHOLD) * 100));
  const hrs  = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const done = minutes >= THRESHOLD;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white font-medium">{label}</span>
        <span className={done ? 'text-green-400 font-bold' : 'text-slate-400'}>
          {done ? '✅ Done!' : `${hrs}h ${mins}m / 8h`}
        </span>
      </div>
      <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full rounded-full ${done
            ? 'bg-gradient-to-r from-green-400 to-emerald-500'
            : `bg-gradient-to-r ${color}`
          }`}
        />
      </div>
      <p className="text-xs text-slate-500 text-right">{pct}%</p>
    </div>
  );
}

export default function ChatUnlockGate({ chatRoom, isExpired }) {
  const user         = useAuthStore(s => s.user);
  const partner      = useAuthStore(s => s.partner);
  // Unified hook — deduplicates listeners, fixes sync bug
  const partnerStats = usePartnerStats();

  const myMinutes   = chatRoom ? (chatRoom[`${user?.uid}_minutes`] || 0) : 0;
  const myDone      = myMinutes        >= THRESHOLD;
  const partnerDone = partnerStats.studyMinutesToday >= THRESHOLD;

  const getMessage = () => {
    if (isExpired)        return { emoji: '⏰', text: 'Chat window ended. Study 8h again tomorrow to unlock!', color: 'text-slate-400' };
    if (myDone && !partnerDone) return { emoji: '✅', text: `You're ready! Waiting for ${partner?.displayName || 'partner'}… 💪`, color: 'text-green-400' };
    if (!myDone && partnerDone) return { emoji: '💪', text: `${partner?.displayName || 'Partner'} is waiting for you! Keep studying! 🔥`, color: 'text-yellow-400' };
    if (!myDone && !partnerDone) return { emoji: '🔒', text: 'Both of you need to study 8 hours to unlock chat!', color: 'text-slate-400' };
    return { emoji: '🔓', text: 'Unlocking…', color: 'text-cyan-400' };
  };

  const msg = getMessage();

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6">
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(148,163,184,0.1)]"
      >
        <Lock size={40} className="text-slate-500" />
      </motion.div>

      <h2 className="text-2xl font-bold text-white mb-2">Chat Locked 🔐</h2>
      <p className={`text-center text-sm ${msg.color} mb-8 max-w-xs leading-relaxed`}>
        {msg.emoji} {msg.text}
      </p>

      <div className="w-full max-w-sm space-y-5 bg-white/[0.03] border border-white/10 rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest text-center mb-4">
          Today's Study Progress
        </h3>
        <ProgressBar
          label={user?.displayName || 'You'}
          minutes={myMinutes}
          color="from-cyan-500 to-blue-500"
        />
        <ProgressBar
          label={partner?.displayName || 'Partner'}
          minutes={partnerStats.studyMinutesToday}
          color="from-purple-500 to-pink-500"
        />
      </div>

      {/* Partner studying indicator */}
      {partnerStats.isStudying && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400">
            {partner?.displayName} is studying {partnerStats.subject} right now! 🔥
          </span>
        </motion.div>
      )}

      <p className="text-xs text-slate-600 mt-6 text-center">
        Chat unlocks for 60 minutes when both reach 8 hours ⚡
      </p>
    </div>
  );
}
