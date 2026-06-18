import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import { useCreateWord, useUpdateWord } from '../../hooks/vocabulary/useVocabularyWords';
import { useAIAutofill } from '../../hooks/vocabulary/useAIAssistant';

const DIFFICULTIES = [1, 2, 3, 4, 5];

export default function WordForge() {
  const { forgePrefill, clearForgePrefill } = useStore();
  const { mutate: createWord, isPending: creating } = useCreateWord();
  const { mutate: aiAutofill, isPending: autofilling } = useAIAutofill();

  const [form, setForm] = useState({
    word: '', banglaMeaning: '', pronunciation: '',
    synonyms: '', antonyms: '', antonymMeaning: '',
    notes: '', difficulty: 3, tags: '',
  });

  useEffect(() => {
    if (forgePrefill) {
      setForm(f => ({
        ...f,
        word:           forgePrefill.word          || f.word,
        banglaMeaning:  forgePrefill.banglaMeaning  || '',
        pronunciation:  forgePrefill.pronunciation  || '',
        synonyms:       (forgePrefill.synonyms || []).join(', '),
        antonyms:       (forgePrefill.antonyms || []).join(', '),
        antonymMeaning: forgePrefill.antonymMeaning || '',
      }));
      clearForgePrefill();
    }
  }, [forgePrefill]);

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
          antonymMeaning: data.antonymMeaning || '',
        }));
      },
    });
  }

  function handleSubmit() {
    if (!form.word || !form.banglaMeaning) return;
    createWord({
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
      onSuccess: () => setForm({ word: '', banglaMeaning: '', pronunciation: '', synonyms: '', antonyms: '', antonymMeaning: '', notes: '', difficulty: 3, tags: '' }),
    });
  }

  const field = (label, key, placeholder, multiline = false) => (
    <div>
      <label className="text-xs text-slate-400 font-medium mb-1 block">{label}</label>
      {multiline ? (
        <textarea
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 resize-none"
          rows={2}
          placeholder={placeholder}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        />
      ) : (
        <input
          type="text"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50"
          placeholder={placeholder}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/3 p-4 space-y-4">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <span className="text-cyan-400">⚡</span> Word Forge
        </h2>

        {/* Word + AI Autofill */}
        <div>
          <label className="text-xs text-slate-400 font-medium mb-1 block">English Word *</label>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50"
              placeholder="e.g. ephemeral"
              value={form.word}
              onChange={e => setForm(f => ({ ...f, word: e.target.value }))}
            />
            <button
              onClick={handleAIAutofill}
              disabled={autofilling || !form.word.trim()}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-semibold disabled:opacity-50 transition-opacity whitespace-nowrap"
            >
              {autofilling ? '⏳' : '✨ AI Fill'}
            </button>
          </div>
        </div>

        {field('Bangla Meaning *', 'banglaMeaning', 'ক্ষণস্থায়ী')}
        {field('Pronunciation', 'pronunciation', '/ɪˈfɛmərəl/')}
        {field('Synonyms (comma-separated)', 'synonyms', 'transient, fleeting, momentary')}
        {field('Antonyms (comma-separated)', 'antonyms', 'permanent, enduring')}
        {field('Antonym Meaning (Bangla)', 'antonymMeaning', 'স্থায়ী')}
        {field('Notes', 'notes', 'Personal notes or memory hooks...', true)}
        {field('Tags (comma-separated)', 'tags', 'adjective, nature, time')}

        {/* Difficulty */}
        <div>
          <label className="text-xs text-slate-400 font-medium mb-2 block">
            Difficulty: <span className="text-cyan-400">{form.difficulty}/5</span>
          </label>
          <div className="flex gap-2">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                className={`w-9 h-9 rounded-xl text-sm font-bold border transition-all
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

        <button
          onClick={handleSubmit}
          disabled={creating || !form.word || !form.banglaMeaning}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {creating ? 'Saving...' : '+ Add to Vocabulary'}
        </button>
      </div>
    </div>
  );
}