import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useAuthStore } from '../../../store';
import { useTopicStore } from '../../../store/useTopicStore';
import {
  SYLLABUS,
  HSC_SUBJECT_KEYS,
  SUBJECT_DISPLAY_NAMES,
  SUBJECT_SHORT_NAMES,
  SUBJECT_COLORS,
} from '../../../data/syllabus';
import {
  calculateSubjectProgress,
  calculateChapterProgress,
  calculateOverallProgress,
} from '../../../lib/progressEngine';

// Chapter detail modal/drawer
function SubjectDrawer({ subject, chapters, colors, onClose }) {
  const doneCount = chapters.filter(c => c.isDone).length;
  const total = chapters.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

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
              {SUBJECT_DISPLAY_NAMES[subject] || subject}
            </p>
            <p className="text-[10px] text-slate-400">{doneCount}/{total} অধ্যায় সম্পূর্ণ · {pct}%</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
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
          {chapters.map(ch => (
            <div
              key={ch.id}
              className={`flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm transition-all
                ${ch.isDone ? `bg-gradient-to-r ${colors.bg} border ${colors.border}` : 'bg-white/[0.02] border border-white/5'}`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: ch.isDone ? colors.hex : 'rgba(255,255,255,0.1)' }}
              />
              <span className={`flex-1 bangla ${ch.isDone ? 'text-white font-medium' : 'text-slate-400'} text-xs`}>
                {ch.chapterNumber}. {ch.chapterName}
              </span>
              <span className="text-[9px] text-slate-400 tabular-nums shrink-0">
                {ch.progressPct}% {ch.isDone && '✓'}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function HscProgressWidget() {
  const uid = useAuthStore(s => s.user?.uid);
  const [selected, setSelected] = useState(null); // subject key for drawer
  const [filter,   setFilter]   = useState('all');
  const topicMaps = useTopicStore(s => s.topicMaps);

  useEffect(() => {
    if (uid && Object.keys(topicMaps).length === 0) {
      useTopicStore.getState().loadAllUserTopics(uid);
    }
  }, [uid, topicMaps]);

  // Aggregate per subject from central engine
  const bySubject = HSC_SUBJECTS.map(subjKey => {
    const subjData = SYLLABUS[subjKey];
    const sp = calculateSubjectProgress(subjKey, topicMaps);
    const colors = subjData?.color || SUBJECT_COLORS[subjKey];

    const chapters = (subjData?.chapters || []).map(ch => {
      const chDocId = uid ? `${uid}_${subjKey}_${ch.chapterNumber}` : ch.legacyDocId;
      const chProg = calculateChapterProgress(ch, topicMaps[chDocId] || topicMaps[ch.legacyDocId] || {});
      return {
        ...ch,
        id: chDocId,
        isDone: chProg.isCompleted,
        progressPct: chProg.progressPct,
      };
    });

    return {
      subj: subjKey,
      name: subjData?.name,
      shortName: subjData?.shortName || SUBJECT_SHORT_NAMES[subjKey],
      chs: chapters,
      done: sp.completedChapters,
      total: sp.totalChapters,
      unitsDone: sp.completedUnits,
      unitsTotal: sp.totalUnits,
      pct: sp.progressPct,
      colors,
    };
  });

  const overall = calculateOverallProgress(HSC_SUBJECT_KEYS, topicMaps);

  const filtered = bySubject.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'complete') return b.pct >= 90;
    if (filter === 'in_progress') return b.pct > 0 && b.pct < 90;
    if (filter === 'not_started') return b.pct === 0;
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
            {overall.completedChapters}/{overall.totalChapters} অধ্যায় · {overall.progressPct}% সম্পূর্ণ
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
            strokeDasharray="157" strokeDashoffset={157 - (overall.progressPct / 100) * 157}
            initial={{ strokeDashoffset: 157 }}
            animate={{ strokeDashoffset: 157 - (overall.progressPct / 100) * 157 }}
            transition={{ duration: 1.0, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute bottom-1 text-center">
          <p className="text-xl font-bold text-white tabular-nums">{overall.progressPct}%</p>
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
      <div className="flex-1 overflow-y-auto scrollbar-none">
        <div className="grid grid-cols-2 gap-2">
          {filtered.map(({ subj, shortName, done, total, pct, colors }) => (
            <button
              key={subj}
              onClick={() => setSelected(subj)}
              className={`flex flex-col gap-2 p-3 rounded-xl border text-left transition-all hover:brightness-110 bg-gradient-to-br ${colors.bg} ${colors.border}`}
            >
              <p className={`text-[10px] font-semibold bangla leading-tight ${colors.text}`}>
                {shortName}
              </p>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: colors.hex }}
                />
              </div>
              <p className="text-[9px] text-slate-500">{done}/{total} অধ্যায় · {pct}%</p>
            </button>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-4 bangla">কোনো বিষয় নেই।</p>
        )}
      </div>

      {/* Chapter drawer */}
      <AnimatePresence>
        {selected && (() => {
          const selectedData = bySubject.find(b => b.subj === selected);
          return selectedData ? (
            <SubjectDrawer
              subject={selected}
              chapters={selectedData.chs}
              colors={selectedData.colors}
              onClose={() => setSelected(null)}
            />
          ) : null;
        })()}
      </AnimatePresence>
    </div>
  );
}
