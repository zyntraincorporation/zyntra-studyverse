// client/src/components/vocabulary/WordArchive.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVocabularyWords, useDeleteWord } from '../../hooks/vocabulary/useVocabularyWords';
import WordModal from './WordModal';

const SORT_OPTIONS = [
  { value: 'newest',  label: 'Newest' },
  { value: 'mastery', label: 'Mastery' },
  { value: 'due',     label: 'Due First' },
];

const FILTER_OPTIONS = [
  { value: '',         label: 'All' },
  { value: 'due',      label: 'Due' },
  { value: 'mastered', label: 'Mastered' },
  { value: 'hard',     label: 'Hard' },
];

const MASTERY_COLOR = (level) => {
  if (level >= 80) return 'text-emerald-400';
  if (level >= 50) return 'text-amber-400';
  return 'text-red-400';
};

const MASTERY_BAR = (level) => {
  if (level >= 80) return 'bg-emerald-500';
  if (level >= 50) return 'bg-amber-500';
  return 'bg-red-500';
};

export default function WordArchive() {
  const [search, setSearch]   = useState('');
  const [sort, setSort]       = useState('newest');
  const [filter, setFilter]   = useState('');
  const [page, setPage]       = useState(1);
  const [selected, setSelected] = useState(null);  // word to edit
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading } = useVocabularyWords({ search, sort, filter, page });
  const { mutate: deleteWord, isPending: deleting } = useDeleteWord();

  const words = data?.words || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  function handleDelete(id) {
    deleteWord(id, { onSuccess: () => setDeleteId(null) });
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
        <input
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50"
          placeholder="Search words or meanings..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Sort + Filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1">
          {FILTER_OPTIONS.map(f => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-all
                ${filter === f.value
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-slate-400'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="ml-auto bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-400 outline-none"
        >
          {SORT_OPTIONS.map(s => (
            <option key={s.value} value={s.value} className="bg-slate-900">{s.label}</option>
          ))}
        </select>
      </div>

      {/* Count */}
      <p className="text-slate-500 text-xs">{total} words total</p>

      {/* Word List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : words.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-8 text-center">
          <p className="text-4xl mb-2">📭</p>
          <p className="text-slate-400 text-sm">No words found.</p>
          <p className="text-slate-600 text-xs mt-1">Try adding words using Word Forge.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {words.map((word, i) => (
              <motion.div
                key={word.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-white/10 bg-white/3 p-3"
              >
                <div className="flex items-start gap-3">
                  {/* Left: word info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm">{word.word}</span>
                      {word.pronunciation && (
                        <span className="text-slate-500 text-xs">/{word.pronunciation}/</span>
                      )}
                      <DifficultyDots level={word.difficulty} />
                    </div>
                    <p className="text-purple-300 text-xs mt-0.5 truncate">{word.banglaMeaning}</p>
                    {word.synonyms?.length > 0 && (
                      <p className="text-slate-600 text-xs mt-0.5 truncate">
                        syn: {word.synonyms.slice(0, 3).join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Right: mastery + actions */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-xs font-semibold ${MASTERY_COLOR(word.masteryLevel)}`}>
                      {Math.round(word.masteryLevel)}%
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setSelected(word)}
                        className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs hover:text-cyan-400 transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeleteId(word.id)}
                        className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs hover:text-red-400 transition-colors"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mastery Bar */}
                <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${MASTERY_BAR(word.masteryLevel)}`}
                    style={{ width: `${word.masteryLevel}%` }}
                  />
                </div>

                {/* Stats row */}
                <div className="flex gap-4 mt-1.5 text-[10px] text-slate-600">
                  <span>✓ {word.correctCount}</span>
                  <span>✗ {word.failCount}</span>
                  <span>🔄 {word.totalReviews} reviews</span>
                  {word.nextReviewAt && (
                    <span className="ml-auto text-slate-500">
                      Next: {formatDate(word.nextReviewAt)}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400 disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="px-3 py-1.5 text-xs text-slate-500">
            {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {selected && (
          <WordModal
            word={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center p-4"
            onClick={() => setDeleteId(null)}
          >
            <motion.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d1120] p-5 space-y-4"
            >
              <p className="text-white font-semibold text-center">Delete this word?</p>
              <p className="text-slate-400 text-sm text-center">
                This will remove all review history too.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DifficultyDots({ level }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i <= level ? 'bg-amber-400' : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  );
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const diff = Math.round((date - today) / (1000 * 60 * 60 * 24));
  if (diff <= 0)  return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 7)   return `${diff}d`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}