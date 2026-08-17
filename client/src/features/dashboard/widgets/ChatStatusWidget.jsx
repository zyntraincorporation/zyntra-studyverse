import { Link } from 'react-router-dom';
import { Lock, Unlock, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../../store';
import { useMyUnlockProgress } from '../../../hooks/useMyUnlockProgress';

export default function ChatStatusWidget() {
  const partner = useAuthStore(s => s.partner);
  const {
    isUnlocked,
    vocabCount,
    partnerVocabCount,
    vocabThreshold,
    vocabPct,
    partnerVocabPct,
  } = useMyUnlockProgress();

  const partnerName = partner?.displayName || 'Partner';
  const myDone      = vocabCount        >= vocabThreshold;
  const partnerDone = partnerVocabCount >= vocabThreshold;

  return (
    <Link to="/chat" className="block h-full">
      <div className={`h-full rounded-2xl border p-4 flex flex-col cursor-pointer transition-all ${
        isUnlocked
          ? 'bg-gradient-to-br from-cyan-950/50 to-purple-950/40 border-cyan-500/30 hover:border-cyan-500/50'
          : 'bg-white/[0.02] border-white/10 hover:border-white/20'
      }`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-widest">Chat Status</p>
          {isUnlocked
            ? <Unlock size={15} className="text-cyan-400" />
            : <Lock   size={15} className="text-slate-600" />
          }
        </div>

        {isUnlocked ? (
          /* ── Unlocked state ── */
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-3xl"
            >🔓</motion.div>
            <p className="text-sm font-bold text-cyan-300">Chat Unlocked!</p>
            <span className="text-xs text-slate-400">Tap to enter →</span>
          </div>
        ) : (
          /* ── Locked state: vocab progress for both users ── */
          <div className="flex-1 flex flex-col justify-center gap-3">
            <p className="text-[11px] text-slate-500 text-center mb-1">
              Both need {vocabThreshold} vocab to unlock 🔐
            </p>

            {/* My vocab */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  You
                  {myDone && <CheckCircle2 size={10} className="text-green-400" />}
                </span>
                <span className={myDone ? 'text-green-400 font-semibold' : 'text-slate-500'}>
                  {vocabCount} / {vocabThreshold}
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${vocabPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    myDone
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                  }`}
                />
              </div>
            </div>

            {/* Partner vocab */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  {partnerName}
                  {partnerDone && <CheckCircle2 size={10} className="text-green-400" />}
                </span>
                <span className={partnerDone ? 'text-green-400 font-semibold' : 'text-slate-500'}>
                  {partnerVocabCount} / {vocabThreshold}
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${partnerVocabPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    partnerDone
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500'
                  }`}
                />
              </div>
            </div>

          </div>
        )}
      </div>
    </Link>
  );
}
