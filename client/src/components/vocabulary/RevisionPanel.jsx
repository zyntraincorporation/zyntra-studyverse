// client/src/components/vocabulary/RevisionPanel.jsx
// Mini panel showing revision schedule overview.
// Used on Dashboard or as a sidebar widget inside VocabularyPage.

import { motion } from 'framer-motion';
import { useRevisionQueue } from '../../hooks/vocabulary/useVocabularyWords';
import { useStore } from '../../store';

const INTERVAL_LABELS = {
  1:  { label: '1d',    color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
  3:  { label: '3d',    color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  7:  { label: '1wk',   color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20' },
  14: { label: '2wk',   color: 'text-lime-400',    bg: 'bg-lime-500/10',    border: 'border-lime-500/20' },
  30: { label: '1mo',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  60: { label: '2mo',   color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20' },
};

export default function RevisionPanel() {
  const { data: queue = [], isLoading } = useRevisionQueue();
  const { setActiveVocabModule } = useStore();

  // Group by interval
  const grouped = queue.reduce((acc, word) => {
    const key = word.reviewInterval;
    if (!acc[key]) acc[key] = [];
    acc[key].push(word);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/3 p-4 space-y-2">
        <div className="h-4 bg-white/5 rounded animate-pulse w-32" />
        <div className="h-10 bg-white/5 rounded animate-pulse" />
        <div className="h-10 bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-white font-semibold text-sm">📋 Revision Panel</h3>
          <p className="text-slate-500 text-xs mt-0.5">
            {queue.length === 0 ? 'All clear!' : `${queue.length} words due now`}
          </p>
        </div>
        {queue.length > 0 && (
          <button
            onClick={() => setActiveVocabModule('revision')}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-semibold"
          >
            Start →
          </button>
        )}
      </div>

      {queue.length === 0 ? (
        <div className="py-6 text-center">
          <div className="text-3xl mb-2">🎯</div>
          <p className="text-slate-400 text-sm">No revisions due.</p>
          <p className="text-slate-600 text-xs mt-1">Check back later!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Interval Breakdown */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(grouped).map(([interval, words]) => {
              const cfg = INTERVAL_LABELS[Number(interval)] || { label: `${interval}d`, color: 'text-slate-400', bg: 'bg-white/5', border: 'border-white/10' };
              return (
                <motion.div
                  key={interval}
                  whileHover={{ scale: 1.05 }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.border}`}
                >
                  <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-white text-xs font-bold">{words.length}</span>
                </motion.div>
              );
            })}
          </div>

          {/* Word List Preview */}
          <div className="space-y-1.5">
            {queue.slice(0, 5).map((word, i) => {
              const cfg = INTERVAL_LABELS[word.reviewInterval] || {};
              return (
                <motion.div
                  key={word.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cfg.bg || 'bg-white/5'} ${cfg.border || 'border-white/10'} ${cfg.color || 'text-slate-400'}`}>
                    {cfg.label || `${word.reviewInterval}d`}
                  </span>
                  <span className="text-white text-sm flex-1 truncate">{word.word}</span>
                  <span className="text-slate-600 text-xs">{Math.round(word.masteryLevel)}%</span>
                </motion.div>
              );
            })}
            {queue.length > 5 && (
              <p className="text-slate-600 text-xs text-center py-1">
                +{queue.length - 5} more
              </p>
            )}
          </div>

          {/* Mastery Distribution mini bar */}
          <div>
            <p className="text-[10px] text-slate-600 mb-1.5 uppercase tracking-wider">Mastery Distribution</p>
            <MasteryDistribution words={queue} />
          </div>
        </div>
      )}
    </div>
  );
}

function MasteryDistribution({ words }) {
  const buckets = [
    { label: '0–25%',  count: words.filter(w => w.masteryLevel < 25).length,  color: 'bg-red-500' },
    { label: '25–50%', count: words.filter(w => w.masteryLevel >= 25 && w.masteryLevel < 50).length, color: 'bg-amber-500' },
    { label: '50–80%', count: words.filter(w => w.masteryLevel >= 50 && w.masteryLevel < 80).length, color: 'bg-yellow-500' },
    { label: '80%+',   count: words.filter(w => w.masteryLevel >= 80).length,  color: 'bg-emerald-500' },
  ];
  const total = words.length || 1;

  return (
    <div className="space-y-1.5">
      {buckets.map(b => (
        <div key={b.label} className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-12 text-right">{b.label}</span>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(b.count / total) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`h-full rounded-full ${b.color}`}
            />
          </div>
          <span className="text-[10px] text-slate-500 w-4">{b.count}</span>
        </div>
      ))}
    </div>
  );
}