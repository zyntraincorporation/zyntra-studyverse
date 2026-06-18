import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, CheckCircle, Filter, AlertTriangle, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '../store';
import { getMistakes, getMistakeStats, createMistake, updateMistake, deleteMistake } from '../firebase/db';
import { getBSTDateString } from '../lib/bst';

const SUBJECTS  = ['Physics','Chemistry','Math','Botany','Zoology','English','Bangla','ICT'];
const TYPES     = ['Conceptual','Calculation','Memory','Reading','Application','Other'];

const SUBJECT_COLOR = {
  Physics: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  Chemistry: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Math: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  Botany: 'text-green-400 bg-green-500/10 border-green-500/20',
  Zoology: 'text-red-400 bg-red-500/10 border-red-500/20',
  default: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

function MistakeCard({ mistake, onResolve, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const cls = SUBJECT_COLOR[mistake.subject] || SUBJECT_COLOR.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 transition-all ${mistake.resolved ? 'border-green-500/15 bg-green-500/[0.02] opacity-70' : 'border-white/10 bg-white/[0.02]'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>{mistake.subject}</span>
            <span className="text-xs text-slate-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">{mistake.mistakeType}</span>
            {mistake.resolved && <span className="text-xs text-green-400">✅ Resolved</span>}
          </div>
          <p className="text-sm text-white font-medium leading-snug">{mistake.description}</p>
          {mistake.correctAnswer && (
            <button onClick={() => setExpanded(v => !v)} className="text-xs text-cyan-400 mt-1.5 hover:text-cyan-300">
              {expanded ? 'Hide' : 'Show'} correct answer
            </button>
          )}
          <AnimatePresence>
            {expanded && mistake.correctAnswer && (
              <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="text-xs text-slate-400 mt-1.5 bg-white/[0.03] rounded-lg p-2 border border-white/[0.06] overflow-hidden"
              >{mistake.correctAnswer}</motion.p>
            )}
          </AnimatePresence>
          <p className="text-[10px] text-slate-600 mt-2">{mistake.date}</p>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          {!mistake.resolved && (
            <button onClick={() => onResolve(mistake.id)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-green-400 hover:bg-green-500/10 transition-all"
              title="Mark resolved"
            ><CheckCircle size={15} /></button>
          )}
          <button onClick={() => onDelete(mistake.id)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
          ><Trash2 size={15} /></button>
        </div>
      </div>
    </motion.div>
  );
}

function AddMistakeModal({ onClose, onSaved, uid }) {
  const toast = useUIStore(s => s.toast);
  const [subject,     setSubject]     = useState('Physics');
  const [type,        setType]        = useState('Conceptual');
  const [description, setDescription] = useState('');
  const [answer,      setAnswer]      = useState('');
  const [saving,      setSaving]      = useState(false);

  const handleSave = async () => {
    if (!description.trim()) { toast('Enter a description', 'error'); return; }
    setSaving(true);
    try {
      await createMistake(uid, { subject, mistakeType: type, description: description.trim(), correctAnswer: answer.trim() || null });
      toast('Mistake logged 📝', 'success');
      onSaved();
      onClose();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
        className="w-full max-w-lg bg-[#0c1220] border border-white/10 rounded-2xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-semibold text-white text-base">Log a Mistake</h3>

        <div className="flex flex-wrap gap-1.5">
          {SUBJECTS.map(s => (
            <button key={s} onClick={() => setSubject(s)}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${subject === s ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300' : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'}`}
            >{s}</button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TYPES.map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${type === t ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'}`}
            >{t}</button>
          ))}
        </div>

        <textarea rows={3} placeholder="Describe the mistake… (what you got wrong?)" value={description} onChange={e => setDescription(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none resize-none" />

        <textarea rows={2} placeholder="Correct answer / solution (optional)" value={answer} onChange={e => setAnswer(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none resize-none" />

        <div className="flex gap-2 pt-1">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold text-sm disabled:opacity-50"
          >{saving ? 'Saving…' : 'Log Mistake'}</button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm">Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function MistakePage() {
  const user  = useAuthStore(s => s.user);
  const toast = useUIStore(s => s.toast);
  const [mistakes,   setMistakes]   = useState([]);
  const [stats,      setStats]      = useState(null);
  const [filter,     setFilter]     = useState({ subject: '', resolved: false });
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [activeTab,  setActiveTab]  = useState('list');
  const [refresh,    setRefresh]    = useState(0);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    const [m, s] = await Promise.all([
      getMistakes(user.uid, { subject: filter.subject || undefined, resolved: filter.resolved }),
      getMistakeStats(user.uid),
    ]);
    setMistakes(m);
    setStats(s);
    setLoading(false);
  }, [user?.uid, filter, refresh]);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (id) => {
    await updateMistake(id, { resolved: true }).catch(() => {});
    setMistakes(m => m.map(x => x.id === id ? { ...x, resolved: true } : x));
    toast('Marked as resolved ✅', 'success');
  };

  const handleDelete = async (id) => {
    await deleteMistake(id).catch(() => {});
    setMistakes(m => m.filter(x => x.id !== id));
    toast('Mistake deleted', 'info');
  };

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle size={20} className="text-yellow-400" /> Mistake Log
          </h2>
          {stats && <p className="text-sm text-slate-500 mt-0.5">{stats.unresolved} unresolved · {stats.total} total</p>}
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-medium"
        ><Plus size={15} /> Add</button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(stats.bySubject || {}).slice(0, 3).map(([subj, count]) => (
            <div key={subj} className="rounded-xl bg-white/[0.02] border border-white/10 p-3 text-center">
              <p className="text-lg font-bold text-white">{count}</p>
              <p className="text-[10px] text-slate-500">{subj}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={filter.subject} onChange={e => setFilter(f => ({ ...f, subject: e.target.value }))}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="">All Subjects</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={() => setFilter(f => ({ ...f, resolved: !f.resolved }))}
          className={`px-3 py-2 rounded-xl text-sm border transition-all ${filter.resolved ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'}`}
        >{filter.resolved ? '✅ Resolved' : 'Unresolved'}</button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-7 h-7 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : mistakes.length === 0 ? (
        <div className="text-center py-12 text-slate-600">
          <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
          <p>No mistakes logged yet. Great job! 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mistakes.map(m => (
            <MistakeCard key={m.id} mistake={m} onResolve={handleResolve} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Add modal */}
      <AnimatePresence>
        {showModal && (
          <AddMistakeModal
            uid={user?.uid}
            onClose={() => setShowModal(false)}
            onSaved={() => setRefresh(r => r + 1)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}