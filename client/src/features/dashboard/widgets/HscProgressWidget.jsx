import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuthStore } from '../../../store';
import { getChapters } from '../../../firebase/db';
import {
  HSC_SUBJECTS,
  SUBJECT_DISPLAY_NAMES,
  SUBJECT_SHORT_NAMES,
  SUBJECT_COLORS,
  normalizeLegacyStatus,
} from '../../../lib/chapters-data';

function countCompleted(chapters) {
  return chapters.filter(ch => {
    const s = normalizeLegacyStatus(ch.status);
    return s !== 'not_started' && s !== 'in_progress';
  }).length;
}

// Chapter detail modal/drawer
function SubjectDrawer({ subject, chapters, colors, onClose }) {
  const done  = countCompleted(chapters);
  const total = chapters.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        exit={{ y: 60 }}
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-sm max-h-[70vh] flex flex-col rounded-2xl border overflow-hidden bg-[#0c1220] ${colors.border}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r ${colors.bg} border-b ${colors.border}`}>
          <div>
            <p className={`font-semibold bangla text-sm ${colors.text}`}>
              {SUBJECT_DISPLAY_NAMES[subject]}
            </p>
            <p className="text-[10px] text-slate-500">{done}/{total} অধ্যায় সম্পূর্ণ · {pct}%</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={18} />
          </button>
        </div>
        {/* Progress bar */}
        <div className="px-4 pt-3 pb-1">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: colors.hex, width: `${pct}%` }}
              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </div>
        {/* Chapter list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-none">
          {chapters.map(ch => {
            const s      = normalizeLegacyStatus(ch.status);
            const isDone = s !== 'not_started' && s !== 'in_progress';
            return (
              <div
                key={ch.id}
                className={`flex items-center gap-3 px-2 py-2 rounded-xl text-sm transition-all
                  ${isDone ? `bg-gradient-to-r ${colors.bg} border ${colors.border}` : 'bg-white/[0.02] border border-white/5'}`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${isDone ? '' : 'bg-white/10'}`}
                  style={{ backgroundColor: isDone ? colors.hex : undefined }} />
                <span className={`flex-1 bangla ${isDone ? colors.text : 'text-slate-500'} text-xs`}>
                  {ch.chapterNumber}. {ch.chapterName}
                </span>
                {isDone && (
                  <span className="text-[9px] text-slate-600 bangla shrink-0">
                    {s.startsWith('revised_') ? s.replace('revised_', '×') + ' পুনরাবৃত্তি' : '✓'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function HscProgressWidget() {
  const uid = useAuthStore(s => s.user?.uid);
  const [chapters, setChapters] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null); // subject key for drawer
  const [filter,   setFilter]   = useState('all');

  const load = useCallback(() => {
    if (!uid) return;
    setLoading(true);
    getChapters(uid).then(all => {
      setChapters(all);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  const bySubject = HSC_SUBJECTS.map(subj => {
    const chs   = chapters.filter(ch => ch.subject === subj);
    const done  = countCompleted(chs);
    const total = chs.length;
    const pct   = total ? Math.round((done / total) * 100) : 0;
    return { subj, chs, done, total, pct, colors: SUBJECT_COLORS[subj] };
  });

  const totalDone  = bySubject.reduce((s, b) => s + b.done, 0);
  const totalAll   = bySubject.reduce((s, b) => s + b.total, 0);
  const overallPct = totalAll ? Math.round((totalDone / totalAll) * 100) : 0;

  const filtered = bySubject.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'complete') return b.pct === 100;
    if (filter === 'in_progress') return b.done > 0 && b.pct < 100;
    if (filter === 'not_started') return b.done === 0;
    return true;
  });

  const FILTER_OPTS = [
    { v: 'all',         l: 'সব' },
    { v: 'in_progress', l: 'চলমান' },
    { v: 'not_started', l: 'শুরু হয়নি' },
    { v: 'complete',    l: 'সম্পূর্ণ' },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0c1220] rounded-2xl border border-white/[0.06] p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-white">HSC সকল বিষয়</h3>
          <p className="text-[10px] text-slate-500 mt-0.5 bangla">
            {totalDone}/{totalAll} অধ্যায় · {overallPct}% সম্পূর্ণ
          </p>
        </div>
      </div>

      {/* Overall arc progress */}
      <div className="relative flex justify-center mb-3">
        <svg width="120" height="62" viewBox="0 0 120 62">
          {/* Background arc */}
          <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="round" />
          {/* Gradient fill arc */}
          <defs>
            <linearGradient id="hscGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <motion.path
            d="M 10 60 A 50 50 0 0 1 110 60" fill="none"
            stroke="url(#hscGrad)" strokeWidth="8" strokeLinecap="round"
            strokeDasharray="157" strokeDashoffset={157 - (overallPct / 100) * 157}
            initial={{ strokeDashoffset: 157 }}
            animate={{ strokeDashoffset: 157 - (overallPct / 100) * 157 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute bottom-1 text-center">
          <p className="text-xl font-bold text-white">{overallPct}%</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1 mb-2">
        {FILTER_OPTS.map(f => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-medium border bangla transition-all
              ${filter === f.v
                ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {/* Subject grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-2 flex-1">
          {HSC_SUBJECTS.slice(0, 6).map(s => (
            <div key={s} className="h-14 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-none">
          <div className="grid grid-cols-2 gap-2">
            {filtered.map(({ subj, done, total, pct, colors }) => (
              <button
                key={subj}
                onClick={() => setSelected(subj)}
                className={`flex flex-col gap-2 p-3 rounded-xl border text-left transition-all hover:brightness-110 bg-gradient-to-br ${colors.bg} ${colors.border}`}
              >
                <p className={`text-[10px] font-semibold bangla leading-tight ${colors.text}`}>
                  {SUBJECT_SHORT_NAMES[subj]}
                </p>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: colors.hex }} />
                </div>
                <p className="text-[9px] text-slate-500">{done}/{total} অধ্যায়</p>
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-xs text-slate-600 text-center py-4 bangla">কোনো বিষয় নেই।</p>
          )}
        </div>
      )}

      {totalAll === 0 && !loading && (
        <p className="text-xs text-slate-600 text-center mt-2 bangla">
          অধ্যায় পাতায় যান এবং সকল অধ্যায় লোড করুন
        </p>
      )}

      {/* Chapter drawer */}
      <AnimatePresence>
        {selected && (() => {
          const { chs, colors } = bySubject.find(b => b.subj === selected) || {};
          return chs ? (
            <SubjectDrawer
              subject={selected}
              chapters={chs}
              colors={colors}
              onClose={() => setSelected(null)}
            />
          ) : null;
        })()}
      </AnimatePresence>
    </div>
  );
}
