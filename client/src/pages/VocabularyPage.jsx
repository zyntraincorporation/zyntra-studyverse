import { useEffect } from 'react';
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
import { useAuthStore } from '../store';

const TABS = [
  { id: 'forge',     label: 'Word Forge',    icon: '⚡' },
  { id: 'recall',    label: 'Recall Arena',  icon: '🎯' },
  { id: 'revision',  label: 'Smart Revision',icon: '🔄' },
  { id: 'archive',   label: 'Word Archive',  icon: '📚' },
  { id: 'analytics', label: 'Analytics',     icon: '📊' },
];

// ── Loading Skeleton ──────────────────────────────────────────────────────────
function VocabSkeleton() {
  return (
    <div className="px-4 pt-4 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-white/5 rounded-xl" />
      <div className="flex gap-2">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-9 w-24 bg-white/5 rounded-xl flex-shrink-0" />
        ))}
      </div>
      <div className="h-40 bg-white/5 rounded-2xl" />
      <div className="h-32 bg-white/5 rounded-2xl" />
    </div>
  );
}

// ── Error State ───────────────────────────────────────────────────────────────
function VocabError({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h3 className="text-white font-semibold text-lg mb-2">Could not load vocabulary</h3>
      <p className="text-slate-500 text-sm mb-6">
        There was a problem connecting to the database. Check your internet connection and try again.
      </p>
      <button
        onClick={onRetry}
        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-semibold"
      >
        Retry
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function VocabularyPage() {
  const uid = useAuthStore(s => s.user?.uid);
  const { activeVocabModule, setActiveVocabModule, setRecallWords } = useStore();

  const {
    data: yesterdayWords = [],
    isLoading,
    isError,
    refetch,
  } = useYesterdayWords();

  useEffect(() => {
    if (yesterdayWords.length) setRecallWords(yesterdayWords);
  }, [yesterdayWords]);

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (!uid) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
        Please log in to access vocabulary.
      </div>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) return <VocabSkeleton />;

  // ── Error state ───────────────────────────────────────────────────────────
  if (isError) return <VocabError onRetry={refetch} />;

  return (
    <div className="bg-[#080b14] text-white min-h-full pb-24">
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
      <div className="flex gap-1.5 px-4 mt-2 overflow-x-auto scrollbar-none pb-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveVocabModule(tab.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
              transition-all duration-200
              ${activeVocabModule === tab.id
                ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 text-cyan-300'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
          >
            <span>{tab.icon}</span>
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Module Content */}
      <div className="px-4 mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeVocabModule}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22 }}
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
  );
}