import { useState, useEffect, useCallback } from 'react';
import { BookOpen, CheckCircle, Clock, RotateCcw, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '../store';
import { getChapters, updateChapter } from '../firebase/db';

const SUBJECTS = ['Physics','Chemistry','Math','Botany','Zoology','English','Bangla','ICT'];

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
  in_progress: { label: 'In Progress', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  completed:   { label: 'Completed',   color: 'text-green-400  bg-green-500/10  border-green-500/20'  },
  revised:     { label: 'Revised',     color: 'text-cyan-400   bg-cyan-500/10   border-cyan-500/20'   },
};

const SUBJECT_ACCENT = {
  Physics:   'from-cyan-500/10   to-blue-500/10   border-cyan-500/20',
  Chemistry: 'from-purple-500/10 to-pink-500/10   border-purple-500/20',
  Math:      'from-yellow-500/10 to-orange-500/10 border-yellow-500/20',
  Botany:    'from-green-500/10  to-emerald-500/10 border-green-500/20',
  Zoology:   'from-red-500/10    to-rose-500/10   border-red-500/20',
  default:   'from-slate-500/10  to-slate-500/10  border-slate-500/20',
};

function ChapterRow({ chapter, uid, onUpdated }) {
  const toast    = useUIStore(s => s.toast);
  const [saving, setSaving] = useState(false);
  const status   = chapter.status || 'not_started';
  const cfg      = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;

  const cycleStatus = async () => {
    const order = ['not_started','in_progress','completed','revised'];
    const next  = order[(order.indexOf(status) + 1) % order.length];
    setSaving(true);
    try {
      await updateChapter(uid, chapter.subject, chapter.chapterNumber, { status: next });
      onUpdated(chapter.id, { status: next });
    } catch { toast('Failed to update', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group">
      <span className="text-xs text-slate-600 w-6 shrink-0">{chapter.chapterNumber}</span>
      <span className="flex-1 text-sm text-slate-300 group-hover:text-white transition-colors truncate">
        {chapter.chapterName}
      </span>
      <button
        onClick={cycleStatus}
        disabled={saving}
        className={`text-[10px] px-2 py-1 rounded-lg border font-medium transition-all shrink-0 ${cfg.color} hover:brightness-125 disabled:opacity-50`}
      >
        {saving ? '…' : cfg.label}
      </button>
    </div>
  );
}

function SubjectSection({ subject, chapters, uid, onUpdated }) {
  const [open, setOpen] = useState(true);
  const accent = SUBJECT_ACCENT[subject] || SUBJECT_ACCENT.default;

  const counts = chapters.reduce((acc, ch) => {
    const s = ch.status || 'not_started';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const completed = (counts.completed || 0) + (counts.revised || 0);
  const pct = chapters.length ? Math.round((completed / chapters.length) * 100) : 0;

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${accent} overflow-hidden`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        {open ? <ChevronDown size={16} className="text-slate-500 shrink-0" /> : <ChevronRight size={16} className="text-slate-500 shrink-0" />}
        <span className="font-semibold text-white flex-1">{subject}</span>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400">{completed}/{chapters.length}</span>
          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" style={{ width: `${pct}%` }} />
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

export default function ChaptersPage() {
  const user  = useAuthStore(s => s.user);
  const [chapters, setChapters] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');

  useEffect(() => {
    if (!user?.uid) return;
    getChapters(user.uid).then(ch => {
      setChapters(ch);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.uid]);

  const handleUpdated = useCallback((id, data) => {
    setChapters(prev => prev.map(ch => ch.id === id ? { ...ch, ...data } : ch));
  }, []);

  const filtered = chapters.filter(ch => {
    const matchSearch = !search || ch.chapterName?.toLowerCase().includes(search.toLowerCase()) || ch.subject?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || ch.status === filter || (!ch.status && filter === 'not_started');
    return matchSearch && matchFilter;
  });

  const bySubject = SUBJECTS.reduce((acc, s) => {
    const subChapters = filtered.filter(ch => ch.subject === s);
    if (subChapters.length) acc[s] = subChapters;
    return acc;
  }, {});

  const totalCompleted = chapters.filter(ch => ch.status === 'completed' || ch.status === 'revised').length;
  const totalPct = chapters.length ? Math.round((totalCompleted / chapters.length) * 100) : 0;

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen size={20} className="text-cyan-400" /> Chapters
          </h2>
          <p className="text-sm text-slate-500 mt-1">{totalCompleted}/{chapters.length} completed · {totalPct}% overall</p>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="rounded-xl bg-white/[0.02] border border-white/10 p-4">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-slate-400">Overall Progress</span>
          <span className="text-white font-medium">{totalPct}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${totalPct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
          />
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text" placeholder="Search chapters…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
          />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
        >
          <option value="all">All</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="revised">Revised</option>
        </select>
      </div>

      {/* Tip: click status to cycle */}
      <p className="text-xs text-slate-600 -mt-2">💡 Click the status badge to cycle: Not Started → In Progress → Completed → Revised</p>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : Object.keys(bySubject).length === 0 ? (
        <div className="text-center py-12 text-slate-600">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p>No chapters found.</p>
          <p className="text-xs mt-1">Import chapters from the Routine page or contact admin to seed.</p>
        </div>
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