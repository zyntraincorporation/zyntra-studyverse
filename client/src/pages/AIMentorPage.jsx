import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, BarChart2, MessageSquare, History, RefreshCw, Zap, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store';
import { getBSTDateString } from '../lib/bst';
import {
  buildMentorContext, getCachedAnalysis, generateAnalysis,
  getChatUsage, getChatHistory, getChatHistoryDates,
} from '../lib/mentorApi';
import { MentorAnalysisCard } from '../components/ai/MentorAnalysisCard';
import { MentorChat }         from '../components/ai/MentorChat';
import { ChatHistoryPanel, HistoryChatView } from '../components/ai/ChatHistoryPanel';

// ─────────────────────────────────────────────────────────────────────────────
// AIMentorPage — Personal AI Mentor for BUET preparation
// Three tabs: Analysis | Chat | History
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'analysis', label: 'Analysis',  Icon: BarChart2     },
  { id: 'chat',     label: 'Chat',      Icon: MessageSquare },
  { id: 'history',  label: 'History',   Icon: History       },
];

// ── Subject Progress Mini Bar ─────────────────────────────────────────────────
function SubjectBar({ name, pct, color = 'cyan' }) {
  const colors = {
    cyan:   'from-cyan-500 to-blue-500',
    amber:  'from-amber-500 to-orange-500',
    violet: 'from-violet-500 to-purple-500',
    green:  'from-emerald-500 to-teal-500',
  };
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[11px] text-slate-400">{name}</span>
        <span className="text-[11px] text-slate-500">{pct}%</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${colors[color] || colors.cyan}`}
        />
      </div>
    </div>
  );
}

// ── Context Summary Card ──────────────────────────────────────────────────────
function ContextSummaryCard({ context, loading }) {
  if (loading || !context) {
    return (
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    );
  }

  const { subjects = {}, streak = 0, vocabStats = {}, daysToButExam } = context;
  const physics  = subjects['Physics']   || {};
  const chem     = subjects['Chemistry'] || {};
  const math     = subjects['HigherMath']|| {};

  const stats = [
    { label: 'Streak',        value: `${streak}d`,          sub: 'consecutive',       color: 'text-amber-400'  },
    { label: 'Vocab Total',   value: vocabStats.total || 0, sub: `${vocabStats.mastered||0} mastered`, color: 'text-violet-400' },
    { label: 'BUET Deadline', value: daysToButExam || '—',  sub: 'days remaining',    color: 'text-cyan-400'   },
    { label: 'Due Review',    value: vocabStats.due || 0,   sub: 'vocab cards',       color: 'text-rose-400'   },
  ];

  return (
    <div className="mb-4 space-y-3">
      {/* Mini stat pills */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map(s => (
          <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5 text-center">
            <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* PCM progress bars */}
      <div className="bg-white/[0.025] border border-white/[0.06] rounded-xl p-3 space-y-2.5">
        <p className="text-[10px] text-slate-600 uppercase tracking-wide font-medium mb-2">BUET Core (PCM)</p>
        <SubjectBar name="Physics"    pct={physics.pct  || 0} color="cyan"   />
        <SubjectBar name="Chemistry"  pct={chem.pct     || 0} color="amber"  />
        <SubjectBar name="HigherMath" pct={math.pct     || 0} color="violet" />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AIMentorPage() {
  const { user } = useAuthStore();
  const uid      = user?.uid;

  const [activeTab,       setActiveTab]       = useState('analysis');
  const [context,         setContext]         = useState(null);
  const [contextLoading,  setContextLoading]  = useState(true);
  const [analysis,        setAnalysis]        = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [isRefreshing,    setIsRefreshing]    = useState(false);
  const [usage,           setUsage]           = useState(null);
  const [historyDates,    setHistoryDates]    = useState([]);
  const [historyLoading,  setHistoryLoading]  = useState(false);
  const [selectedDate,    setSelectedDate]    = useState(null);
  const [historyMessages, setHistoryMessages] = useState([]);
  const [historyMsgLoad,  setHistoryMsgLoad]  = useState(false);
  const [pageError,       setPageError]       = useState('');
  const [todayMessages,   setTodayMessages]   = useState([]);

  const today = getBSTDateString();

  // ── Load context (Firestore data) ─────────────────────────────────────────
  const loadContext = useCallback(async () => {
    if (!uid) return;
    try {
      setContextLoading(true);
      const ctx = await buildMentorContext(uid);
      setContext(ctx);
    } catch (e) {
      console.error('Context load failed:', e);
    } finally {
      setContextLoading(false);
    }
  }, [uid]);

  // ── Load cached analysis ──────────────────────────────────────────────────
  const loadAnalysis = useCallback(async () => {
    if (!uid) return;
    try {
      setAnalysisLoading(true);
      const data = await getCachedAnalysis(uid);
      setAnalysis(data.analysis || null);
    } catch (e) {
      console.error('Analysis load failed:', e);
    } finally {
      setAnalysisLoading(false);
    }
  }, [uid]);

  // ── Load chat usage ───────────────────────────────────────────────────────
  const loadUsage = useCallback(async () => {
    if (!uid) return;
    try {
      const data = await getChatUsage(uid);
      setUsage(data);
    } catch (e) {
      console.error('Usage load failed:', e);
    }
  }, [uid]);

  // ── Load history dates ────────────────────────────────────────────────────
  const loadHistoryDates = useCallback(async () => {
    if (!uid) return;
    try {
      setHistoryLoading(true);
      const data = await getChatHistoryDates(uid);
      setHistoryDates(data.dates || []);
    } catch (e) {
      console.error('History dates load failed:', e);
    } finally {
      setHistoryLoading(false);
    }
  }, [uid]);

  // ── Load specific day's chat ──────────────────────────────────────────────
  const loadHistoryDay = useCallback(async (date) => {
    if (!uid) return;
    setSelectedDate(date);
    setHistoryMsgLoad(true);
    try {
      const data = await getChatHistory(uid, date);
      setHistoryMessages(data.messages || []);
    } catch (e) {
      console.error('History load failed:', e);
    } finally {
      setHistoryMsgLoad(false);
    }
  }, [uid]);

  // ── Generate/refresh analysis (MANUAL ONLY) ───────────────────────────────
  const handleRefreshAnalysis = useCallback(async (force = false) => {
    if (!uid || isRefreshing) return;
    setPageError('');
    setIsRefreshing(true);
    try {
      const data = await generateAnalysis(uid, force);
      setAnalysis(data.analysis);
    } catch (e) {
      console.error('Analysis generation failed:', e);
      setPageError(e.message || 'Analysis generate করতে সমস্যা হয়েছে। পরে আবার চেষ্টা করো।');
    } finally {
      setIsRefreshing(false);
    }
  }, [uid, isRefreshing]);

  // ── Tab switch side effects ───────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'history' && historyDates.length === 0) {
      loadHistoryDates();
    }
  }, [activeTab, historyDates.length, loadHistoryDates]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (uid) {
      loadContext();
      loadAnalysis();
      loadUsage();
      getChatHistory(uid, today)
        .then(d => setTodayMessages(d.messages || []))
        .catch(() => {});
    }
  }, [uid, today, loadContext, loadAnalysis, loadUsage]);

  return (
    <div className="min-h-screen bg-[#080b14] text-white flex flex-col">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-4 border-b border-white/[0.06]">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/25 to-blue-600/25
                              border border-cyan-500/25 flex items-center justify-center">
                <Bot size={18} className="text-cyan-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-none">AI Mentor</h1>
                <p className="text-xs text-slate-500 mt-0.5">BUET preparation · Personal guide</p>
              </div>
            </div>

            {/* Quick action button for analysis tab */}
            {activeTab === 'analysis' && analysis && (
              <button
                onClick={() => handleRefreshAnalysis(true)}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08]
                           text-xs text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-all disabled:opacity-40"
              >
                <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                {isRefreshing ? 'Analyzing…' : 'Refresh'}
              </button>
            )}
          </div>

          {/* Error banner */}
          <AnimatePresence>
            {pageError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex items-center gap-2 text-xs text-amber-400
                           bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5"
              >
                <AlertTriangle size={14} className="shrink-0" />
                <span>{pageError}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.06] px-4">
        <div className="max-w-2xl mx-auto flex gap-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 transition-all
                ${activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              <tab.Icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-2xl mx-auto h-full">

          {/* ── ANALYSIS TAB ──────────────────────────────────────────────── */}
          {activeTab === 'analysis' && (
            <div className="h-full overflow-y-auto px-4 py-4 space-y-4">
              <ContextSummaryCard context={context} loading={contextLoading} />
              <MentorAnalysisCard
                analysis={analysis}
                loading={analysisLoading && !analysis}
                onRefresh={() => handleRefreshAnalysis(true)}
                isRefreshing={isRefreshing}
              />
            </div>
          )}

          {/* ── CHAT TAB ──────────────────────────────────────────────────── */}
          {activeTab === 'chat' && (
            <div className="h-full flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
              <MentorChat
                userId={uid}
                usage={usage}
                onUsageUpdate={setUsage}
                fullContext={context}
                todayAnalysisText={analysis?.text || null}
                initialMessages={todayMessages}
              />
            </div>
          )}

          {/* ── HISTORY TAB ───────────────────────────────────────────────── */}
          {activeTab === 'history' && (
            <div className="h-full flex gap-0 overflow-hidden" style={{ height: 'calc(100vh - 140px)' }}>
              {/* Sidebar: date list */}
              <div className="w-64 border-r border-white/[0.06] overflow-y-auto px-3 py-4 shrink-0">
                <ChatHistoryPanel
                  dates={historyDates}
                  selectedDate={selectedDate}
                  onSelectDate={loadHistoryDay}
                  loading={historyLoading}
                />
              </div>

              {/* Main: selected day's chat */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {selectedDate ? (
                  <HistoryChatView
                    messages={historyMessages}
                    date={selectedDate}
                    loading={historyMsgLoad}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <History size={28} className="text-slate-700 mb-3" />
                    <p className="text-slate-500 text-sm">কোনো দিন select করো</p>
                    <p className="text-slate-700 text-xs mt-1">Left side থেকে একটা session বেছে নাও।</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
