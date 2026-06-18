// client/src/components/vocabulary/FlashcardDeck.jsx
// Renders a visually stacked deck of cards with swipe support.
// Used by RecallArena and SmartRevision as the card display layer.

import { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

/**
 * Props:
 *   cards        – array of objects with { id, front, back, sublabel? }
 *   onResult     – (cardId, result: 'correct'|'incorrect', confidence: 1|2|5) => void
 *   onComplete   – () => void  called when all cards done
 *   showProgress – boolean (default true)
 */
export default function FlashcardDeck({
  cards = [],
  onResult,
  onComplete,
  showProgress = true,
}) {
  const [index, setIndex]   = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState([]);   // { id, result }
  const [exiting, setExiting] = useState(null); // 'left' | 'right'

  const current  = cards[index];
  const isDone   = index >= cards.length;
  const correct  = results.filter(r => r.result === 'correct').length;
  const accuracy = results.length > 0 ? Math.round((correct / results.length) * 100) : 0;

  // Motion values for current card
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 150], [-12, 12]);
  const leftAlpha  = useTransform(x, [-80, 0], [1, 0]);
  const rightAlpha = useTransform(x, [0, 80], [0, 1]);

  async function dismiss(direction, result, confidence) {
    if (!current) return;
    setExiting(direction);
    const newResults = [...results, { id: current.id, result }];
    setResults(newResults);
    onResult?.(current.id, result, confidence);

    await new Promise(r => setTimeout(r, 260));
    setExiting(null);
    setFlipped(false);
    const nextIdx = index + 1;
    setIndex(nextIdx);
    x.set(0);

    if (nextIdx >= cards.length) {
      onComplete?.();
    }
  }

  function handleDragEnd(_, info) {
    if (info.offset.x > 80) {
      dismiss('right', 'correct', 4);
    } else if (info.offset.x < -80) {
      dismiss('left', 'incorrect', 1);
    } else {
      x.set(0);
    }
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/3 p-8 text-center">
        <p className="text-slate-400 text-sm">No cards to show.</p>
      </div>
    );
  }

  if (isDone) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-white/10 bg-white/3 p-6 text-center"
      >
        <div className="text-4xl mb-3">🎉</div>
        <p className="text-white font-bold text-xl">Deck Complete!</p>

        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Done',     value: results.length, color: 'text-cyan-400' },
            { label: 'Correct',  value: correct,        color: 'text-emerald-400' },
            { label: 'Accuracy', value: `${accuracy}%`, color: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-3">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => { setIndex(0); setResults([]); setFlipped(false); }}
          className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-semibold text-sm"
        >
          Replay Deck
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      {showProgress && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{index + 1} / {cards.length}</span>
            <span>{accuracy > 0 ? `${accuracy}% accuracy` : ''}</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
              animate={{ width: `${(index / cards.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Stacked Background Cards */}
      <div className="relative" style={{ height: 220 }}>
        {/* Ghost card 2 */}
        {cards[index + 2] && (
          <div className="absolute inset-x-4 top-4 rounded-2xl border border-white/5 bg-white/3"
            style={{ height: 200, zIndex: 1 }} />
        )}
        {/* Ghost card 1 */}
        {cards[index + 1] && (
          <div className="absolute inset-x-2 top-2 rounded-2xl border border-white/8 bg-white/4"
            style={{ height: 200, zIndex: 2 }} />
        )}

        {/* Active Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            style={{ x, rotate, position: 'absolute', inset: 0, zIndex: 3 }}
            drag="x"
            dragConstraints={{ left: -200, right: 200 }}
            onDragEnd={handleDragEnd}
            animate={
              exiting === 'right' ? { x: 400, opacity: 0, rotate: 20 } :
              exiting === 'left'  ? { x: -400, opacity: 0, rotate: -20 } :
              {}
            }
            transition={{ duration: 0.25 }}
            className="cursor-grab active:cursor-grabbing"
          >
            {/* Swipe indicators */}
            <motion.div
              style={{ opacity: leftAlpha }}
              className="absolute top-4 left-4 z-10 text-red-400 font-bold text-sm border border-red-400/60 px-2 py-0.5 rounded-lg"
            >
              ✗ MISS
            </motion.div>
            <motion.div
              style={{ opacity: rightAlpha }}
              className="absolute top-4 right-4 z-10 text-emerald-400 font-bold text-sm border border-emerald-400/60 px-2 py-0.5 rounded-lg"
            >
              ✓ GOT IT
            </motion.div>

            {/* Card face — flip on tap */}
            <div
              onClick={() => setFlipped(f => !f)}
              className="w-full h-full"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={flipped ? 'back' : 'front'}
                  initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`w-full h-full rounded-2xl border flex flex-col items-center justify-center p-6 text-center
                    ${flipped
                      ? 'border-purple-500/20 bg-gradient-to-br from-purple-900/30 to-slate-900'
                      : 'border-cyan-500/20 bg-gradient-to-br from-slate-900 to-[#0d1120]'
                    }`}
                >
                  <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                    {flipped ? current.backLabel || 'Answer' : current.frontLabel || 'Question'}
                  </p>
                  <p className="text-white text-2xl font-bold leading-snug">
                    {flipped ? current.back : current.front}
                  </p>
                  {current.sublabel && !flipped && (
                    <p className="text-slate-600 text-xs mt-3">{current.sublabel}</p>
                  )}
                  {!flipped && (
                    <p className="text-slate-700 text-xs mt-4">
                      Tap to flip · Swipe to judge
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Confidence Buttons — appear after flip */}
      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-3 gap-2"
          >
            {[
              { label: '✗ Again',   result: 'incorrect', conf: 1, cls: 'text-red-400     border-red-500/30     bg-red-500/15' },
              { label: '~ OK',      result: 'correct',   conf: 2, cls: 'text-amber-400   border-amber-500/30   bg-amber-500/15' },
              { label: '✓ Easy',    result: 'correct',   conf: 5, cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/15' },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={() => dismiss(btn.result === 'correct' ? 'right' : 'left', btn.result, btn.conf)}
                className={`py-3 rounded-xl border text-sm font-semibold active:scale-95 transition-transform ${btn.cls}`}
              >
                {btn.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}