import { Link } from 'react-router-dom';
import { Lock, Unlock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMyUnlockProgress } from '../../../hooks/useMyUnlockProgress';

function formatMins(m) {
  const h = Math.floor(m / 60), min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

export default function ChatStatusWidget() {
  const { 
    isUnlocked, 
    studyMinutes, studyThreshold, studyPct, 
    vocabCount, vocabThreshold, vocabPct 
  } = useMyUnlockProgress();

  return (
    <Link to="/chat" className="block h-full">
      <div className={`h-full rounded-2xl border p-4 flex flex-col cursor-pointer transition-all hover:border-opacity-50 ${
        isUnlocked
          ? 'bg-gradient-to-br from-cyan-950/50 to-purple-950/40 border-cyan-500/30'
          : 'bg-white/[0.02] border-white/10 hover:border-white/20'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-widest">Chat Status</p>
          {isUnlocked
            ? <Unlock size={15} className="text-cyan-400" />
            : <Lock   size={15} className="text-slate-600" />
          }
        </div>

        {isUnlocked ? (
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
          <div className="flex-1 flex flex-col justify-center gap-3">
            <p className="text-xs text-slate-500 text-center mb-1">Meet daily goals to unlock 🔐</p>
            
            {/* Study Progress */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Study Progress</span>
                <span className="text-slate-500">{formatMins(studyMinutes)} / {formatMins(studyThreshold)}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${studyPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                />
              </div>
            </div>

            {/* Vocabulary Progress */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Vocabulary Progress</span>
                <span className="text-slate-500">{vocabCount} / {vocabThreshold}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${vocabPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                />
              </div>
            </div>

          </div>
        )}
      </div>
    </Link>
  );
}
