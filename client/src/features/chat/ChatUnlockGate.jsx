import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useAuthStore } from '../../store';
import { useMyUnlockProgress } from '../../hooks/useMyUnlockProgress';

function ProgressBar({ label, current, threshold, color, formatValue }) {
  const pct = Math.min(100, Math.round((current / threshold) * 100));
  const done = current >= threshold;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white font-medium">{label}</span>
        <span className={done ? 'text-green-400 font-bold' : 'text-slate-400'}>
          {done ? '✅ Done!' : `${formatValue(current)} / ${formatValue(threshold)}`}
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

function formatMins(m) {
  const h = Math.floor(m / 60), min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

export default function ChatUnlockGate() {
  const user = useAuthStore(s => s.user);
  const { 
    isUnlocked, 
    studyMinutes, studyThreshold, 
    vocabCount, vocabThreshold 
  } = useMyUnlockProgress();

  const getMessage = () => {
    if (isUnlocked) return { emoji: '🔓', text: 'Chat Unlocked!', color: 'text-cyan-400' };
    return { emoji: '🔒', text: 'Complete your daily goals to enter the chat!', color: 'text-slate-400' };
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
          Today's Goals for {user?.displayName || 'You'}
        </h3>
        
        <ProgressBar
          label="Study Progress"
          current={studyMinutes}
          threshold={studyThreshold}
          color="from-cyan-500 to-blue-500"
          formatValue={formatMins}
        />
        
        <ProgressBar
          label="Vocabulary Progress"
          current={vocabCount}
          threshold={vocabThreshold}
          color="from-purple-500 to-pink-500"
          formatValue={(v) => v}
        />
      </div>

      <p className="text-xs text-slate-600 mt-6 text-center">
        Meet both goals today to unlock the chat ⚡
      </p>
    </div>
  );
}
