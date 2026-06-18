// client/src/components/vocabulary/WordModal.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUpdateWord } from '../../hooks/vocabulary/useVocabularyWords';
import { useAIAutofill } from '../../hooks/vocabulary/useAIAssistant';

export default function WordModal({ word, onClose }) {
  const { mutate: updateWord, isPending: saving } = useUpdateWord();
  const { mutate: aiAutofill, isPending: autofilling } = useAIAutofill();

  const [form, setForm] = useState({
    word:           word.word           || '',
    banglaMeaning:  word.banglaMeaning  || '',
    pronunciation:  word.pronunciation  || '',
    synonyms:       (word.synonyms  || []).join(', '),
    antonyms:       (word.antonyms  || []).join(', '),
    antonymMeaning: word.antonymMeaning || '',
    notes:          word.notes          || '',
    difficulty:     word.difficulty     || 3,
    tags:           (word.tags || []).join(', '),
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
        setForm(f => ({
          ...f,
          banglaMeaning:  data.banglaMeaning  || f.banglaMeaning,
          pronunciation:  data.pronunciation  || f.pronunciation,
          synonyms:       (data.synonyms || []).join(', '),
          antonyms:       (data.antonyms || []).join(', '),
          antonymMeaning: data.antonymMeaning || f.antonymMeaning,
        }));
      },
    });
  }

  function handleSave() {
    updateWord({
      id:             word.id,
      word:           form.word.trim(),
      banglaMeaning:  form.banglaMeaning.trim(),
      pronunciation:  form.pronunciation.trim() || undefined,
      synonyms:       form.synonyms.split(',').map(s => s.trim()).filter(Boolean),
      antonyms:       form.antonyms.split(',').map(s => s.trim()).filter(Boolean),
      antonymMeaning: form.antonymMeaning.trim() || undefined,
      notes:          form.notes.trim() || undefined,
      difficulty:     form.difficulty,
      tags:           form.tags.split(',').map(s => s.trim()).filter(Boolean),
    }, {
      onSuccess: onClose,
    });
  }

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
        className="w-full max-w-lg bg-[#0d1120] border border-white/10 rounded-t-3xl overflow-hidden"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[85vh] px-4 pb-8 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between py-2">
            <h2 className="text-white font-bold">Edit Word</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 text-slate-400 text-sm flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          {/* Word + AI */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">English Word</label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
                value={form.word}
                onChange={e => set('word', e.target.value)}
              />
              <button
                onClick={handleAIAutofill}
                disabled={autofilling || !form.word.trim()}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-semibold disabled:opacity-50"
              >
                {autofilling ? '⏳' : '✨ AI'}
              </button>
            </div>
          </div>

          {[
            { label: 'Bangla Meaning *', key: 'banglaMeaning', placeholder: 'ক্ষণস্থায়ী' },
            { label: 'Pronunciation',    key: 'pronunciation',  placeholder: '/ɪˈfɛmərəl/' },
            { label: 'Synonyms',         key: 'synonyms',       placeholder: 'fleeting, transient' },
            { label: 'Antonyms',         key: 'antonyms',       placeholder: 'permanent, eternal' },
            { label: 'Antonym Meaning',  key: 'antonymMeaning', placeholder: 'স্থায়ী' },
            { label: 'Tags',             key: 'tags',           placeholder: 'adjective, nature' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-slate-400 mb-1 block">{f.label}</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50"
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
              />
            </div>
          ))}

          {/* Notes */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Notes</label>
            <textarea
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 resize-none"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">
              Difficulty: <span className="text-cyan-400">{form.difficulty}/5</span>
            </label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(d => (
                <button
                  key={d}
                  onClick={() => set('difficulty', d)}
                  className={`w-9 h-9 rounded-xl border text-sm font-bold transition-all
                    ${form.difficulty === d
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                      : 'bg-white/5 border-white/10 text-slate-500'
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
            disabled={saving || !form.word || !form.banglaMeaning}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}