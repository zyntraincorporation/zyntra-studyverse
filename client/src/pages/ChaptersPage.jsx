import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Search, ChevronDown, ChevronRight, RefreshCw,
  CheckCircle2, Circle, FileText, HelpCircle, ClipboardList,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '../store';
import { useTopicStore } from '../store/useTopicStore';
import { getChapters, seedChapters } from '../firebase/db';
import {
  CHAPTER_DATA, SUBJECT_DISPLAY_NAMES, SUBJECT_COLORS,
  HSC_SUBJECTS, normalizeLegacyStatus, getTopicsForChapter,
  calcChapterStudyPct, calcChapterRevisionPct,
} from '../lib/chapters-data';

// ─────────────────────────────────────────────────────────────────────────────
// Practice type visual config
// ─────────────────────────────────────────────────────────────────────────────
const PRACTICE_CONFIG = {
  cq: {
    icon: FileText,
    bg: 'bg-amber-500/10 hover:bg-amber-500/18',
    border: 'border-amber-500/25',
    text: 'text-amber-300',
    checkColor: 'text-amber-400',
  },
  mcq: {
    icon: HelpCircle,
    bg: 'bg-sky-500/10 hover:bg-sky-500/18',
    border: 'border-sky-500/25',
    text: 'text-sky-300',
    checkColor: 'text-sky-400',
  },
  mock: {
    icon: ClipboardList,
    bg: 'bg-rose-500/10 hover:bg-rose-500/18',
    border: 'border-rose-500/25',
    text: 'text-rose-300',
    checkColor: 'text-rose-400',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Mini progress bar
// ─────────────────────────────────────────────────────────────────────────────
function MiniBar({ pct, color = '#00d4ff', label, dim = false }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {label && (
        <span className={`text-[10px] shrink-0 ${dim ? 'text-white/20' : 'text-white/40'}`}>{label}</span>
      )}
      <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden min-w-[28px]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: pct > 0 ? color : 'transparent' }}
        />
      </div>
      <span className={`text-[10px] tabular-nums w-7 text-right shrink-0 ${dim ? 'text-white/20' : 'text-white/50'}`}>
        {pct}%
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single Topic Row
// ─────────────────────────────────────────────────────────────────────────────
function TopicItem({ topic, completion, onToggleStudied, onToggleRevision }) {
  const isPractice = topic.type !== 'topic';
  const cfg        = isPractice ? PRACTICE_CONFIG[topic.type] : null;

  const studied = !!completion?.studied;
  const rev1    = !!completion?.revisions?.['1'];
  const rev2    = !!completion?.revisions?.['2'];
  const rev3    = !!completion?.revisions?.['3'];

  if (isPractice) {
    const Icon = cfg.icon;
    return (
      <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${cfg.bg} ${cfg.border} transition-colors`}>
        <Icon size={13} className={cfg.text} />
        <span className={`flex-1 text-xs font-medium ${cfg.text} bangla`}>{topic.name}</span>
        <button
          onClick={() => onToggleStudied(!studied)}
          className="shrink-0 transition-transform active:scale-90"
        >
          {studied
            ? <CheckCircle2 size={15} className={cfg.checkColor} />
            : <Circle size={15} className="text-white/25 hover:text-white/50" />
          }
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.035] transition-colors group">
      <button
        onClick={() => onToggleStudied(!studied)}
        className="shrink-0 mt-0.5 transition-transform active:scale-90"
      >
        {studied
          ? <CheckCircle2 size={15} className="text-emerald-400" />
          : <Circle size={15} className="text-white/22 group-hover:text-white/45 transition-colors" />
        }
      </button>

      <span className={`flex-1 text-xs leading-relaxed bangla ${
        studied ? 'text-white/55 line-through decoration-white/20' : 'text-slate-300'
      }`}>
        {topic.name}
      </span>

      <div className="flex items-center gap-1 shrink-0">
        {[1, 2, 3].map(level => {
          const done = level === 1 ? rev1 : level === 2 ? rev2 : rev3;
          const canToggle = studied && (level === 1 || (level === 2 && rev1) || (level === 3 && rev2));
          return (
            <button
              key={level}
              onClick={() => canToggle && onToggleRevision(level, !done)}
              disabled={!canToggle}
              className={`w-6 h-6 rounded-md text-[9px] font-bold border transition-all active:scale-90
                ${done
                  ? 'bg-indigo-500/28 border-indigo-400/45 text-indigo-300'
                  : canToggle
                    ? 'bg-white/5 border-white/12 text-white/35 hover:border-indigo-500/35 hover:text-indigo-300'
                    : 'bg-transparent border-white/6 text-white/12 cursor-not-allowed'
                }`}
            >
              R{level}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter Row — reads from global store, starts listener when opened
// ─────────────────────────────────────────────────────────────────────────────
function ChapterRow({ chapter, subjectColor }) {
  const toast          = useUIStore(s => s.toast);
  const [open, setOpen] = useState(false);

  const allTopics    = getTopicsForChapter(chapter.subject, chapter.chapterNumber);
  const legacyStatus = normalizeLegacyStatus(chapter.status);

  // Global store — single source of truth
  const startListening  = useTopicStore(s => s.startListening);
  const updateTopicFn   = useTopicStore(s => s.updateTopic);
  const completionMap   = useTopicStore(s => s.topicMaps[chapter.id] ?? {});

  // Start listener once chapter panel opens
  useEffect(() => {
    if (!open || !chapter.id || !allTopics.length) return;
    startListening(chapter.id, allTopics, legacyStatus);
  }, [open, chapter.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived progress from global store — always live
  const studyPct  = calcChapterStudyPct(allTopics, completionMap);
  const rev1Pct   = calcChapterRevisionPct(allTopics, completionMap, 1);
  const rev2Pct   = calcChapterRevisionPct(allTopics, completionMap, 2);
  const rev3Pct   = calcChapterRevisionPct(allTopics, completionMap, 3);
  const doneCount = allTopics.filter(t => completionMap[t.slug]?.studied).length;
  const hasData   = Object.keys(completionMap).length > 0;
  const loading   = open && !hasData;

  // chapterMeta for revision auto-queue
  const chapterMeta = {
    userId: chapter.userId,
    subject: chapter.subject,
    chapterNumber: chapter.chapterNumber,
    status: chapter.status,
  };

  const handleToggleStudied = useCallback(async (slug, value) => {
    try {
      await updateTopicFn(chapter.id, slug, { studied: value }, value ? chapterMeta : null);
      if (!value) {
        // Clear all revisions when un-studying
        await updateTopicFn(chapter.id, slug, { revisionLevel: 1, revisionDone: false });
        await updateTopicFn(chapter.id, slug, { revisionLevel: 2, revisionDone: false });
        await updateTopicFn(chapter.id, slug, { revisionLevel: 3, revisionDone: false });
      }
    } catch {
      toast('আপডেট ব্যর্থ হয়েছে', 'error');
    }
  }, [chapter.id, updateTopicFn, toast]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleRevision = useCallback(async (slug, level, value) => {
    try {
      await updateTopicFn(chapter.id, slug, { revisionLevel: level, revisionDone: value });
    } catch {
      toast('রিভিশন আপডেট ব্যর্থ', 'error');
    }
  }, [chapter.id, updateTopicFn, toast]);

  const hasTopics = allTopics.length > 0;

  return (
    <div className="rounded-xl border border-white/[0.055] overflow-hidden">
      {/* Chapter header — progress always visible */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.035] transition-colors text-left"
      >
        {open
          ? <ChevronDown size={13} className="text-white/30 shrink-0" />
          : <ChevronRight size={13} className="text-white/30 shrink-0" />
        }
        <span className="text-[11px] text-white/35 w-5 shrink-0 text-right tabular-nums font-mono">
          {String(chapter.chapterNumber).padStart(2, '0')}
        </span>
        <span className="flex-1 text-sm text-slate-200 bangla leading-snug pr-2">
          {chapter.chapterName}
        </span>

        {hasTopics && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-white/30 tabular-nums">
              {doneCount}/{allTopics.length}
            </span>
            <div className="w-14 hidden sm:block">
              <MiniBar pct={studyPct} color={subjectColor} />
            </div>
            {rev1Pct > 0 && (
              <span className="text-[9px] text-indigo-300/60 hidden md:block">R1·{rev1Pct}%</span>
            )}
          </div>
        )}
      </button>

      {/* Expandable topic panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.05] bg-white/[0.012]">
              {hasTopics && (
                <div className="px-3 pt-2.5 pb-1.5 space-y-1.5">
                  <MiniBar pct={studyPct} color={subjectColor} label="Study" />
                  <div className="flex items-center gap-2">
                    <MiniBar pct={rev1Pct} color="#818cf8" label="R1" dim={rev1Pct === 0} />
                    <MiniBar pct={rev2Pct} color="#a78bfa" label="R2" dim={rev2Pct === 0} />
                    <MiniBar pct={rev3Pct} color="#c084fc" label="R3" dim={rev3Pct === 0} />
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex items-center gap-2 px-3 py-3 text-xs text-white/30">
                  <div className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />
                  টপিক লোড হচ্ছে…
                </div>
              ) : !hasTopics ? (
                <p className="px-3 py-3 text-xs text-white/20 bangla">এই অধ্যায়ে কোনো টপিক নেই।</p>
              ) : (
                <div className="px-2 py-2 space-y-0.5">
                  {allTopics.map(topic => (
                    <TopicItem
                      key={topic.slug}
                      topic={topic}
                      completion={completionMap[topic.slug]}
                      onToggleStudied={(val) => handleToggleStudied(topic.slug, val)}
                      onToggleRevision={(level, val) => handleToggleRevision(topic.slug, level, val)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subject Section — starts all chapter listeners on open
// ─────────────────────────────────────────────────────────────────────────────
function SubjectSection({ subject, chapters }) {
  const [open, setOpen] = useState(false);
  const colors = SUBJECT_COLORS[subject] || SUBJECT_COLORS.Physics1;

  // Global store selectors
  const startListening = useTopicStore(s => s.startListening);
  const topicMaps      = useTopicStore(s => s.topicMaps);

  // When subject opens → pre-start listeners for ALL chapters in this subject
  useEffect(() => {
    if (!open) return;
    chapters.forEach(ch => {
      const allTopics = getTopicsForChapter(ch.subject, ch.chapterNumber);
      if (allTopics.length > 0) {
        startListening(ch.id, allTopics, normalizeLegacyStatus(ch.status));
      }
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live subject progress from store
  let totalTopics = 0, doneTopics = 0;
  chapters.forEach(ch => {
    const allTopics = getTopicsForChapter(ch.subject, ch.chapterNumber);
    const map = topicMaps[ch.id] || {};
    const studyTopics = allTopics.filter(t => t.type === 'topic');
    totalTopics += studyTopics.length;
    doneTopics  += studyTopics.filter(t => map[t.slug]?.studied).length;
  });
  // Fall back to legacy chapter-level count if store has no data yet
  const hasStoreData = chapters.some(ch => Object.keys(topicMaps[ch.id] || {}).length > 0);
  const legacyCompleted = chapters.filter(ch => {
    const s = normalizeLegacyStatus(ch.status);
    return s !== 'not_started' && s !== 'in_progress';
  }).length;

  const pct = hasStoreData
    ? (totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0)
    : (chapters.length ? Math.round((legacyCompleted / chapters.length) * 100) : 0);

  const countLabel = hasStoreData
    ? `${doneTopics}/${totalTopics} টপিক`
    : `${legacyCompleted}/${chapters.length} অধ্যায়`;

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${colors.bg} ${colors.border} overflow-hidden`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        {open
          ? <ChevronDown size={15} className="text-white/30 shrink-0" />
          : <ChevronRight size={15} className="text-white/30 shrink-0" />
        }
        <span className={`font-semibold flex-1 bangla text-sm ${colors.text}`}>
          {SUBJECT_DISPLAY_NAMES[subject] || subject}
        </span>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[11px] text-white/40">{countLabel}</span>
          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ backgroundColor: colors.hex }}
            />
          </div>
          <span className="text-xs text-white/50 w-8 text-right tabular-nums">{pct}%</span>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-white/[0.06]"
          >
            <div className="px-2 py-2 space-y-1.5">
              {chapters.map(ch => (
                <ChapterRow key={ch.id} chapter={ch} subjectColor={colors.hex} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function ChaptersPage() {
  const user  = useAuthStore(s => s.user);
  const toast = useUIStore(s => s.toast);
  const [chapters, setChapters] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [seeding,  setSeeding]  = useState(false);
  const [search,   setSearch]   = useState('');

  // Overall live progress from store
  const topicMaps = useTopicStore(s => s.topicMaps);
  let overallTotal = 0, overallDone = 0;
  chapters.forEach(ch => {
    const allTopics = getTopicsForChapter(ch.subject, ch.chapterNumber);
    const map = topicMaps[ch.id] || {};
    const studyTopics = allTopics.filter(t => t.type === 'topic');
    overallTotal += studyTopics.length;
    overallDone  += studyTopics.filter(t => map[t.slug]?.studied).length;
  });
  const hasStoreData = chapters.some(ch => Object.keys(topicMaps[ch.id] || {}).length > 0);
  const legacyDone = chapters.filter(ch => {
    const s = normalizeLegacyStatus(ch.status);
    return s !== 'not_started' && s !== 'in_progress';
  }).length;
  const totalPct = hasStoreData
    ? (overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0)
    : (chapters.length ? Math.round((legacyDone / chapters.length) * 100) : 0);

  const load = useCallback(() => {
    if (!user?.uid) return;
    setLoading(true);
    setError(null);
    getChapters(user.uid)
      .then(ch => { setChapters(ch || []); setLoading(false); })
      .catch(err => {
        console.error('[ChaptersPage]', err);
        setError('অধ্যায় লোড করতে সমস্যা হয়েছে।');
        setLoading(false);
      });
  }, [user?.uid]);

  useEffect(() => { load(); }, [load]);

  const handleSeed = async () => {
    if (!user?.uid) return;
    setSeeding(true);
    try {
      await seedChapters(user.uid, CHAPTER_DATA);
      const chs = await getChapters(user.uid);
      setChapters(chs || []);
      if (chs?.length) { toast('সকল অধ্যায় লোড হয়েছে! 🎉', 'success'); setError(null); }
    } catch (err) {
      toast('অধ্যায় লোড করতে ব্যর্থ', 'error');
      setError(err.message || 'Error');
    } finally { setSeeding(false); }
  };

  const filtered = chapters.filter(ch => {
    const q = search.toLowerCase();
    return !search
      || ch.chapterName?.toLowerCase().includes(q)
      || (SUBJECT_DISPLAY_NAMES[ch.subject] || ch.subject).toLowerCase().includes(q);
  });

  const bySubject = HSC_SUBJECTS.reduce((acc, s) => {
    const subs = filtered.filter(ch => ch.subject === s);
    if (subs.length) acc[s] = subs;
    return acc;
  }, {});

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5 pb-24">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen size={20} className="text-cyan-400" />
            অধ্যায় অগ্রগতি
          </h2>
          <p className="text-sm text-white/35 mt-1 bangla">
            {hasStoreData
              ? `${overallDone}/${overallTotal} টপিক সম্পূর্ণ`
              : `${legacyDone}/${chapters.length} অধ্যায়`
            }
            · বিষয়ে ক্লিক করে টপিক দেখুন
          </p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/5 transition-all shrink-0"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Overall progress bar — live from store */}
      <div className="rounded-xl bg-white/[0.025] border border-white/[0.07] p-4 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-white/40 bangla">মোট অগ্রগতি</span>
          <span className="text-white font-semibold tabular-nums">{totalPct}%</span>
        </div>
        <div className="h-2 bg-white/6 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${totalPct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
          />
        </div>
        <p className="text-[10px] text-white/20 bangla">
          💡 বিষয়ে ক্লিক → অধ্যায়ে ক্লিক → টপিক ও CQ/MCQ/Mock ট্র্যাক করুন
        </p>
      </div>

      {/* Search — fixed contrast */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="অধ্যায় বা বিষয় খুঁজুন…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-800/70 border border-slate-600/50 rounded-xl pl-9 pr-4 py-2.5
                     text-slate-100 text-sm placeholder:text-slate-500
                     focus:outline-none focus:border-cyan-400/60 focus:bg-slate-800/90
                     transition-all bangla"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-white/40 bangla">অধ্যায় লোড হচ্ছে…</p>
        </div>

      ) : error ? (
        <div className="text-center py-10 px-4 space-y-4 rounded-2xl bg-red-500/8 border border-red-500/15">
          <p className="text-red-400 font-semibold bangla text-sm">লোড করতে সমস্যা হয়েছে</p>
          <p className="text-xs text-white/40 bangla">{error}</p>
          <button onClick={load}
            className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/20
                       text-xs font-medium inline-flex items-center gap-2 transition-all bangla"
          >
            <RefreshCw size={13} /> পুনরায় চেষ্টা
          </button>
        </div>

      ) : chapters.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <BookOpen size={44} className="mx-auto text-white/15" />
          <div>
            <p className="text-white font-semibold bangla">কোনো অধ্যায় নেই</p>
            <p className="text-sm text-white/30 mt-1 bangla">সকল বিষয়ের অধ্যায় লোড করুন</p>
          </div>
          <button onClick={handleSeed} disabled={seeding}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white
                       text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2 shadow-lg shadow-cyan-500/20"
          >
            {seeding
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>লোড হচ্ছে…</span></>
              : <span>📚 সকল অধ্যায় লোড করুন</span>
            }
          </button>
        </div>

      ) : Object.keys(bySubject).length === 0 ? (
        <div className="text-center py-8 text-white/25 bangla">কোনো ফলাফল নেই।</div>

      ) : (
        <div className="space-y-3">
          {Object.entries(bySubject).map(([subj, chs]) => (
            <SubjectSection key={subj} subject={subj} chapters={chs} />
          ))}
        </div>
      )}
    </div>
  );
}