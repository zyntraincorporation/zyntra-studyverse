import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { useLexiLookup } from '../../hooks/vocabulary/useAIAssistant';

export default function AIAssistant() {
  const { lexiOpen, toggleLexi, lexiResult, lexiLoading, setForgePrefill } = useStore();
  const [input, setInput] = useState('');
  const [lang, setLang] = useState('en');
  const { mutate: lookup } = useLexiLookup();

  function handleLookup() {
    if (!input.trim()) return;
    lookup({ input: input.trim(), language: lang });
  }

  function handleSaveToForge() {
    if (!lexiResult) return;
    setForgePrefill(lexiResult);
  }

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={toggleLexi}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 shadow-lg shadow-purple-900/50 flex items-center justify-center text-white text-xl z-50"
      >
        {lexiOpen ? '✕' : '🤖'}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {lexiOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-36 right-4 left-4 z-50 max-w-md mx-auto"
          >
            <div className="rounded-2xl border border-white/10 bg-[#0d1120]/95 backdrop-blur-xl p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">🤖 Lexi Assistant</h3>
                <div className="flex gap-1">
                  {['en', 'bn'].map(l => (
                    <button key={l} onClick={() => setLang(l)}
                      className={`px-2 py-0.5 rounded-lg text-xs border transition-all
                        ${lang === l
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                          : 'bg-white/5 border-white/10 text-slate-500'
                        }`}>
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="flex gap-2 mb-3">
                <input
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50"
                  placeholder="Enter word or phrase..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLookup()}
                />
                <button onClick={handleLookup} disabled={lexiLoading}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 text-white text-sm font-semibold disabled:opacity-50">
                  {lexiLoading ? '...' : 'Ask'}
                </button>
              </div>

              {/* Result */}
              <AnimatePresence>
                {lexiResult && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="space-y-2 text-sm">
                    <div className="flex items-baseline gap-2">
                      <span className="text-white font-bold text-lg">{lexiResult.word}</span>
                      <span className="text-slate-500 text-xs">/{lexiResult.pronunciation}/</span>
                    </div>
                    <p className="text-purple-300">{lexiResult.banglaMeaning}</p>
                    {lexiResult.synonyms?.length > 0 && (
                      <p className="text-slate-400 text-xs">
                        <span className="text-cyan-500">Syn: </span>
                        {lexiResult.synonyms.join(', ')}
                      </p>
                    )}
                    {lexiResult.antonyms?.length > 0 && (
                      <p className="text-slate-400 text-xs">
                        <span className="text-red-500">Ant: </span>
                        {lexiResult.antonyms.join(', ')}
                      </p>
                    )}
                    {lexiResult.sentences?.map((s, i) => (
                      <p key={i} className="text-slate-500 text-xs border-l-2 border-white/10 pl-2 italic">{s}</p>
                    ))}
                    <button onClick={handleSaveToForge}
                      className="w-full mt-2 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                      + Save to Vocabulary
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}