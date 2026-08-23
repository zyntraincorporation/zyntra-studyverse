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
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {words.map((word, i) => {
              const banglaMean = word.banglaMeaning || word.banglaDefinition || '';
              const banglaDef = word.banglaDefinition && word.banglaDefinition !== banglaMean ? word.banglaDefinition : (word.banglaDefinition || '');
              const englishDef = word.englishDefinition || word.englishMeaning || word.definition || '';
              const example = word.exampleSentence || word.example || '';

              return (
                <motion.div
                  key={word.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-2xl border border-white/10 bg-white/3 hover:border-white/20 p-4 space-y-3 transition-colors shadow-sm"
                >
                  {/* Top Header: Word + POS + Pronunciation + Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-white font-bold text-base tracking-wide">{word.word}</span>
                      {word.partOfSpeech && (
                        <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/15 border border-purple-500/30 rounded-md px-1.5 py-0.5">
                          {word.partOfSpeech}
                        </span>
                      )}
                      {word.pronunciation && (
                        <span className="text-slate-400 text-xs font-mono">/{word.pronunciation}/</span>
                      )}
                      <DifficultyDots level={word.difficulty} />
                    </div>

                    {/* Right: mastery + actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 ${MASTERY_COLOR(word.masteryLevel)}`}>
                        {Math.round(word.masteryLevel)}%
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setSelected(word)}
                          title="Edit word"
                          className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 text-xs flex items-center justify-center transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeleteId(word.id)}
                          title="Delete word"
                          className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 hover:bg-red-500/10 text-xs flex items-center justify-center transition-colors"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* English Definition */}
                  {englishDef && (
                    <div className="text-xs text-slate-300 leading-relaxed bg-white/3 border border-white/5 rounded-xl px-3 py-2">
                      <span className="text-[10px] text-cyan-400 font-semibold block uppercase tracking-wider mb-0.5">English Definition</span>
                      <p>{englishDef}</p>
                    </div>
                  )}

                  {/* Bangla Meaning & Bangla Definition Box */}
                  {(banglaMean || banglaDef) && (
                    <div className="bg-gradient-to-br from-emerald-950/20 to-teal-950/20 border border-emerald-500/20 rounded-xl px-3 py-2.5 space-y-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">বাংলা অর্থ:</span>
                        <span className="text-emerald-200 text-sm font-semibold">{banglaMean}</span>
                      </div>
                      {banglaDef && (
                        <div className="pt-1 border-t border-emerald-500/15">
                          <span className="text-[10px] text-teal-400/80 font-medium block mb-0.5">বাংলা ব্যাখ্যা / Definition:</span>
                          <p className="text-slate-200 text-xs leading-relaxed">{banglaDef}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Example Sentence */}
                  {example && (
                    <p className="text-slate-400 text-xs italic border-l-2 border-cyan-500/40 pl-2.5 leading-relaxed">
                      "{example}"
                    </p>
                  )}

                  {/* Synonyms & Antonyms */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {word.synonyms?.length > 0 && (
                      <p className="text-slate-400">
                        <span className="text-cyan-400 font-medium">Synonyms: </span>
                        {word.synonyms.join(', ')}
                      </p>
                    )}
                    {word.antonyms?.length > 0 && (
                      <p className="text-slate-400">
                        <span className="text-red-400 font-medium">Antonyms: </span>
                        {word.antonyms.join(', ')}
                        {word.antonymMeaning && <span className="text-slate-500 ml-1">({word.antonymMeaning})</span>}
                      </p>
                    )}
                  </div>

                  {/* Mastery Bar */}
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${MASTERY_BAR(word.masteryLevel)}`}
                      style={{ width: `${word.masteryLevel}%` }}
                    />
                  </div>

                  {/* Stats row */}
                  <div className="flex gap-4 text-[10px] text-slate-500 pt-0.5">
                    <span>✓ {word.correctCount || 0}</span>
                    <span>✗ {word.failCount || 0}</span>
                    <span>🔄 {word.totalReviews || 0} reviews</span>
                    {word.nextReviewAt && (
                      <span className="ml-auto text-slate-400">
                        Next: {formatDate(word.nextReviewAt)}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
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