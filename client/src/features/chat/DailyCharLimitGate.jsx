// ─────────────────────────────────────────────────────────────────────────────
// DailyCharLimitGate.jsx — ZYNTRA StudyVerse
//
// Shown when the shared 25,000-character daily limit has been reached.
// Per spec: NO messages can be sent AND existing messages CANNOT be viewed.
// ─────────────────────────────────────────────────────────────────────────────
import { motion } from 'framer-motion';
import { COUPLE_CONFIG } from '../../lib/constants';

const DAILY_LIMIT = COUPLE_CONFIG.dailyCharLimit;

function formatNum(n) {
  return n.toLocaleString('en-US');
}

export default function DailyCharLimitGate({ usedChars }) {
  const used = Math.min(usedChars, DAILY_LIMIT);
  const pct  = Math.min(100, Math.round((used / DAILY_LIMIT) * 100));

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#080b14]">
      {/* Lock icon */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        className="w-24 h-24 rounded-3xl bg-red-500/10 border border-red-500/20
                   flex items-center justify-center mb-6
                   shadow-[0_0_40px_rgba(239,68,68,0.12)]"
      >
        <span className="text-5xl select-none">🔒</span>
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-xl font-bold text-white mb-2 text-center"
      >
        Daily Chat Limit Reached
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="text-sm text-slate-400 text-center max-w-xs leading-relaxed mb-7"
      >
        You and your partner have used all{' '}
        <span className="text-white font-semibold">{formatNum(DAILY_LIMIT)}</span>{' '}
        characters for today.{'\n'}
        Chat will unlock again tomorrow.
      </motion.p>

      {/* Usage card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="w-full max-w-xs bg-white/[0.03] border border-white/[0.08]
                   rounded-2xl p-5 space-y-3"
      >
        {/* Counter */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Daily characters</span>
          <span className="text-sm font-bold text-red-400 tabular-nums">
            {formatNum(used)} / {formatNum(DAILY_LIMIT)}
          </span>
        </div>

        {/* Progress bar — full red */}
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
            className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400"
          />
        </div>

        <p className="text-[11px] text-slate-600 text-center">
          100% used — resets tomorrow at 12:00 AM BST 🌙
        </p>
      </motion.div>
    </div>
  );
}
