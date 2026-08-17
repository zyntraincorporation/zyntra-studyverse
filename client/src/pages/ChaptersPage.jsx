import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Search, ChevronDown, ChevronRight, RefreshCw,
  CheckCircle2, Circle, FileText, HelpCircle, ClipboardList,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '../store';
import { getChapters, updateChapter, seedChapters } from '../firebase/db';
import {
  CHAPTER_DATA, SUBJECT_DISPLAY_NAMES, SUBJECT_COLORS,
  HSC_SUBJECTS, normalizeLegacyStatus, getTopicsForChapter,
  calcChapterStudyPct, calcChapterRevisionPct,
} from '../lib/chapters-data';
import { useTopicProgress } from '../hooks/useTopicProgress';

// ─────────────────────────────────────────────────────────────────────────────
// Topic type config — visual treatment for CQ / MCQ / Mock
// ─────────────────────────────────────────────────────────────────────────────
const PRACTICE_CONFIG = {
  cq: {
    label: 'CQ',
    icon: FileText,
    bg: 'bg-amber-500/8 hover:bg-amber-500/14',
    border: 'border-amber-500/20',
    text: 'text-amber-300',
    dot: 'bg-amber-400',
    checkColor: 'text-amber-400',
  },
  mcq: {
    label: 'MCQ',
    icon: HelpCircle,
    bg: 'bg-sky-500/8 hover:bg-sky-500/14',
    border: 'border-sky-500/20',
    text: 'text-sky-300',
    dot: 'bg-sky-400',
    checkColor: 'text-sky-400',
  },
  mock: {
    label: 'Mock',
    icon: ClipboardList,
    bg: 'bg-rose-500/8 hover:bg-rose-500/14',
    border: 'border-rose-500/20',
    text: 'text-rose-300',
    dot: 'bg-rose-400',
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
      <div className="flex-1 h-1 bg-white/6 rounded-full overflow-hidden min-w-[28px]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
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

  const studied    = !!completion?.studied;
  const rev1       = !!completion?.revisions?.['1'];
  const rev2       = !!completion?.revisions?.['2'];
  const rev3       = !!completion?.revisions?.['3'];

  if (isPractice) {
    const Icon = cfg.icon;
    return (
      <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${cfg.bg} ${cfg.border} transition-colors`}>
        <Icon size={13} className={cfg.text} />
        <span className={`flex-1 text-xs font-medium ${cfg.text} bangla`}>{topic.name}</span>
        {/* Studied toggle */}
        <button
          onClick={() => onToggleStudied(!studied)}
          className="shrink-0 transition-transform active:scale-90"
          title={studied ? 'Mark as not done' : 'Mark as done'}
        >
          {studied
            ? <CheckCircle2 size={15} className={cfg.checkColor} />
            : <Circle size={15} className="text-white/20 hover:text-white/50" />
          }
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors group">
      {/* Studied toggle */}
      <button
        onClick={() => onToggleStudied(!studied)}
        className="shrink-0 mt-0.5 transition-transform active:scale-90"
        title={studied ? 'Mark as not studied' : 'Mark as studied'}
      >
        {studied
          ? <CheckCircle2 size={15} className="text-emerald-400" />
          : <Circle size={15} className="text-white/20 group-hover:text-white/40 transition-colors" />
        }
      </button>

      {/* Topic name */}
      <span className={`flex-1 text-xs leading-relaxed bangla ${studied ? 'text-white/60 line-through decoration-white/20' : 'text-white/75'}`}>
        {topic.name}
      </span>

      {/* Revision chips — only enabled if studied */}
      <div className="flex items-center gap-1 shrink-0">
        {[1, 2, 3].map(level => {
          const done = level === 1 ? rev1 : level === 2 ? rev2 : rev3;
          const canToggle = studied && (level === 1 || (level === 2 && rev1) || (level === 3 && rev2));
          return (
            <button
              key={level}
              onClick={() => canToggle && onToggleRevision(level, !done)}
              disabled={!canToggle}
              title={canToggle ? `Revision ${level}` : studied ? 'Complete previous revision first' : 'Study first'}
              className={`w-6 h-6 rounded-md text-[9px] font-bold border transition-all active:scale-90
                ${done
                  ? 'bg-indigo-500/25 border-indigo-400/40 text-indigo-300'
                  : canToggle
                    ? 'bg-white/5 border-white/10 text-white/30 hover:border-indigo-500/30 hover:text-indigo-400'
                    : 'bg-white/3 border-white/5 text-white/10 cursor-not-allowed'
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
// Chapter Row with expandable Topic List
// ─────────────────────────────────────────────────────────────────────────────
function ChapterRow({ chapter, uid, subjectColor }) {
  const toast    = useUIStore(s => s.toast);
  const [open, setOpen] = useState(false);

  const allTopics   = getTopicsForChapter(chapter.subject, chapter.chapterNumber);
  const legacyStatus = normalizeLegacyStatus(chapter.status);

  const {
    completionMap, loading, error, updateTopic,
    studyPct, rev1Pct, rev2Pct, rev3Pct, doneCount, totalCount,
  } = useTopicProgress(chapter.id, allTopics, legacyStatus, open);

  const handleToggleStudied = useCallback(async (slug, value) => {
    try {
      await updateTopic(slug, { studied: value });
      // Also clear revisions if un-studying
      if (!value) {
        await updateTopic(slug, { revisionLevel: 1, revisionDone: false });
        await updateTopic(slug, { revisionLevel: 2, revisionDone: false });
        await updateTopic(slug, { revisionLevel: 3, revisionDone: false });
      }
    } catch {
      toast('আপডেট ব্যর্থ', 'error');
    }
  }, [updateTopic, toast]);

  const handleToggleRevision = useCallback(async (slug, level, value) => {
    try {
      await updateTopic(slug, { revisionLevel: level, revisionDone: value });
    } catch {
      toast('রিভিশন আপডেট ব্যর্থ', 'error');
    }
  }, [updateTopic, toast]);

  const hasTopics = allTopics.length > 0;

  return (
    <div className="rounded-xl border border-white/[0.05] overflow-hidden">
      {/* Chapter header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.03] transition-colors text-left"
      >
        {open
          ? <ChevronDown size={13} className="text-white/30 shrink-0" />
          : <ChevronRight size={13} className="text-white/30 shrink-0" />
        }
        <span className="text-[11px] text-white/35 w-5 shrink-0 text-right tabular-nums">
          {String(chapter.chapterNumber).padStart(2, '0')}
        </span>
        <span className="flex-1 text-sm text-white/80 bangla leading-snug pr-2">
          {chapter.chapterName}
        </span>

        {/* Compact progress badges */}
        {hasTopics && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-white/30 tabular-nums">
              {doneCount}/{totalCount}
            </span>
            <div className="w-16 hidden sm:block">
              <MiniBar pct={studyPct} color={subjectColor} />
            </div>
            {rev1Pct > 0 && (
              <span className="text-[9px] text-indigo-400/70 hidden md:block">R1·{rev1Pct}%</span>
            )}
          </div>
        )}
      </button>

      {/* Topic panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.05] bg-white/[0.01]">
              {/* Chapter progress summary */}
              {hasTopics && (
                <div className="px-3 pt-2.5 pb-1.5 space-y-1.5">
                  <MiniBar pct={studyPct} color={subjectColor} label="Study" />
                  <div className="flex items-center gap-2">
                    <MiniBar pct={rev1Pct} color="#818cf8" label="Rev 1" dim={rev1Pct === 0} />
                    <MiniBar pct={rev2Pct} color="#a78bfa" label="Rev 2" dim={rev2Pct === 0} />
                    <MiniBar pct={rev3Pct} color="#c084fc" label="Rev 3" dim={rev3Pct === 0} />
                  </div>
                </div>
              )}

              {/* Topic list */}
              {loading ? (
                <div className="flex items-center gap-2 px-3 py-3 text-xs text-white/30">
                  <div className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />
                  টপিক লোড হচ্ছে…
                </div>
              ) : error ? (
                <p className="px-3 py-3 text-xs text-red-400 bangla">{error}</p>
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
// Subject Section
// ─────────────────────────────────────────────────────────────────────────────
function SubjectSection({ subject, chapters }) {
  const [open, setOpen] = useState(false);
  const colors = SUBJECT_COLORS[subject] || SUBJECT_COLORS.Physics1;

  // Legacy-based chapter completion (for subject header bar, pre-topic era)
  const completed = chapters.filter(ch => {
    const s = normalizeLegacyStatus(ch.status);
    return s !== 'not_started' && s !== 'in_progress';
  }).length;
  const pct = chapters.length ? Math.round((completed / chapters.length) * 100) : 0;

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${colors.bg} ${colors.border} overflow-hidden`}>
      {/* Subject header */}
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
          <span className="text-xs text-white/40">{completed}/{chapters.length}</span>
          <div className="w-16 h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: colors.hex }}
            />
          </div>
          <span className="text-xs text-white/50 w-8 text-right">{pct}%</span>
        </div>
      </button>

      {/* Chapter list */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-white/[0.06]"
          >
            <div className="px-2 py-2 space-y-1.5">
              {chapters.map(ch => (
                <ChapterRow
                  key={ch.id}
                  chapter={ch}
                  uid={ch.userId}
                  subjectColor={colors.hex}
                />
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

  // Seed handler
  const handleSeed = async () => {
    if (!user?.uid) return;
    setSeeding(true);
    try {
      await seedChapters(user.uid, CHAPTER_DATA);
      const chs = await getChapters(user.uid);
      setChapters(chs || []);
      if (chs?.length) {
        toast('সকল অধ্যায় সফলভাবে লোড হয়েছে! 🎉', 'success');
        setError(null);
      }
    } catch (err) {
      toast('অধ্যায় লোড করতে ব্যর্থ', 'error');
      setError(err.message || 'Error');
    } finally {
      setSeeding(false);
    }
  };

  // Search filter
  const filtered = chapters.filter(ch => {
    const q = search.toLowerCase();
    return !search
      || ch.chapterName?.toLowerCase().includes(q)
      || (SUBJECT_DISPLAY_NAMES[ch.subject] || ch.subject).toLowerCase().includes(q);
  });

  // Group by HSC subject order
  const bySubject = HSC_SUBJECTS.reduce((acc, s) => {
    const subs = filtered.filter(ch => ch.subject === s);
    if (subs.length) acc[s] = subs;
    return acc;
  }, {});

  // Overall chapter-level stats (legacy-based, until full topic progress loaded)
  const totalCompleted = chapters.filter(ch => {
    const s = normalizeLegacyStatus(ch.status);
    return s !== 'not_started' && s !== 'in_progress';
  }).length;
  const totalPct = chapters.length ? Math.round((totalCompleted / chapters.length) * 100) : 0;

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5 pb-24">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen size={20} className="text-cyan-400" />
            অধ্যায় অগ্রগতি
          </h2>
          <p className="text-sm text-white/30 mt-1 bangla">
            {totalCompleted}/{chapters.length} অধ্যায় · প্রতিটি অধ্যায়ে ক্লিক করে টপিক দেখুন
          </p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/5 transition-all shrink-0"
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* ── Overall Progress Bar ────────────────────────────────────────────── */}
      <div className="rounded-xl bg-white/[0.025] border border-white/[0.07] p-4 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-white/40 bangla">মোট অধ্যায় অগ্রগতি</span>
          <span className="text-white/70 font-semibold tabular-nums">{totalPct}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${totalPct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
          />
        </div>
        <p className="text-[10px] text-white/20 bangla">
          💡 অধ্যায়ে ক্লিক করুন → টপিক দেখুন → প্রতিটি টপিক ও CQ/MCQ/Mock আলাদাভাবে ট্র্যাক করুন
        </p>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
        <input
          type="text"
          placeholder="অধ্যায় বা বিষয় খুঁজুন…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/4 border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-white/20
                     focus:outline-none focus:border-cyan-500/40 transition-colors bangla"
        />
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-white/40 bangla">অধ্যায় লোড হচ্ছে…</p>
        </div>

      ) : error ? (
        <div className="text-center py-10 px-4 space-y-4 rounded-2xl bg-red-500/8 border border-red-500/15">
          <p className="text-red-400 font-semibold bangla text-sm">অধ্যায় লোড করতে সমস্যা হয়েছে</p>
          <p className="text-xs text-white/40 bangla leading-relaxed">{error}</p>
          <button
            onClick={load}
            className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/20
                       text-xs font-medium transition-all bangla inline-flex items-center gap-2"
          >
            <RefreshCw size={13} /> পুনরায় চেষ্টা করুন
          </button>
        </div>

      ) : chapters.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <BookOpen size={44} className="mx-auto text-white/15" />
          <div>
            <p className="text-white font-semibold bangla">কোনো অধ্যায় নেই</p>
            <p className="text-sm text-white/30 mt-1 bangla">সকল বিষয়ের অধ্যায় লোড করুন</p>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-semibold
                       disabled:opacity-50 inline-flex items-center gap-2 shadow-lg shadow-cyan-500/20"
          >
            {seeding ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>লোড হচ্ছে…</span>
              </>
            ) : (
              <span>📚 সকল অধ্যায় লোড করুন</span>
            )}
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