import { useState, useEffect, useCallback, useRef } from 'react';
import { BookOpen, Search, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '../store';
import { getChapters, updateChapter, seedChapters } from '../firebase/db';
import {
  CHAPTER_DATA,
  SUBJECT_DISPLAY_NAMES,
  SUBJECT_COLORS,
  HSC_SUBJECTS,
  STATUS_CONFIG,
  STATUS_ORDER,
  getNextStatus,
  normalizeLegacyStatus,
} from '../lib/chapters-data';

// ── Status Badge with long-press to reset ─────────────────────────────────────
function StatusBadge({ status, onCycle, onReset, saving }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
  const holdTimer = useRef(null);
  const [holding, setHolding] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const startHold = () => {
    holdTimer.current = setTimeout(() => {
      setShowReset(true);
    }, 650);
    setHolding(true);
  };

  const endHold = () => {
    clearTimeout(holdTimer.current);
    setHolding(false);
  };

  const handleClick = () => {
    if (showReset) return; // don't cycle if reset menu is open
    onCycle();
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    onReset();
    setShowReset(false);
    setConfirmReset(false);
  };

  return (
    <div className="relative shrink-0">
      <button
        onClick={handleClick}
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={startHold}
        onTouchEnd={endHold}
        disabled={saving}
        title="Click to cycle status. Hold to reveal reset option."
        className={`text-[10px] px-2 py-1 rounded-lg border font-medium transition-all
          ${cfg.color}
          ${holding ? 'scale-95' : 'hover:brightness-125'}
          disabled:opacity-50`}
      >
        {saving ? '…' : cfg.label}
        {cfg.pulse && (
          <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
        )}
      </button>

      {/* Hidden reset panel */}
      <AnimatePresence>
        {showReset && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute right-0 top-8 z-50 bg-[#0d1120] border border-white/10 rounded-xl p-3 shadow-xl w-44"
          >
            <p className="text-[10px] text-slate-500 mb-2 text-center">⚠️ Hidden Reset</p>
            {!confirmReset ? (
              <>
                <button
                  onClick={handleReset}
                  className="w-full py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs mb-1.5"
                >
                  Reset to Completed
                </button>
                <button
                  onClick={() => setShowReset(false)}
                  className="w-full py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <p className="text-[10px] text-yellow-400 text-center mb-2">Sure? This resets revision count.</p>
                <button
                  onClick={handleReset}
                  className="w-full py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs mb-1.5"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => { setConfirmReset(false); setShowReset(false); }}
                  className="w-full py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs"
                >
                  Cancel
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Chapter Row ───────────────────────────────────────────────────────────────
function ChapterRow({ chapter, uid, onUpdated }) {
  const toast  = useUIStore(s => s.toast);
  const [saving, setSaving] = useState(false);
  const status  = normalizeLegacyStatus(chapter.status);

  const cycleStatus = async () => {
    const next = getNextStatus(status);
    setSaving(true);
    try {
      await updateChapter(uid, chapter.subject, chapter.chapterNumber, { status: next });
      onUpdated(chapter.id, { status: next });
    } catch { toast('স্ট্যাটাস আপডেট ব্যর্থ', 'error'); }
    finally { setSaving(false); }
  };

  const resetStatus = async () => {
    setSaving(true);
    try {
      await updateChapter(uid, chapter.subject, chapter.chapterNumber, { status: 'completed' });
      onUpdated(chapter.id, { status: 'completed' });
      toast('রিভিশন রিসেট হয়েছে', 'info');
    } catch { toast('রিসেট ব্যর্থ', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group">
      <span className="text-xs text-slate-600 w-6 shrink-0 text-right">{chapter.chapterNumber}</span>
      <span className="flex-1 text-sm text-slate-300 group-hover:text-white transition-colors bangla leading-relaxed">
        {chapter.chapterName}
      </span>
      <StatusBadge
        status={status}
        onCycle={cycleStatus}
        onReset={resetStatus}
        saving={saving}
      />
    </div>
  );
}

// ── Subject Section ───────────────────────────────────────────────────────────
function SubjectSection({ subject, chapters, uid, onUpdated }) {
  const [open, setOpen] = useState(false);
  const colors = SUBJECT_COLORS[subject] || SUBJECT_COLORS.Physics1;

  const counts = chapters.reduce((acc, ch) => {
    const s = normalizeLegacyStatus(ch.status);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const completed = STATUS_ORDER
    .filter(s => s !== 'not_started' && s !== 'in_progress')
    .reduce((sum, s) => sum + (counts[s] || 0), 0);
  const pct = chapters.length ? Math.round((completed / chapters.length) * 100) : 0;

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${colors.bg} ${colors.border} overflow-hidden`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        {open
          ? <ChevronDown size={15} className="text-slate-500 shrink-0" />
          : <ChevronRight size={15} className="text-slate-500 shrink-0" />
        }
        <span className={`font-semibold flex-1 bangla text-sm ${colors.text}`}>
          {SUBJECT_DISPLAY_NAMES[subject] || subject}
        </span>
        <div className="flex items-center gap-3 text-xs shrink-0">
          <span className="text-slate-400">{completed}/{chapters.length}</span>
          <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500`}
              style={{ width: `${pct}%`, backgroundColor: colors.hex }}
            />
          </div>
          <span className="text-slate-500 w-8">{pct}%</span>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-white/[0.06]"
          >
            <div className="px-2 py-2 space-y-0.5">
              {chapters.map(ch => (
                <ChapterRow key={ch.id} chapter={ch} uid={uid} onUpdated={onUpdated} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ChaptersPage() {
  const user    = useAuthStore(s => s.user);
  const toast   = useUIStore(s => s.toast);
  const [chapters, setChapters] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [seeding,  setSeeding]  = useState(false);
  const [search,   setSearch]   = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const load = useCallback(() => {
    if (!user?.uid) return;
    setLoading(true);
    getChapters(user.uid).then(ch => {
      setChapters(ch);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.uid]);

  useEffect(() => { load(); }, [load]);

  const handleUpdated = useCallback((id, data) => {
    setChapters(prev => prev.map(ch => ch.id === id ? { ...ch, ...data } : ch));
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedChapters(user.uid, CHAPTER_DATA);
      toast('সকল অধ্যায় লোড হয়েছে! 🎉', 'success');
      load();
    } catch { toast('লোড ব্যর্থ হয়েছে', 'error'); }
    finally { setSeeding(false); }
  };

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filtered = chapters.filter(ch => {
    const norm    = normalizeLegacyStatus(ch.status);
    const matchS  = filterStatus === 'all' || norm === filterStatus;
    const q       = search.toLowerCase();
    const matchQ  = !search
      || ch.chapterName?.toLowerCase().includes(q)
      || (SUBJECT_DISPLAY_NAMES[ch.subject] || ch.subject).toLowerCase().includes(q);
    return matchS && matchQ;
  });

  // Group by HSC subject order
  const bySubject = HSC_SUBJECTS.reduce((acc, s) => {
    const subs = filtered.filter(ch => ch.subject === s);
    if (subs.length) acc[s] = subs;
    return acc;
  }, {});

  const totalCompleted = chapters.filter(ch => {
    const s = normalizeLegacyStatus(ch.status);
    return s !== 'not_started' && s !== 'in_progress';
  }).length;
  const totalPct = chapters.length ? Math.round((totalCompleted / chapters.length) * 100) : 0;

  // ── Filter options ──────────────────────────────────────────────────────────
  const FILTER_OPTS = [
    { value: 'all',         label: 'সব' },
    { value: 'not_started', label: 'শুরু হয়নি' },
    { value: 'in_progress', label: 'চলমান' },
    { value: 'completed',   label: 'সম্পূর্ণ' },
    { value: 'revised_1',   label: 'পুনরাবৃত্তি ×১' },
    { value: 'revised_2',   label: 'পুনরাবৃত্তি ×২' },
    { value: 'revised_3',   label: 'পুনরাবৃত্তি ×৩' },
    { value: 'revised_4',   label: 'পুনরাবৃত্তি ×৪' },
    { value: 'revised_5',   label: 'পুনরাবৃত্তি ×৫+' },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen size={20} className="text-cyan-400" /> অধ্যায় অগ্রগতি
          </h2>
          <p className="text-sm text-slate-500 mt-1 bangla">
            {totalCompleted}/{chapters.length} সম্পূর্ণ · {totalPct}% মোট অগ্রগতি
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); load(); }}
          className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all shrink-0"
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Overall progress bar */}
      <div className="rounded-xl bg-white/[0.02] border border-white/10 p-4">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-slate-400 bangla">মোট অগ্রগতি</span>
          <span className="text-white font-medium">{totalPct}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${totalPct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
          />
        </div>
        <p className="text-[10px] text-slate-600 mt-2 bangla">
          💡 স্ট্যাটাস ব্যাজে ক্লিক করুন পরিবর্তন করতে। রিসেট করতে ধরে রাখুন।
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <input
          type="text"
          placeholder="অধ্যায় বা বিষয় খুঁজুন…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 bangla"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {FILTER_OPTS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all bangla
              ${filterStatus === f.value
                ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : chapters.length === 0 ? (
        // Empty state — seed button
        <div className="text-center py-12 space-y-4">
          <BookOpen size={44} className="mx-auto text-slate-700" />
          <div>
            <p className="text-white font-semibold bangla">কোনো অধ্যায় নেই</p>
            <p className="text-sm text-slate-500 mt-1 bangla">সকল বিষয়ের অধ্যায় লোড করুন</p>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            {seeding ? 'লোড হচ্ছে…' : '📚 সকল অধ্যায় লোড করুন'}
          </button>
        </div>
      ) : Object.keys(bySubject).length === 0 ? (
        <div className="text-center py-8 text-slate-600 bangla">কোনো ফলাফল নেই।</div>
      ) : (
        <div className="space-y-3">
          {Object.entries(bySubject).map(([subj, chs]) => (
            <SubjectSection key={subj} subject={subj} chapters={chs} uid={user?.uid} onUpdated={handleUpdated} />
          ))}
        </div>
      )}
    </div>
  );
}