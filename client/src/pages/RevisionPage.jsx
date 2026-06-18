import { useState, useEffect } from 'react';
import { RotateCcw, CheckCircle, Clock, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '../store';
import { getDueRevisions, logRevision, getRevisionHistory } from '../firebase/db';
import { getBSTDateString } from '../lib/bst';

const SUBJECT_COLOR = {
  Physics: 'text-cyan-400', Chemistry: 'text-purple-400', Math: 'text-yellow-400',
  Botany: 'text-green-400', Zoology: 'text-red-400', default: 'text-slate-400',
};

function RevisionCard({ item, onLog }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);

  const color = SUBJECT_COLOR[item.subject] || SUBJECT_COLOR.default;

  const handleLog = async () => {
    setSaving(true);
    try {
      await onLog({ chapterId: item.chapterId, subject: item.subject, chapterNumber: item.chapterNumber, chapterName: item.chapterName, notes });
    } finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 ${item.overdue ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-white/10 bg-white/[0.02]'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{item.subject}</span>
            {item.overdue && <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">⚠️ Overdue</span>}
            <span className="text-[10px] text-slate-600 bg-white/5 px-1.5 py-0.5 rounded-full border border-white/[0.06]">Rev #{item.revisionCount + 1}</span>
          </div>
          <p className="text-sm text-white font-medium">Ch {item.chapterNumber}. {item.chapterName}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Due: {item.dueDate}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          ><ChevronDown size={15} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} /></button>
          <button onClick={expanded ? handleLog : () => setExpanded(true)}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-xs font-medium disabled:opacity-50"
          >
            {saving ? '…' : <><CheckCircle size={13} /> Done</>}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
              <textarea rows={2} placeholder="Revision notes (optional)…" value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none resize-none" />
              <button onClick={handleLog} disabled={saving}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-medium disabled:opacity-50"
              >{saving ? 'Logging…' : '✅ Mark as Revised'}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function RevisionPage() {
  const user  = useAuthStore(s => s.user);
  const toast = useUIStore(s => s.toast);
  const [dueToday,  setDueToday]  = useState([]);
  const [upcoming,  setUpcoming]  = useState([]);
  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('due');
  const [refresh,   setRefresh]   = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    Promise.all([
      getDueRevisions(user.uid),
      getRevisionHistory(user.uid, 14),
    ]).then(([due, hist]) => {
      setDueToday(due.dueToday || []);
      setUpcoming(due.upcoming || []);
      setHistory(hist);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.uid, refresh]);

  const handleLog = async (data) => {
    try {
      const result = await logRevision(user.uid, data);
      toast(`Revision logged! Next due: ${result.nextDueDate || 'Completed 🎉'}`, 'success');
      setRefresh(r => r + 1);
    } catch { toast('Failed to log revision', 'error'); }
  };

  const stats = {
    due:      dueToday.length,
    overdue:  dueToday.filter(d => d.overdue).length,
    upcoming: upcoming.length,
    done:     history.length,
  };

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <RotateCcw size={20} className="text-cyan-400" /> Spaced Revision
        </h2>
        <p className="text-sm text-slate-500 mt-1">Intervals: 7 → 14 → 30 days</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Due Today', value: stats.due,    color: 'text-cyan-400' },
          { label: 'Overdue',   value: stats.overdue, color: 'text-red-400'  },
          { label: 'Upcoming',  value: stats.upcoming,color: 'text-yellow-400'},
          { label: 'Done',      value: stats.done,    color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-white/[0.02] border border-white/10 p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.02] border border-white/10 rounded-xl p-1">
        {[['due', 'Due Today'], ['upcoming', 'Upcoming (7d)'], ['history', 'History']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${tab === key ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'}`}
          >{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {tab === 'due' && (
              dueToday.length === 0
                ? <p className="text-center py-8 text-slate-600">🎉 Nothing due today!</p>
                : <div className="space-y-3">{dueToday.map(item => <RevisionCard key={item.chapterId} item={item} onLog={handleLog} />)}</div>
            )}
            {tab === 'upcoming' && (
              upcoming.length === 0
                ? <p className="text-center py-8 text-slate-600">No revisions in next 7 days.</p>
                : (
                  <div className="space-y-2">
                    {upcoming.map(item => (
                      <div key={item.chapterId} className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                        <div>
                          <span className={`text-xs font-medium ${SUBJECT_COLOR[item.subject] || SUBJECT_COLOR.default}`}>{item.subject}</span>
                          <p className="text-sm text-white">Ch {item.chapterNumber}. {item.chapterName}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock size={12} /> {item.dueDate}
                        </div>
                      </div>
                    ))}
                  </div>
                )
            )}
            {tab === 'history' && (
              history.length === 0
                ? <p className="text-center py-8 text-slate-600">No revisions done yet.</p>
                : (
                  <div className="space-y-2">
                    {history.map(h => (
                      <div key={h.id} className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                        <div>
                          <span className={`text-xs font-medium ${SUBJECT_COLOR[h.subject] || SUBJECT_COLOR.default}`}>{h.subject}</span>
                          <p className="text-sm text-white">Ch {h.chapterNumber} — Rev #{h.revisionCount}</p>
                        </div>
                        <p className="text-xs text-slate-500">
                          {h.nextDueDate ? `Next: ${h.nextDueDate}` : '✅ Complete'}
                        </p>
                      </div>
                    ))}
                  </div>
                )
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
