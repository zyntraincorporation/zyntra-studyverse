// client/src/components/vocabulary/WordModal.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUpdateWord } from '../../hooks/vocabulary/useVocabularyWords';
import { useAIAutofill } from '../../hooks/vocabulary/useAIAssistant';

export default function WordModal({ word, onClose }) {
  const { mutate: updateWord, isPending: saving } = useUpdateWord();
  const { mutate: aiAutofill, isPending: autofilling } = useAIAutofill();

  const [form, setForm] = useState({
    word:              word.word              || '',
    partOfSpeech:      word.partOfSpeech      || '',
    englishDefinition: word.englishDefinition || word.englishMeaning || word.definition || '',
    banglaMeaning:     word.banglaMeaning     || word.banglaDefinition || '',
    banglaDefinition:  word.banglaDefinition  || word.banglaMeaning    || '',
    pronunciation:     word.pronunciation     || '',
    exampleSentence:   word.exampleSentence   || word.example || '',
    synonyms:          (word.synonyms  || []).join(', '),
    antonyms:          (word.antonyms  || []).join(', '),
    antonymMeaning:    word.antonymMeaning    || '',
    notes:             word.notes             || '',
    difficulty:        word.difficulty        || 3,
    tags:              (word.tags || []).join(', '),
  });

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleAIAutofill() {
    if (!form.word.trim()) return;
    aiAutofill(form.word, {
      onSuccess: (data) => {
        if (!data) return;
        setForm(f => ({
          ...f,
          partOfSpeech:      data.partOfSpeech      || f.partOfSpeech,
          englishDefinition: data.englishDefinition || data.englishMeaning || data.definition || f.englishDefinition,
          banglaMeaning:     data.banglaMeaning     || data.banglaDefinition || data.bnMeaning || f.banglaMeaning,
          banglaDefinition:  data.banglaDefinition  || data.banglaMeaning    || data.bnMeaning || f.banglaDefinition,
          pronunciation:     data.pronunciation     || f.pronunciation,
          exampleSentence:   data.exampleSentence   || data.example || f.exampleSentence,
          synonyms:          (data.synonyms || []).join(', ') || f.synonyms,
          antonyms:          (data.antonyms || []).join(', ') || f.antonyms,
          antonymMeaning:    data.antonymMeaning    || f.antonymMeaning,
        }));
      },
    });
  }

  function handleSave() {
    if (!form.word.trim()) return;
    const finalBanglaMeaning = (form.banglaMeaning || form.banglaDefinition || '').trim();
    const finalBanglaDefinition = (form.banglaDefinition || form.banglaMeaning || '').trim();
    if (!finalBanglaMeaning && !finalBanglaDefinition) return;

    updateWord({
      id:                word.id,
      word:              form.word.trim(),
      partOfSpeech:      form.partOfSpeech.trim() || null,
      englishDefinition: form.englishDefinition.trim() || null,
      englishMeaning:    form.englishDefinition.trim() || null,
      banglaMeaning:     finalBanglaMeaning,
      banglaDefinition:  finalBanglaDefinition,
      pronunciation:     form.pronunciation.trim() || null,
      exampleSentence:   form.exampleSentence.trim() || null,
      synonyms:          form.synonyms.split(',').map(s => s.trim()).filter(Boolean),
      antonyms:          form.antonyms.split(',').map(s => s.trim()).filter(Boolean),
      antonymMeaning:    form.antonymMeaning.trim() || null,
      notes:             form.notes.trim() || null,
      difficulty:        form.difficulty,
      tags:              form.tags.split(',').map(s => s.trim()).filter(Boolean),
    }, {
      onSuccess: onClose,
    });
  }

  const canSave = !!form.word.trim() && (!!form.banglaMeaning.trim() || !!form.banglaDefinition.trim());

  return (
    // Backdrop
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0d1120] border border-white/10 rounded-t-3xl overflow-hidden shadow-2xl"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[85vh] px-4 pb-8 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <div>
              <h2 className="text-white font-bold text-base flex items-center gap-2">
                <span>✏️</span> Edit Word
              </h2>
              <p className="text-slate-400 text-xs">Update definitions, translations & notes</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white text-sm flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Word + AI */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-medium">English Word *</label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-medium outline-none focus:border-cyan-500/50"
                value={form.word}
                onChange={e => set('word', e.target.value)}
              />
              <button
                type="button"
                onClick={handleAIAutofill}
                disabled={autofilling || !form.word.trim()}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold disabled:opacity-50 hover:bg-cyan-500/30 transition-all whitespace-nowrap shadow-sm shadow-cyan-900/20"
              >
                {autofilling ? '⏳ AI...' : '✨ AI Fill'}
              </button>
            </div>
          </div>

          {/* Part of Speech & Pronunciation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Part of Speech</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50"
                placeholder="e.g. Adjective"
                value={form.partOfSpeech}
                onChange={e => set('partOfSpeech', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Pronunciation</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50"
                placeholder="/ɪˈfɛmərəl/"
                value={form.pronunciation}
                onChange={e => set('pronunciation', e.target.value)}
              />
            </div>
          </div>

          {/* English Definition */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">English Definition</label>
            <textarea
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 resize-none"
              placeholder="Full English dictionary definition..."
              value={form.englishDefinition}
              onChange={e => set('englishDefinition', e.target.value)}
            />
          </div>

          {/* Bangla Intelligence Box */}
          <div className="space-y-3 bg-gradient-to-br from-emerald-950/20 to-teal-950/20 border border-emerald-500/20 rounded-2xl p-3.5">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
              <span>🇧🇩</span>
              <span>Bangla Intelligence</span>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">বাংলা অর্থ (Short Meaning) *</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50"
                placeholder="সংক্ষিপ্ত বাংলা অর্থ"
                value={form.banglaMeaning}
                onChange={e => set('banglaMeaning', e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">বাংলা Definition (Detailed Explanation) *</label>
              <textarea
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 resize-none"
                placeholder="সহজবোধ্য ও প্রাঞ্জল বাংলা সংজ্ঞা/ব্যাখ্যা..."
                value={form.banglaDefinition}
                onChange={e => set('banglaDefinition', e.target.value)}
              />
            </div>
          </div>

          {/* Example Sentence */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Example Sentence</label>
            <textarea
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 resize-none"
              placeholder="Contextual example sentence..."
              value={form.exampleSentence}
              onChange={e => set('exampleSentence', e.target.value)}
            />
          </div>

          {/* Synonyms & Antonyms */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Synonyms (comma-separated)</label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50"
              placeholder="synonym1, synonym2"
              value={form.synonyms}
              onChange={e => set('synonyms', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Antonyms</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50"
                placeholder="antonym1, antonym2"
                value={form.antonyms}
                onChange={e => set('antonyms', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Antonym Meaning (Bangla)</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50"
                placeholder="বিপরীত শব্দের বাংলা অর্থ"
                value={form.antonymMeaning}
                onChange={e => set('antonymMeaning', e.target.value)}
              />
            </div>
          </div>

          {/* Notes & Tags */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Notes</label>
            <textarea
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 resize-none"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Tags (comma-separated)</label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50"
              placeholder="HSC, BUET, Important"
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">
              Difficulty: <span className="text-cyan-400 font-bold">{form.difficulty}/5</span>
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => set('difficulty', d)}
                  className={`w-9 h-9 rounded-xl border text-sm font-bold transition-all
                    ${form.difficulty === d
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-sm shadow-cyan-900/30'
                      : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
                    }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-all shadow-lg shadow-purple-900/30"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}