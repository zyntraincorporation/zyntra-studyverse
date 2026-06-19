import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { useLexiLookup } from '../../hooks/vocabulary/useAIAssistant';

// Detect Bangla from input text
function detectLang(input) {
  return /[\u0980-\u09FF]/.test(input) ? 'bn' : 'en';
}

function LangBadge({ lang }) {
  return (
    <span className={`px-2 py-0.5 rounded-lg text-[10px] border font-semibold ${
      lang === 'bn'
        ? 'bg-green-500/15 border-green-500/30 text-green-400'
        : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
    }`}>
      {lang === 'bn' ? '🇧🇩 BN→EN' : '🇬🇧 EN→BN'}
    </span>
  );
}

export default function AIAssistant() {
  const { lexiOpen, toggleLexi, lexiResult, lexiLoading, setForgePrefill } = useStore();
  const [input, setInput] = useState('');
  const { mutate: lookup } = useLexiLookup();

  const detectedLang = detectLang(input);

  function handleLookup() {
    if (!input.trim()) return;
    lookup({ input: input.trim() });
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
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">🤖 Lexi Assistant</h3>
                {input.trim() && <LangBadge lang={detectedLang} />}
              </div>

              {/* Input row */}
              <div className="flex gap-2 mb-3">
                <input
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50"
                  placeholder="Type English or বাংলা…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLookup()}
                />
                <button
                  onClick={handleLookup}
                  disabled={lexiLoading || !input.trim()}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {lexiLoading ? '⏳' : 'Ask'}
                </button>
              </div>

              {/* Result */}
              <AnimatePresence>
                {lexiResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2 text-sm"
                  >
                    {/* Word + pronunciation */}
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-white font-bold text-lg">{lexiResult.word}</span>
                      {lexiResult.pronunciation && (
                        <span className="text-slate-500 text-xs">/{lexiResult.pronunciation}/</span>
                      )}
                      {lexiResult.partOfSpeech && (
                        <span className="text-purple-400 text-[10px] bg-purple-500/10 border border-purple-500/20 rounded-md px-1.5 py-0.5">
                          {lexiResult.partOfSpeech}
                        </span>
                      )}
                    </div>

                    {/* Bangla meaning — always prominent */}
                    {lexiResult.banglaMeaning && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">
                        <p className="text-[10px] text-green-400 font-semibold mb-0.5">বাংলা অর্থ</p>
                        <p className="text-white text-sm">{lexiResult.banglaMeaning}</p>
                      </div>
                    )}

                    {/* English meaning */}
                    {lexiResult.englishMeaning && (
                      <p className="text-slate-300 text-xs leading-relaxed">{lexiResult.englishMeaning}</p>
                    )}

                    {/* Example */}
                    {lexiResult.example && (
                      <p className="text-slate-500 text-xs border-l-2 border-cyan-500/30 pl-2.5 italic leading-relaxed">
                        {lexiResult.example}
                      </p>
                    )}

                    {/* Synonyms & Antonyms */}
                    <div className="flex gap-3 flex-wrap">
                      {lexiResult.synonyms?.length > 0 && (
                        <p className="text-xs text-slate-400">
                          <span className="text-cyan-500 font-medium">Syn: </span>
                          {lexiResult.synonyms.join(', ')}
                        </p>
                      )}
                      {lexiResult.antonyms?.length > 0 && (
                        <p className="text-xs text-slate-400">
                          <span className="text-red-400 font-medium">Ant: </span>
                          {lexiResult.antonyms.join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Save button */}
                    <button
                      onClick={handleSaveToForge}
                      className="w-full mt-1 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/30 transition-colors"
                    >
                      + Save to Vocabulary
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Loading state */}
              {lexiLoading && (
                <div className="flex items-center gap-2 text-slate-500 text-xs py-2">
                  <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  Looking up…
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}