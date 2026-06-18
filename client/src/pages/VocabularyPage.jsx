import { useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import QuickRecallStrip from '../components/vocabulary/QuickRecallStrip';
import WordForge from '../components/vocabulary/WordForge';
import RecallArena from '../components/vocabulary/RecallArena';
import SmartRevision from '../components/vocabulary/SmartRevision';
import WordArchive from '../components/vocabulary/WordArchive';
import VocabularyAnalytics from '../components/vocabulary/VocabularyAnalytics';
import AIAssistant from '../components/vocabulary/AIAssistant';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { useYesterdayWords } from '../hooks/vocabulary/useVocabularyWords';

const TABS = [
  { id: 'forge',     label: 'Word Forge',       icon: '⚡' },
  { id: 'recall',    label: 'Recall Arena',      icon: '🎯' },
  { id: 'revision',  label: 'Smart Revision',    icon: '🔄' },
  { id: 'archive',   label: 'Word Archive',      icon: '📚' },
  { id: 'analytics', label: 'Analytics',         icon: '📊' },
];

export default function VocabularyPage() {
  const { activeVocabModule, setActiveVocabModule, setRecallWords } = useStore();
  const { data: yesterdayWords = [] } = useYesterdayWords();

  useEffect(() => {
    if (yesterdayWords.length) setRecallWords(yesterdayWords);
  }, [yesterdayWords]);

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#080b14] text-white">
        {/* Hero Header */}
        <div className="relative px-4 pt-6 pb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-transparent to-purple-900/20 pointer-events-none" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Vocabulary Intelligence
          </h1>
          <p className="text-slate-400 text-sm mt-1">Build your lexicon. Master every word.</p>
        </div>

        {/* Quick Recall Strip — yesterday's words */}
        {yesterdayWords.length > 0 && <QuickRecallStrip />}

        {/* Module Tabs */}
        <div className="flex gap-1 px-4 mt-2 overflow-x-auto no-scrollbar pb-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveVocabModule(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                transition-all duration-200
                ${activeVocabModule === tab.id
                  ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 text-cyan-300'
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Module Content */}
        <div className="px-4 pb-24 mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeVocabModule}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
            >
              {activeVocabModule === 'forge'     && <WordForge />}
              {activeVocabModule === 'recall'    && <RecallArena />}
              {activeVocabModule === 'revision'  && <SmartRevision />}
              {activeVocabModule === 'archive'   && <WordArchive />}
              {activeVocabModule === 'analytics' && <VocabularyAnalytics />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Floating AI Lexi Assistant */}
        <AIAssistant />
      </div>
    </AppLayout>
  );
}