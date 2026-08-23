import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import { useCreateWord } from '../../hooks/vocabulary/useVocabularyWords';
import { useAIAutofill } from '../../hooks/vocabulary/useAIAssistant';

const DIFFICULTIES = [1, 2, 3, 4, 5];

export default function WordForge() {
  const { forgePrefill, clearForgePrefill } = useStore();
  const { mutate: createWord, isPending: creating } = useCreateWord();
  const { mutate: aiAutofill, isPending: autofilling } = useAIAutofill();

  const [form, setForm] = useState({
    word: '',
    partOfSpeech: '',
    englishDefinition: '',
    banglaMeaning: '',
    banglaDefinition: '',
    pronunciation: '',
    exampleSentence: '',
    synonyms: '',
    antonyms: '',
    antonymMeaning: '',
    notes: '',
    difficulty: 3,
    tags: '',
  });

  useEffect(() => {
    if (forgePrefill) {
      setForm(f => ({
        ...f,
        word:              forgePrefill.word              || f.word,
        partOfSpeech:      forgePrefill.partOfSpeech      || forgePrefill.pos || f.partOfSpeech,
        englishDefinition: forgePrefill.englishDefinition || forgePrefill.englishMeaning || forgePrefill.definition || f.englishDefinition,
        banglaMeaning:     forgePrefill.banglaMeaning     || forgePrefill.banglaDefinition || forgePrefill.bnMeaning || f.banglaMeaning,
        banglaDefinition:  forgePrefill.banglaDefinition  || forgePrefill.banglaMeaning    || forgePrefill.bnMeaning || f.banglaDefinition,
        pronunciation:     forgePrefill.pronunciation     || f.pronunciation,
        exampleSentence:   forgePrefill.exampleSentence   || forgePrefill.example || f.exampleSentence,
        synonyms:          Array.isArray(forgePrefill.synonyms) ? forgePrefill.synonyms.join(', ') : (forgePrefill.synonyms || f.synonyms),
        antonyms:          Array.isArray(forgePrefill.antonyms) ? forgePrefill.antonyms.join(', ') : (forgePrefill.antonyms || f.antonyms),
        antonymMeaning:    forgePrefill.antonymMeaning    || f.antonymMeaning,
      }));
      clearForgePrefill();
    }
  }, [forgePrefill]);

  function handleAIAutofill() {
    if (!form.word.trim()) return;
    try {
      aiAutofill(form.word, {
        onSuccess: (data) => {
          if (!data) return;
          setForm(f => ({
            ...f,
            word:              data.word              || f.word,
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
        onError: () => {
          console.warn('[WordForge] AI autofill unavailable');
        },
      });
    } catch (err) {
      console.warn('[WordForge] AI autofill error:', err);
    }
  }

  function handleSubmit() {
    if (!form.word.trim()) return;
    const finalBanglaMeaning = (form.banglaMeaning || form.banglaDefinition || '').trim();
    const finalBanglaDefinition = (form.banglaDefinition || form.banglaMeaning || '').trim();
    if (!finalBanglaMeaning && !finalBanglaDefinition) return;

    createWord({
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
      onSuccess: () => setForm({
        word: '', partOfSpeech: '', englishDefinition: '', banglaMeaning: '', banglaDefinition: '',
        pronunciation: '', exampleSentence: '', synonyms: '', antonyms: '', antonymMeaning: '',
        notes: '', difficulty: 3, tags: '',
      }),
    });
  }

  const field = (label, key, placeholder, multiline = false, helper = '') => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-slate-400 font-medium block">{label}</label>
        {helper && <span className="text-[10px] text-slate-500">{helper}</span>}
      </div>
      {multiline ? (
        <textarea
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 resize-none transition-colors"
          rows={2}
          placeholder={placeholder}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        />
      ) : (
        <input
          type="text"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 transition-colors"
          placeholder={placeholder}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        />
      )}
    </div>
  );

  const canSave = !!form.word.trim() && (!!form.banglaMeaning.trim() || !!form.banglaDefinition.trim());

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/3 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <span className="text-cyan-400">⚡</span> Word Forge
          </h2>
          <span className="text-[11px] text-slate-400">Add & Master New Words</span>
        </div>

        {/* Word + AI Autofill */}
        <div>
          <label className="text-xs text-slate-400 font-medium mb-1 block">English Word *</label>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 font-medium"
              placeholder="e.g. Meticulous"
              value={form.word}
              onChange={e => setForm(f => ({ ...f, word: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAIAutofill(); } }}
            />
            <button
              onClick={handleAIAutofill}
              disabled={autofilling || !form.word.trim()}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 text-xs font-semibold disabled:opacity-50 transition-all whitespace-nowrap shadow-sm shadow-cyan-900/20"
            >
              {autofilling ? '⏳ Filling…' : '✨ AI Fill'}
            </button>
          </div>
        </div>

        {/* Part of Speech & Pronunciation Row */}
        <div className="grid grid-cols-2 gap-3">
          {field('Part of Speech', 'partOfSpeech', 'e.g. Adjective / Verb / Noun')}
          {field('Pronunciation', 'pronunciation', '/mɪˈtɪkjʊləs/')}
        </div>

        {/* English Definition */}
        {field('English Definition', 'englishDefinition', 'Showing great attention to detail; very careful and precise.', true)}

        {/* Bangla Definition (Detailed) & Bangla Meaning (Short) */}
        <div className="space-y-3 bg-gradient-to-br from-emerald-950/20 to-teal-950/20 border border-emerald-500/20 rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
            <span>🇧🇩</span>
            <span>Bangla Intelligence</span>
          </div>

          {field('বাংলা অর্থ (Short Meaning) *', 'banglaMeaning', 'খুঁতখুঁতে / অত্যন্ত যত্নশীল', false, 'সহজ একক অর্থ')}
          {field('বাংলা Definition (Detailed Explanation) *', 'banglaDefinition', 'খুঁটিনাটি বিষয়ের প্রতি অত্যন্ত যত্নশীল; সূক্ষ্মভাবে ও নিখুঁতভাবে কাজ করে এমন।', true, 'পরীক্ষা ও গভীর অনুধাবনের জন্য')}
        </div>

        {/* Example Sentence */}
        {field('Example Sentence', 'exampleSentence', 'She is meticulous about her presentation and research work.', true)}

        {/* Synonyms & Antonyms */}
        {field('Synonyms (comma-separated)', 'synonyms', 'Careful, Thorough, Precise, Diligent')}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {field('Antonyms (comma-separated)', 'antonyms', 'Careless, Sloppy, Negligent')}
          {field('Antonym Meaning (Bangla)', 'antonymMeaning', 'অযত্নশীল বা অসাবধান')}
        </div>

        {/* Notes & Tags */}
        {field('Notes', 'notes', 'Memory hooks, root words, mnemonic hints...', true)}
        {field('Tags (comma-separated)', 'tags', 'HSC, BUET, Important, Adjective')}

        {/* Difficulty */}
        <div>
          <label className="text-xs text-slate-400 font-medium mb-2 block">
            Difficulty: <span className="text-cyan-400 font-bold">{form.difficulty}/5</span>
          </label>
          <div className="flex gap-2">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                className={`w-9 h-9 rounded-xl text-sm font-bold border transition-all
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

        <button
          onClick={handleSubmit}
          disabled={creating || !canSave}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-all shadow-lg shadow-purple-900/30"
        >
          {creating ? 'Saving Word…' : '+ Add to Vocabulary'}
        </button>
      </div>
    </div>
  );
}