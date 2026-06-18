import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../../store';
import { getChapters } from '../../../firebase/db';
import {
  BUET_SUBJECTS,
  SUBJECT_DISPLAY_NAMES,
  SUBJECT_SHORT_NAMES,
  SUBJECT_COLORS,
  normalizeLegacyStatus,
  STATUS_ORDER,
} from '../../../lib/chapters-data';

// Completion count: any status other than not_started / in_progress = "done"
function countCompleted(chapters) {
  return chapters.filter(ch => {
    const s = normalizeLegacyStatus(ch.status);
    return s !== 'not_started' && s !== 'in_progress';
  }).length;
}

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
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </svg>
  );
}

export default function BuetProgressWidget() {
  const uid = useAuthStore(s => s.user?.uid);
  const [chapters, setChapters] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(null); // subject key

  const load = useCallback(() => {
    if (!uid) return;
    setLoading(true);
    getChapters(uid).then(all => {
      setChapters(all.filter(ch => BUET_SUBJECTS.includes(ch.subject)));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  // ── Aggregate per subject ─────────────────────────────────────────────────
  const bySubject = BUET_SUBJECTS.map(subj => {
    const chs      = chapters.filter(ch => ch.subject === subj);
    const done     = countCompleted(chs);
    const total    = chs.length;
    const pct      = total ? Math.round((done / total) * 100) : 0;
    const colors   = SUBJECT_COLORS[subj];
    return { subj, chs, done, total, pct, colors };
  });

  const totalDone  = bySubject.reduce((s, b) => s + b.done, 0);
  const totalAll   = bySubject.reduce((s, b) => s + b.total, 0);
  const overallPct = totalAll ? Math.round((totalDone / totalAll) * 100) : 0;

  return (
    <div className="h-full flex flex-col bg-[#0c1220] rounded-2xl border border-white/[0.06] p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-white">BUET প্রস্তুতি</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Physics · Chemistry · Math</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white">{overallPct}%</p>
          <p className="text-[10px] text-slate-600">{totalDone}/{totalAll}</p>
        </div>
      </div>

      {/* Overall bar */}
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-purple-500 to-yellow-400"
          initial={{ width: 0 }}
          animate={{ width: `${overallPct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </div>

      {/* Subject rings grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-2 flex-1">
          {BUET_SUBJECTS.map(s => (
            <div key={s} className="flex flex-col items-center gap-1.5 rounded-xl bg-white/5 animate-pulse p-3 h-20" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 flex-1">
          {bySubject.map(({ subj, chs, done, total, pct, colors }) => (
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
                  {SUBJECT_SHORT_NAMES[subj]}
                </span>
                <span className="text-[8px] text-slate-600">{done}/{total}</span>
              </button>

              {/* Chapter list for this subject */}
              <AnimatePresence>
                {expanded === subj && chs.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-1"
                  >
                    <div className={`rounded-xl border ${colors.border} bg-gradient-to-br ${colors.bg} p-2 space-y-1`}>
                      {chs.map(ch => {
                        const s = normalizeLegacyStatus(ch.status);
                        const isDone = s !== 'not_started' && s !== 'in_progress';
                        return (
                          <div key={ch.id} className="flex items-center gap-1.5 text-[9px]">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isDone ? `bg-[${colors.hex}]` : 'bg-white/10'}`}
                              style={{ backgroundColor: isDone ? colors.hex : undefined }} />
                            <span className={`bangla truncate ${isDone ? 'text-white' : 'text-slate-600'}`}>
                              {ch.chapterNumber}. {ch.chapterName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {totalAll === 0 && !loading && (
        <p className="text-xs text-slate-600 text-center mt-2 bangla">
          অধ্যায় পাতায় যান এবং "সকল অধ্যায় লোড করুন" ক্লিক করুন
        </p>
      )}
    </div>
  );
}
