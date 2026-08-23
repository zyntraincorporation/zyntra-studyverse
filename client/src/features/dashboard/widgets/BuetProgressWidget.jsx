import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../../store';
import { useTopicStore } from '../../../store/useTopicStore';
import {
  SYLLABUS,
  BUET_SUBJECT_KEYS,
  SUBJECT_SHORT_NAMES,
  SUBJECT_COLORS,
} from '../../../data/syllabus';
import {
  calculateSubjectProgress,
  calculateChapterProgress,
  calculateOverallProgress,
} from '../../../lib/progressEngine';

// Animated SVG ring
function Ring({ pct, color, size = 56, stroke = 5 }) {
  const r    = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ}
        strokeLinecap="round"
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </svg>
  );
}

export default function BuetProgressWidget() {
  const uid = useAuthStore(s => s.user?.uid);
  const [expanded, setExpanded] = useState(null); // subject key
  const topicMaps = useTopicStore(s => s.topicMaps);

  useEffect(() => {
    if (uid && Object.keys(topicMaps).length === 0) {
      useTopicStore.getState().loadAllUserTopics(uid);
    }
  }, [uid, topicMaps]);

  // Live BUET subjects aggregation from central engine
  const bySubject = BUET_SUBJECT_KEYS.map(subjKey => {
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

  const overall = calculateOverallProgress(BUET_SUBJECT_KEYS, topicMaps);

  return (
    <div className="h-full flex flex-col bg-[#0c1220] rounded-2xl border border-white/[0.06] p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-white">BUET প্রস্তুতি</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Physics · Chemistry · Math</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white tabular-nums">{overall.progressPct}%</p>
          <p className="text-[10px] text-slate-500">{overall.completedChapters}/{overall.totalChapters} অধ্যায়</p>
        </div>
      </div>

      {/* Overall bar */}
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-purple-500 to-yellow-400"
          initial={{ width: 0 }}
          animate={{ width: `${overall.progressPct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {/* Subject rings grid */}
      <div className="grid grid-cols-3 gap-2 flex-1">
        {bySubject.map(({ subj, shortName, chs, done, total, pct, colors }) => (
          <div key={subj}>
            <button
              onClick={() => setExpanded(expanded === subj ? null : subj)}
              className={`w-full flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all
                bg-gradient-to-br ${colors.bg} ${colors.border}
                hover:brightness-110`}
            >
              <div className="relative">
                <Ring pct={pct} color={colors.hex} />
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white rotate-90 mt-[-2px]">
                  {pct}%
                </span>
              </div>
              <span className={`text-[9px] font-medium bangla text-center leading-tight ${colors.text}`}>
                {shortName}
              </span>
              <span className="text-[8px] text-slate-500">{done}/{total} অধ্যায়</span>
            </button>

            {/* Chapter list drawer */}
            <AnimatePresence>
              {expanded === subj && chs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-1"
                >
                  <div className={`rounded-xl border ${colors.border} bg-gradient-to-br ${colors.bg} p-2 space-y-1`}>
                    {chs.map(ch => (
                      <div key={ch.id} className="flex items-center gap-1.5 text-[9px]">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: ch.isDone ? colors.hex : 'rgba(255,255,255,0.1)' }}
                        />
                        <span className={`bangla truncate ${ch.isDone ? 'text-white' : 'text-slate-500'}`}>
                          {ch.chapterNumber}. {ch.chapterName}
                        </span>
                        <span className="text-[8px] text-white/30 ml-auto tabular-nums">{ch.progressPct}%</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
