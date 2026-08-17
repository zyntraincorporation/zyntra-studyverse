import { motion } from 'framer-motion';
import { Lock, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store';
import { useMyUnlockProgress } from '../../hooks/useMyUnlockProgress';

// Single user's vocab row
function VocabRow({ name, count, threshold, isMe }) {
  const done = count >= threshold;
  const pct  = Math.min(100, Math.round((count / threshold) * 100));
  const remaining = Math.max(0, threshold - count);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            {isMe ? 'You' : name}
          </span>
          {isMe && (
            <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded-full">me</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {done ? (
            <CheckCircle2 size={14} className="text-green-400" />
          ) : null}
          <span className={`text-sm font-semibold tabular-nums ${done ? 'text-green-400' : 'text-slate-300'}`}>
            {count} / {threshold}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className={`h-full rounded-full ${
            done
              ? 'bg-gradient-to-r from-green-400 to-emerald-500'
              : isMe
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                : 'bg-gradient-to-r from-purple-500 to-pink-500'
          }`}
        />
      </div>

      {!done && (
        <p className="text-[11px] text-slate-500 text-right">
          {remaining} more needed
        </p>
      )}
    </div>
  );
}

export default function ChatUnlockGate() {
  const user    = useAuthStore(s => s.user);
  const partner = useAuthStore(s => s.partner);

  const {
    vocabCount,
    partnerVocabCount,
    vocabThreshold,
    isUnlocked,
  } = useMyUnlockProgress();

  const partnerName = partner?.displayName || 'Partner';
  const myDone      = vocabCount        >= vocabThreshold;
  const partnerDone = partnerVocabCount >= vocabThreshold;

  // Helper hint
  const getHint = () => {
    if (isUnlocked) return null;
    if (!myDone && !partnerDone)
      return `Both you and ${partnerName} need to complete ${vocabThreshold} vocabulary.`;
    if (!myDone)
      return `You need ${vocabThreshold - vocabCount} more vocabulary word${vocabThreshold - vocabCount !== 1 ? 's' : ''} to unlock.`;
    if (!partnerDone)
      return `Waiting for ${partnerName} to complete ${vocabThreshold - partnerVocabCount} more.`;
    return null;
  };

  const hint = getHint();

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6">

      {/* Icon */}
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        className="w-20 h-20 rounded-2xl bg-slate-800/80 border border-white/10
                   flex items-center justify-center mb-6
                   shadow-[0_0_32px_rgba(148,163,184,0.08)]"
      >
        <Lock size={34} className="text-slate-400" />
      </motion.div>

      {/* Title */}
      <h2 className="text-xl font-bold text-white mb-1">Couple Chat Locked 🔐</h2>
      <p className="text-sm text-slate-400 text-center mb-6 max-w-xs leading-relaxed">
        Both partners must complete <span className="text-white font-semibold">{vocabThreshold} vocabulary</span> today to unlock.
      </p>

      {/* Progress card */}
      <div className="w-full max-w-sm space-y-4 bg-white/[0.03] border border-white/[0.08]
                      rounded-2xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">

        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest text-center">
          Today's Vocabulary
        </p>

        <VocabRow
          name={user?.displayName || 'You'}
          count={vocabCount}
          threshold={vocabThreshold}
          isMe={true}
        />

        {/* Divider */}
        <div className="h-px bg-white/[0.06]" />

        <VocabRow
          name={partnerName}
          count={partnerVocabCount}
          threshold={vocabThreshold}
          isMe={false}
        />
      </div>

      {/* Hint text */}
      {hint && (
        <motion.p
          key={hint}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-slate-500 mt-5 text-center max-w-xs leading-relaxed"
        >
          {hint}
        </motion.p>
      )}

      <p className="text-[11px] text-slate-600 mt-4 text-center">
        Chat unlocks automatically when both reach {vocabThreshold} ⚡
      </p>
    </div>
  );
}
