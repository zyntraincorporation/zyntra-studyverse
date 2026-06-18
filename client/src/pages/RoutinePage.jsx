import { useState, useEffect } from 'react';
import { CalendarDays, Plus, Trash2, Check, ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '../store';
import { getTargets, saveTargets, getTargetMonths } from '../firebase/db';
import { getBSTYearMonth } from '../lib/bst';

const SUBJECTS  = ['Physics','Chemistry','Math','Botany','Zoology','English','Bangla','ICT'];
const MONTHS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_CFG = {
  pending:     { label: 'Pending',     color: 'text-slate-400   bg-slate-500/10  border-slate-500/20' },
  in_progress: { label: 'In Progress', color: 'text-yellow-400  bg-yellow-500/10 border-yellow-500/20' },
  completed:   { label: 'Completed',   color: 'text-green-400   bg-green-500/10  border-green-500/20' },
  delayed:     { label: 'Delayed',     color: 'text-red-400     bg-red-500/10    border-red-500/20'   },
};

function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

function TargetRow({ target, index, onStatusChange, onDelete }) {
  const [changing, setChanging] = useState(false);
  const cfg = STATUS_CFG[target.status || 'pending'] || STATUS_CFG.pending;
  const ORDER = ['pending','in_progress','completed','delayed'];

  const cycleStatus = async () => {
    setChanging(true);
    const next = ORDER[(ORDER.indexOf(target.status || 'pending') + 1) % ORDER.length];
    await onStatusChange(index, next);
    setChanging(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${target.status === 'completed' ? 'border-green-500/10 bg-green-500/[0.02] opacity-80' : 'border-white/[0.06] bg-white/[0.02]'}`}
    >
      <span className="text-xs text-slate-600 w-4 shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-white font-medium truncate">{target.chapterName || target.description}</span>
          {target.subject && (
            <span className="text-[10px] text-slate-500 bg-white/5 border border-white/[0.06] px-1.5 py-0.5 rounded-full">{target.subject}</span>
          )}
        </div>
        {target.notes && <p className="text-xs text-slate-600 mt-0.5 truncate">{target.notes}</p>}
      </div>
      <button
        onClick={cycleStatus}
        disabled={changing}
        className={`text-[10px] px-2 py-1 rounded-lg border font-medium shrink-0 transition-all hover:brightness-125 ${cfg.color}`}
      >
        {changing ? '…' : cfg.label}
      </button>
      <button onClick={() => onDelete(index)} className="text-slate-600 hover:text-red-400 transition-colors shrink-0 p-1">
        <Trash2 size={13} />
      </button>
    </motion.div>
  );
}

function AddTargetForm({ onAdd }) {
  const [subject,     setSubject]     = useState('Physics');
  const [chapterName, setChapterName] = useState('');
  const [notes,       setNotes]       = useState('');

  const handleAdd = () => {
    if (!chapterName.trim()) return;
    onAdd({ subject, chapterName: chapterName.trim(), notes: notes.trim() || null, status: 'pending' });
    setChapterName('');
    setNotes('');
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Add Target</p>
      <div className="flex flex-wrap gap-1.5">
        {SUBJECTS.map(s => (
          <button key={s} onClick={() => setSubject(s)}
            className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${subject === s ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300' : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'}`}
          >{s}</button>
        ))}
      </div>
      <input
        type="text" placeholder="Chapter name or description…"
        value={chapterName} onChange={e => setChapterName(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
      />
      <input
        type="text" placeholder="Notes (optional)"
        value={notes} onChange={e => setNotes(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none"
      />
      <button onClick={handleAdd}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-medium flex items-center justify-center gap-1.5"
      ><Plus size={14} /> Add Target</button>
    </div>
  );
}

export default function RoutinePage() {
  const user  = useAuthStore(s => s.user);
  const toast = useUIStore(s => s.toast);
  const [yearMonth, setYearMonth] = useState(getBSTYearMonth());
  const [chapters,  setChapters]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [months,    setMonths]    = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    getTargetMonths(user.uid).then(ms => {
      const current = getBSTYearMonth();
      if (!ms.includes(current)) ms = [...ms, current].sort();
      setMonths([...new Set([current, ...ms])].sort().reverse());
    }).catch(() => {});
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    getTargets(user.uid, yearMonth).then(data => {
      setChapters(data.chapters || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.uid, yearMonth]);

  const save = async (updatedChapters) => {
    setSaving(true);
    try {
      await saveTargets(user.uid, yearMonth, updatedChapters);
      setChapters(updatedChapters);
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  const handleAdd = async (item) => {
    const updated = [...chapters, item];
    await save(updated);
    toast('Target added ✅', 'success');
  };

  const handleStatusChange = async (index, status) => {
    const updated = chapters.map((ch, i) => i === index ? { ...ch, status } : ch);
    await save(updated);
  };

  const handleDelete = async (index) => {
    const updated = chapters.filter((_, i) => i !== index);
    await save(updated);
    toast('Target removed', 'info');
  };

  const stats = {
    total:     chapters.length,
    completed: chapters.filter(c => c.status === 'completed').length,
    progress:  chapters.length ? Math.round((chapters.filter(c => c.status === 'completed').length / chapters.length) * 100) : 0,
  };

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <CalendarDays size={20} className="text-cyan-400" /> Monthly Targets
        </h2>
        {saving && <span className="text-xs text-slate-500 animate-pulse">Saving…</span>}
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-2">
        <select
          value={yearMonth}
          onChange={e => setYearMonth(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
        >
          {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>

      {/* Progress */}
      {chapters.length > 0 && (
        <div className="rounded-xl bg-white/[0.02] border border-white/10 p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">{monthLabel(yearMonth)}</span>
            <span className="text-white font-medium">{stats.completed}/{stats.total} · {stats.progress}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${stats.progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
            />
          </div>
        </div>
      )}

      {/* Add form */}
      <AddTargetForm onAdd={handleAdd} />

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : chapters.length === 0 ? (
        <div className="text-center py-8 text-slate-600 text-sm">
          <Target size={40} className="mx-auto mb-3 opacity-30" />
          <p>No targets for {monthLabel(yearMonth)} yet.</p>
          <p className="text-xs mt-1">Add your first chapter target above!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {chapters.map((ch, i) => (
            <TargetRow
              key={i} target={ch} index={i}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}