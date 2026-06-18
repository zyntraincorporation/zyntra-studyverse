import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SwipeCard from './SwipeCard';
import { useRevisionQueue } from '../../hooks/vocabulary/useVocabularyWords';
import { useSubmitReview } from '../../hooks/vocabulary/useFlashcardSession';
import { useStore } from '../../store';

const MODES = [
  { id: 'en_to_bn',         label: 'EN → BN' },
  { id: 'bn_to_en',         label: 'BN → EN' },
  { id: 'synonym_to_word',  label: 'Synonym → Word' },
  { id: 'meaning_to_word',  label: 'Meaning → Word' },
];

export default function RecallArena() {
  const { flashMode, setFlashMode } = useStore();
  const { data: queue = [] } = useRevisionQueue();
  const { mutate: submitReview } = useSubmitReview();

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState([]);

  const current = queue[index];
  const isDone = index >= queue.length;

  function getFront(word) {
    if (flashMode === 'en_to_bn')        return { label: 'English', text: word.word };
    if (flashMode === 'bn_to_en')        return { label: 'Bangla', text: word.banglaMeaning };
    if (flashMode === 'synonym_to_word') return { label: 'Synonym', text: word.synonyms?.[0] || word.word };
    return { label: 'Meaning', text: word.banglaMeaning };
  }
  function getBack(word) {
    if (flashMode === 'en_to_bn')        return { label: 'Bangla Meaning', text: word.banglaMeaning };
    if (flashMode === 'bn_to_en')        return { label: 'English', text: word.word };
    if (flashMode === 'synonym_to_word') return { label: 'Word', text: word.word };
    return { label: 'Word', text: word.word };
  }

  function handleResult(result, confidence) {
    submitReview({ wordId: current.id, mode: flashMode, result, confidence });
    setResults(r => [...r, { wordId: current.id, result }]);
    setFlipped(false);
    setTimeout(() => setIndex(i => i + 1), 200);
  }

  const correct = results.filter(r => r.result === 'correct').length;
  const failed  = results.filter(r => r.result === 'incorrect').length;

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {MODES.map(m => (
          <button key={m.id} onClick={() => setFlashMode(m.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
              ${flashMode === m.id
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-white/5 border-white/10 text-slate-400'
              }`}>
            {m.label}
          </button>
        ))}
      </div>

      {isDone ? (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-white font-bold text-lg">Session Complete!</p>
          <div className="flex justify-center gap-8 mt-4">
            <div><p className="text-emerald-400 text-xl font-bold">{correct}</p><p className="text-xs text-slate-500">Correct</p></div>
            <div><p className="text-red-400 text-xl font-bold">{failed}</p><p className="text-xs text-slate-500">Failed</p></div>
            <div><p className="text-cyan-400 text-xl font-bold">{queue.length > 0 ? Math.round(correct / queue.length * 100) : 0}%</p><p className="text-xs text-slate-500">Mastery</p></div>
          </div>
          <button onClick={() => { setIndex(0); setResults([]); }}
            className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 text-white text-sm font-semibold">
            Retry Session
          </button>
        </div>
      ) : current ? (
        <>
          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${(index / queue.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{index}/{queue.length}</span>
          </div>

          {/* Swipe Card */}
          <SwipeCard
            onSwipeLeft={() => handleResult('incorrect', 1)}
            onSwipeRight={() => handleResult('correct', 4)}
          >
            <motion.div
              className="rounded-2xl border border-white/10 overflow-hidden"
              onClick={() => setFlipped(f => !f)}
              style={{ perspective: 1000 }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={flipped ? 'back' : 'front'}
                  initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`p-6 min-h-[180px] flex flex-col items-center justify-center text-center
                    ${flipped
                      ? 'bg-gradient-to-br from-purple-900/30 to-slate-900'
                      : 'bg-gradient-to-br from-slate-900 to-slate-800'
                    }`}
                >
                  <p className="text-xs font-medium mb-3 uppercase tracking-widest text-slate-500">
                    {flipped ? getBack(current).label : getFront(current).label}
                  </p>
                  <p className="text-white text-3xl font-bold">
                    {flipped ? getBack(current).text : getFront(current).text}
                  </p>
                  {!flipped && (
                    <p className="text-slate-600 text-xs mt-4">Tap to reveal • Swipe to judge</p>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </SwipeCard>

          {/* Confidence Buttons */}
          <AnimatePresence>
            {flipped && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex gap-2">
                {[
                  { label: '✗ Hard', result: 'incorrect', confidence: 1, color: 'red' },
                  { label: '~ OK',   result: 'correct',   confidence: 2, color: 'amber' },
                  { label: '✓ Easy', result: 'correct',   confidence: 5, color: 'emerald' },
                ].map(btn => (
                  <button key={btn.label}
                    onClick={() => handleResult(btn.result, btn.confidence)}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-transform active:scale-95
                      ${btn.color === 'red'     ? 'bg-red-500/20 border border-red-500/30 text-red-400' : ''}
                      ${btn.color === 'amber'   ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400' : ''}
                      ${btn.color === 'emerald' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : ''}
                    `}>
                    {btn.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6 text-center">
          <p className="text-slate-400">No words due for revision. Add words first!</p>
        </div>
      )}
    </div>
  );
}