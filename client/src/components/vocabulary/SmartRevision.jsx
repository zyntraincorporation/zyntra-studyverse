// client/src/components/vocabulary/SmartRevision.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRevisionQueue } from '../../hooks/vocabulary/useVocabularyWords';
import { useSubmitReview } from '../../hooks/vocabulary/useFlashcardSession';
import SwipeCard from './SwipeCard';

const INTERVAL_LABELS = {
  1:  '1 day',
  3:  '3 days',
  7:  '1 week',
  14: '2 weeks',
  30: '1 month',
  60: '2 months',
};

export default function SmartRevision() {
  const { data: queue = [], isLoading } = useRevisionQueue();
  const { mutate: submitReview, isPending } = useSubmitReview();

  const [index, setIndex]   = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone]     = useState([]);   // { wordId, result }
  const [sessionOver, setSessionOver] = useState(false);

  const current = queue[index];
  const totalDue = queue.length;
  const completed = done.length;
  const correct   = done.filter(d => d.result === 'correct').length;

  function handleResult(result, confidence) {
    if (!current || isPending) return;

    submitReview({
      wordId:     current.id,
      mode:       'en_to_bn',
      result,
      confidence,
    });

    setDone(prev => [...prev, { wordId: current.id, result }]);
    setFlipped(false);

    const nextIdx = index + 1;
    if (nextIdx >= totalDue) {
      setSessionOver(true);
    } else {
      setTimeout(() => setIndex(nextIdx), 200);
    }
  }

  function restart() {
    setIndex(0);
    setDone([]);
    setFlipped(false);
    setSessionOver(false);
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  // ── Session Complete ─────────────────────────────────────────────────────
  if (sessionOver || (totalDue === 0)) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-white/10 bg-white/3 p-6 text-center space-y-4"
      >
        {totalDue === 0 ? (
          <>
            <div className="text-4xl">✅</div>
            <p className="text-white font-bold text-lg">All caught up!</p>
            <p className="text-slate-400 text-sm">No words are due for revision right now.</p>
            <p className="text-slate-500 text-xs mt-1">
              The system will schedule your next review based on your performance.
            </p>
          </>
        ) : (
          <>
            <div className="text-4xl">🏆</div>
            <p className="text-white font-bold text-xl">Session Complete!</p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: 'Reviewed', value: completed, color: 'text-cyan-400' },
                { label: 'Correct',  value: correct,   color: 'text-emerald-400' },
                { label: 'Failed',   value: completed - correct, color: 'text-red-400' },
              ].map(s => (
                <div key={s.label} className="rounded-xl bg-white/5 p-3">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Accuracy bar */}
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Accuracy</span>
                <span>{completed > 0 ? Math.round((correct / completed) * 100) : 0}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completed > 0 ? (correct / completed) * 100 : 0}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"
                />
              </div>
            </div>

            <button
              onClick={restart}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-semibold text-sm"
            >
              Review Again
            </button>
          </>
        )}
      </motion.div>
    );
  }

  // ── Queue Overview (top strip) ───────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-semibold">Smart Revision</p>
          <p className="text-slate-500 text-xs mt-0.5">
            {totalDue - index} cards remaining
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ✓ {correct}
          </span>
          <span className="px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
            ✗ {done.length - correct}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
          animate={{ width: `${(index / totalDue) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Interval Badge */}
      {current && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>🔄</span>
          <span>
            Current interval:&nbsp;
            <span className="text-cyan-400 font-medium">
              {INTERVAL_LABELS[current.reviewInterval] || `${current.reviewInterval}d`}
            </span>
          </span>
          <span>·</span>
          <span>
            Mastery:&nbsp;
            <span className="text-purple-400 font-medium">
              {Math.round(current.masteryLevel)}%
            </span>
          </span>
        </div>
      )}

      {/* Swipeable Card */}
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <SwipeCard
              onSwipeLeft={() => handleResult('incorrect', 1)}
              onSwipeRight={() => handleResult('correct', 4)}
            >
              <div
                onClick={() => setFlipped(f => !f)}
                className="cursor-pointer"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={flipped ? 'back' : 'front'}
                    initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className={`rounded-2xl border p-6 min-h-[200px] flex flex-col items-center justify-center text-center
                      ${flipped
                        ? 'border-purple-500/20 bg-gradient-to-br from-purple-900/30 to-slate-900'
                        : 'border-cyan-500/20 bg-gradient-to-br from-slate-900 to-slate-800'
                      }`}
                  >
                    {!flipped ? (
                      <>
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">English</p>
                        <p className="text-white text-3xl font-bold">{current.word}</p>
                        {current.pronunciation && (
                          <p className="text-slate-500 text-sm mt-2">/{current.pronunciation}/</p>
                        )}
                        <p className="text-slate-600 text-xs mt-4">
                          Tap to flip · Swipe right = known · Left = forgot
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-purple-400 uppercase tracking-widest mb-3">Bangla Meaning</p>
                        <p className="text-white text-2xl font-bold">{current.banglaMeaning}</p>
                        {current.synonyms?.length > 0 && (
                          <p className="text-slate-500 text-xs mt-3">
                            Synonyms: {current.synonyms.slice(0, 3).join(', ')}
                          </p>
                        )}
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </SwipeCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confidence Buttons — visible after flip */}
      <AnimatePresence>
        {flipped && current && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-3 gap-2"
          >
            {[
              { label: '✗ Again',  result: 'incorrect', confidence: 1, cls: 'bg-red-500/20 border-red-500/30 text-red-400' },
              { label: '~ Hard',   result: 'correct',   confidence: 2, cls: 'bg-amber-500/20 border-amber-500/30 text-amber-400' },
              { label: '✓ Easy',   result: 'correct',   confidence: 5, cls: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' },
            ].map(btn => (
              <button
                key={btn.label}
                disabled={isPending}
                onClick={() => handleResult(btn.result, btn.confidence)}
                className={`py-3 rounded-xl border text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50 ${btn.cls}`}
              >
                {btn.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upcoming Due Words List */}
      {queue.length > 1 && (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
          <p className="text-slate-400 text-xs font-semibold mb-3 uppercase tracking-wider">
            Up Next
          </p>
          <div className="space-y-2">
            {queue.slice(index + 1, index + 4).map((w, i) => (
              <div key={w.id} className="flex items-center gap-3 opacity-60">
                <span className="text-slate-600 text-xs w-4">{i + 2}</span>
                <span className="text-white text-sm flex-1">{w.word}</span>
                <span className="text-slate-600 text-xs">{Math.round(w.masteryLevel)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}