import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { useSubmitReview } from '../../hooks/vocabulary/useFlashcardSession';

export default function QuickRecallStrip() {
  const {
    recallWords, recallIndex, recallResults,
    nextRecallCard, prevRecallCard, markRecallResult, shuffleRecallWords
  } = useStore();

  const [flipped, setFlipped] = useState(false);
  const { mutate: submitReview } = useSubmitReview();

  const current = recallWords[recallIndex];
  const total = recallWords.length;
  const known = Object.values(recallResults).filter(v => v === 'known').length;
  const unknown = Object.values(recallResults).filter(v => v === 'unknown').length;
  const isDone = recallIndex >= total;

  if (!current && !isDone) return null;

  function handleResult(result) {
    markRecallResult(current.id, result);
    submitReview({
      wordId: current.id,
      mode: 'en_to_bn',
      result: result === 'known' ? 'correct' : 'incorrect',
      confidence: result === 'known' ? 4 : 2,
    });
    setFlipped(false);
    nextRecallCard();
  }

  return (
    <div className="px-4 mt-4">
      {/* Strip Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs text-amber-400 font-semibold uppercase tracking-widest">
            ⚡ Yesterday Revision
          </span>
          <p className="text-slate-400 text-xs mt-0.5">{total} words to warm up</p>
        </div>
        <button
          onClick={shuffleRecallWords}
          className="text-xs text-slate-500 hover:text-cyan-400 transition-colors px-2 py-1 rounded-lg border border-white/10"
        >
          🔀 Shuffle
        </button>
      </div>

      {/* Progress */}
      <div className="flex gap-1 mb-3">
        {recallWords.map((w, i) => (
          <div
            key={w.id}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              recallResults[w.id] === 'known'   ? 'bg-emerald-500' :
              recallResults[w.id] === 'unknown' ? 'bg-red-500' :
              i === recallIndex                 ? 'bg-cyan-400' : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        {isDone ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 p-5 text-center"
          >
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-white font-semibold">Warm-up Complete!</p>
            <div className="flex justify-center gap-6 mt-3 text-sm">
              <div className="text-emerald-400">✓ {known} Known</div>
              <div className="text-red-400">✗ {unknown} Unknown</div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={current.id}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Flip Card */}
            <div
              className="cursor-pointer select-none"
              onClick={() => setFlipped(f => !f)}
              style={{ perspective: 1000 }}
            >
              <motion.div
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.4 }}
                style={{ transformStyle: 'preserve-3d', position: 'relative', minHeight: 120 }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-5"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <p className="text-slate-400 text-xs mb-2">English</p>
                  <p className="text-white text-2xl font-bold">{current.word}</p>
                  <p className="text-slate-500 text-xs mt-2">Tap to reveal</p>
                </div>
                {/* Back */}
                <div
                  className="absolute inset-0 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/30 to-slate-900 flex flex-col items-center justify-center p-5"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <p className="text-purple-400 text-xs mb-2">Bangla Meaning</p>
                  <p className="text-white text-xl font-bold">{current.banglaMeaning}</p>
                  {current.pronunciation && (
                    <p className="text-slate-500 text-xs mt-1">/{current.pronunciation}/</p>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Confidence Buttons — show after flip */}
            <AnimatePresence>
              {flipped && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 mt-3"
                >
                  <button
                    onClick={() => handleResult('unknown')}
                    className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-semibold text-sm active:scale-95 transition-transform"
                  >
                    ✗ Forgot
                  </button>
                  <button
                    onClick={() => handleResult('known')}
                    className="flex-1 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold text-sm active:scale-95 transition-transform"
                  >
                    ✓ Got it!
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}