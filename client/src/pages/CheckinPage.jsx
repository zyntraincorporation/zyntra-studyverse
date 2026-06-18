import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, CheckCircle, XCircle, Clock, BookOpen, Edit2, Trash2, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '../store';
import {
  getTodaySessions, saveSession, getTodayStudyMinutes,
  recalculateAndSaveLeaderboard, updateChatStudyMinutes,
  deleteSession,
  createScheduleEntry, getScheduleEntries,
  updateScheduleEntry, deleteScheduleEntry,
} from '../firebase/db';
import {
  getBSTDateString, getBSTDayName, formatDuration, WEEKLY_SCHEDULE, SESSION_SLOTS,
} from '../lib/bst';
import {
  SUBJECT_DISPLAY_NAMES, HSC_SUBJECTS,
} from '../lib/chapters-data';

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_CUSTOM_MINUTES_PER_DAY = 420; // 7h

const MISS_REASONS = [
  'Sick / not feeling well',
  'Family commitment',
  'Load shedding / no electricity',
  'Studied extra in another session',
  'Too tired',
  'Forgot / slept',
  'Other',
];

const SUBJECT_COLOR = {
  Physics:   'bg-cyan-500/10   text-cyan-300   border-cyan-500/20',
  Chemistry: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  Math:      'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
  Botany:    'bg-green-500/10  text-green-300  border-green-500/20',
  Zoology:   'bg-red-500/10    text-red-300    border-red-500/20',
  English:   'bg-blue-500/10   text-blue-300   border-blue-500/20',
  default:   'bg-slate-500/10  text-slate-300  border-slate-500/20',
};

function SubjectBadge({ subject }) {
  const cls = SUBJECT_COLOR[subject] || SUBJECT_COLOR.default;
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>{subject}</span>;
}

// ── Existing scheduled session card (keeping original) ─────────────────────────
function SessionCard({ sessionNumber, subjects, slotMeta, log, today, uid, displayName, onSaved }) {
  const toast = useUIStore(s => s.toast);
  const [saving, setSaving]           = useState(false);
  const [showMissForm, setShowMissForm] = useState(false);
  const [missReason, setMissReason]   = useState('');
  const [missNotes, setMissNotes]     = useState('');
  const [partialMins, setPartialMins] = useState(0);
  const defaultMinutes = sessionNumber === 2 ? 150 : 120;

  const saveCompleted = async () => {
    setSaving(true);
    try {
      await saveSession(uid, {
        type: 'scheduled', sessionNumber, subjects,
        subject: subjects[0], date: today, dayOfWeek: getBSTDayName(),
        completed: true, durationMinutes: defaultMinutes,
      });
      await recalculateAndSaveLeaderboard(uid, displayName);
      const mins = await getTodayStudyMinutes(uid);
      await updateChatStudyMinutes(uid, displayName, mins);
      toast('Session marked completed! 🎉', 'success');
      onSaved();
    } catch { toast('Failed to save session', 'error'); }
    finally { setSaving(false); }
  };

  const saveMissed = async () => {
    if (!missReason) { toast('Select a reason', 'error'); return; }
    setSaving(true);
    try {
      await saveSession(uid, {
        type: 'scheduled', sessionNumber, subjects, subject: subjects[0],
        date: today, dayOfWeek: getBSTDayName(), completed: false,
        durationMinutes: Number(partialMins) || 0, reasonMissed: missReason, notes: missNotes,
      });
      toast('Session logged as missed.', 'info');
      setShowMissForm(false);
      onSaved();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  const borderColor = log
    ? log.completed ? 'border-green-500/20 bg-green-500/[0.03]' : 'border-red-500/20 bg-red-500/[0.03]'
    : 'border-white/10';

  return (
    <div className={`rounded-2xl border p-5 transition-colors ${borderColor}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-slate-500">{slotMeta.label}</span>
            <span className="text-xs text-slate-600">{slotMeta.time}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {subjects.map(s => <SubjectBadge key={s} subject={s} />)}
          </div>
        </div>
        {log && (
          <div className="shrink-0">
            {log.completed
              ? <span className="text-xs bg-green-500/20 border border-green-500/30 text-green-400 px-2 py-1 rounded-lg font-medium">✅ Done</span>
              : <span className="text-xs bg-red-500/20 border border-red-500/30 text-red-400 px-2 py-1 rounded-lg font-medium">❌ Missed</span>
            }
          </div>
        )}
      </div>

      {log && !showMissForm && (
        <div className="text-xs text-slate-500 mt-2">
          {log.completed
            ? `Completed — ${formatDuration(log.durationMinutes || defaultMinutes)}`
            : `Missed — ${log.reasonMissed || ''}`
          }
          <button onClick={() => setShowMissForm(true)} className="ml-3 text-slate-600 hover:text-slate-400 underline underline-offset-2">Edit</button>
        </div>
      )}

      {!log && !showMissForm && (
        <div className="flex gap-2 mt-3">
          <button onClick={saveCompleted} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/15 border border-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/25 disabled:opacity-50 transition-all">
            <CheckCircle size={15} /> Completed
          </button>
          <button onClick={() => setShowMissForm(true)} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 disabled:opacity-50 transition-all">
            <XCircle size={15} /> Missed
          </button>
        </div>
      )}

      <AnimatePresence>
        {showMissForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-3 overflow-hidden">
            <select value={missReason} onChange={e => setMissReason(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
              <option value="">Select reason…</option>
              {MISS_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input type="number" min="0" max="180" placeholder="Partial minutes (if any)" value={partialMins}
              onChange={e => setPartialMins(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" />
            <textarea rows={2} placeholder="Notes (optional)…" value={missNotes} onChange={e => setMissNotes(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none resize-none" />
            <div className="flex gap-2">
              <button onClick={saveMissed} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setShowMissForm(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Custom Session Row (with double-click delete) ──────────────────────────────
function CustomSessionRow({ session, onDelete }) {
  const [deleteArmed, setDeleteArmed] = useState(false);
  const armTimer = useRef(null);

  const handleDeleteClick = () => {
    if (!deleteArmed) {
      setDeleteArmed(true);
      armTimer.current = setTimeout(() => setDeleteArmed(false), 3000);
    } else {
      clearTimeout(armTimer.current);
      setDeleteArmed(false);
      onDelete(session.id);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-cyan-500/10 bg-cyan-500/[0.02] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Clock size={14} className="text-cyan-400 shrink-0" />
          <span className="text-sm text-white">{session.subject}</span>
          <span className="text-xs text-slate-500">— {formatDuration(session.durationMinutes || 0)}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">Custom</span>
          <button
            onClick={handleDeleteClick}
            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-all
              ${deleteArmed
                ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                : 'bg-white/5 border border-white/10 text-slate-500 hover:text-red-400'}`}
            title={deleteArmed ? 'Click again to confirm delete' : 'Delete'}
          >
            {deleteArmed ? '⚠️' : <Trash2 size={12} />}
          </button>
        </div>
      </div>
      {deleteArmed && (
        <p className="text-[10px] text-red-400 mt-1.5 ml-6">Click the button again to confirm deletion</p>
      )}
      {session.notes && <p className="text-xs text-slate-500 mt-1.5 ml-6">{session.notes}</p>}
    </motion.div>
  );
}

// ── Practice Logger with 7h limit ─────────────────────────────────────────────
function PracticeLogger({ today, uid, displayName, existingCustomMinutes, onSaved }) {
  const toast = useUIStore(s => s.toast);
  const [subject, setSubject]   = useState('');
  const [minutes, setMinutes]   = useState('');
  const [notes,   setNotes]     = useState('');
  const [saving,  setSaving]    = useState(false);

  const remaining = MAX_CUSTOM_MINUTES_PER_DAY - existingCustomMinutes;

  const handleSave = async () => {
    if (!subject || !minutes) { toast('Select subject and duration', 'error'); return; }
    const mins = Number(minutes);
    if (existingCustomMinutes + mins > MAX_CUSTOM_MINUTES_PER_DAY) {
      toast(`Daily custom study limit is 7h (${MAX_CUSTOM_MINUTES_PER_DAY} min). You have ${remaining} min remaining today.`, 'error');
      return;
    }
    setSaving(true);
    try {
      await saveSession(uid, {
        type: 'custom', subject, date: today, dayOfWeek: getBSTDayName(),
        durationMinutes: mins, completed: true, notes,
      });
      await recalculateAndSaveLeaderboard(uid, displayName);
      const minsObj = await getTodayStudyMinutes(uid);
      await updateChatStudyMinutes(uid, displayName, minsObj);
      toast(`Practice session logged! 💪`, 'success');
      setSubject(''); setMinutes(''); setNotes('');
      onSaved();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <BookOpen size={15} className="text-cyan-400" /> Log Practice / QB Session
        </h3>
        {existingCustomMinutes > 0 && (
          <span className="text-[10px] text-slate-500">
            {formatDuration(existingCustomMinutes)} / 7h used
          </span>
        )}
      </div>

      {remaining <= 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-amber-400 font-medium">⏱ 7h daily custom study limit reached</p>
          <p className="text-xs text-slate-500 mt-1">You've logged {formatDuration(existingCustomMinutes)} of custom study today.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <select value={subject} onChange={e => setSubject(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/40">
            <option value="">Select subject…</option>
            {['Physics', 'Chemistry', 'Math', 'Botany', 'Zoology', 'English', 'Bangla', 'ICT'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="relative">
            <input
              type="number" min="1" max={remaining}
              placeholder={`Duration (max ${remaining} min remaining)`}
              value={minutes} onChange={e => setMinutes(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
            />
            {minutes && Number(minutes) > remaining && (
              <p className="text-[10px] text-red-400 mt-1">Exceeds remaining limit ({remaining} min)</p>
            )}
          </div>
          <textarea rows={2} placeholder="Notes (optional)…" value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none resize-none" />
          <button onClick={handleSave} disabled={saving || !minutes || Number(minutes) > remaining}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-semibold disabled:opacity-50 transition-all">
            {saving ? 'Saving…' : 'Log Session'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Schedule Entry Form (per-user custom plan) ─────────────────────────────────
function ScheduleEntryForm({ uid, today, onSaved, onCancel, editing = null }) {
  const toast = useUIStore(s => s.toast);
  const [subject, setSubject] = useState(editing?.subject || '');
  const [chapter, setChapter] = useState(editing?.chapter || '');
  const [date,    setDate]    = useState(editing?.date    || today);
  const [time,    setTime]    = useState(editing?.time    || '08:00');
  const [notes,   setNotes]   = useState(editing?.notes   || '');
  const [saving,  setSaving]  = useState(false);

  const handleSave = async () => {
    if (!subject || !date || !time) { toast('Subject, date and time are required', 'error'); return; }
    setSaving(true);
    try {
      const data = { subject, chapter, date, time, notes };
      if (editing) {
        await updateScheduleEntry(uid, editing.id, data);
        toast('Schedule updated ✓', 'success');
      } else {
        await createScheduleEntry(uid, data);
        toast('Added to schedule! 📅', 'success');
      }
      onSaved();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.03] p-4 space-y-3">
      <p className="text-sm font-semibold text-cyan-300">{editing ? '✏️ Edit Entry' : '➕ New Schedule Entry'}</p>
      <select value={subject} onChange={e => setSubject(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none bangla">
        <option value="">বিষয় বেছে নিন…</option>
        {HSC_SUBJECTS.map(s => (
          <option key={s} value={s}>{SUBJECT_DISPLAY_NAMES[s]}</option>
        ))}
      </select>
      <input type="text" placeholder="অধ্যায় (ঐচ্ছিক)…" value={chapter}
        onChange={e => setChapter(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none bangla" />
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" />
        <input type="time" value={time} onChange={e => setTime(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" />
      </div>
      <textarea rows={1} placeholder="নোট (ঐচ্ছিক)…" value={notes} onChange={e => setNotes(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none resize-none bangla" />
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-semibold disabled:opacity-50">
          {saving ? 'সংরক্ষণ হচ্ছে…' : editing ? 'আপডেট করুন' : 'যোগ করুন'}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm">
          বাতিল
        </button>
      </div>
    </motion.div>
  );
}

// ── Schedule Entry Card ────────────────────────────────────────────────────────
function ScheduleEntryCard({ entry, uid, onUpdated, onDeleted }) {
  const toast    = useUIStore(s => s.toast);
  const [editing, setEditing]         = useState(false);
  const [delArmed, setDelArmed]       = useState(false);
  const [saving,  setSaving]          = useState(false);
  const delTimer = useRef(null);

  const STATUS_STYLES = {
    pending:   'bg-slate-500/10 text-slate-400 border-slate-500/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    missed:    'bg-red-500/10   text-red-400   border-red-500/20',
  };

  const setStatus = async (status) => {
    setSaving(true);
    try {
      await updateScheduleEntry(uid, entry.id, { status });
      onUpdated(entry.id, { status });
      toast(status === 'completed' ? 'সম্পূর্ণ ✅' : 'বাদ পড়েছে ❌', status === 'completed' ? 'success' : 'info');
    } catch { toast('আপডেট ব্যর্থ', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = () => {
    if (!delArmed) {
      setDelArmed(true);
      delTimer.current = setTimeout(() => setDelArmed(false), 3000);
    } else {
      clearTimeout(delTimer.current);
      deleteScheduleEntry(uid, entry.id).then(() => onDeleted(entry.id));
    }
  };

  if (editing) {
    return (
      <ScheduleEntryForm uid={uid} today={entry.date} editing={entry}
        onSaved={() => { setEditing(false); onUpdated(entry.id, {}); }}
        onCancel={() => setEditing(false)} />
    );
  }

  const statusStyle = STATUS_STYLES[entry.status] || STATUS_STYLES.pending;

  return (
    <div className={`rounded-2xl border p-4 transition-all
      ${entry.status === 'completed' ? 'border-green-500/20 bg-green-500/[0.03]'
        : entry.status === 'missed' ? 'border-red-500/20 bg-red-500/[0.03]'
        : 'border-white/10 bg-white/[0.02]'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white bangla">{SUBJECT_DISPLAY_NAMES[entry.subject] || entry.subject}</p>
          {entry.chapter && <p className="text-xs text-slate-500 mt-0.5 bangla">{entry.chapter}</p>}
          <p className="text-[11px] text-slate-600 mt-1">{entry.date} · {entry.time}</p>
          {entry.notes && <p className="text-[11px] text-slate-500 mt-0.5 bangla">{entry.notes}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium bangla ${statusStyle}`}>
            {entry.status === 'completed' ? 'সম্পূর্ণ' : entry.status === 'missed' ? 'বাদ' : 'অপেক্ষারত'}
          </span>
        </div>
      </div>

      {entry.status === 'pending' && (
        <div className="flex gap-2 mt-3">
          <button onClick={() => setStatus('completed')} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/20 disabled:opacity-50">
            <CheckCircle size={13} /> সম্পূর্ণ
          </button>
          <button onClick={() => setStatus('missed')} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 disabled:opacity-50">
            <XCircle size={13} /> বাদ
          </button>
          <button onClick={() => setEditing(true)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-500 hover:text-cyan-400 transition-colors">
            <Edit2 size={13} />
          </button>
          <button onClick={handleDelete}
            className={`w-8 h-8 flex items-center justify-center rounded-xl border text-xs transition-all
              ${delArmed ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-slate-500 hover:text-red-400'}`}
            title={delArmed ? 'Confirm delete' : 'Delete'}>
            {delArmed ? '⚠️' : <Trash2 size={12} />}
          </button>
        </div>
      )}
      {delArmed && <p className="text-[10px] text-red-400 mt-1.5">আরেকবার ক্লিক করুন মুছে ফেলতে</p>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CheckinPage() {
  const user  = useAuthStore(s => s.user);
  const today = getBSTDateString();
  const day   = getBSTDayName();

  const schedule = WEEKLY_SCHEDULE[day];
  const isBreak  = !schedule;

  const [sessions,       setSessions]       = useState([]);
  const [scheduleEntries,setScheduleEntries]= useState([]);
  const [loading,        setLoading]        = useState(true);
  const [refresh,        setRefresh]        = useState(0);
  const [showAddForm,    setShowAddForm]    = useState(false);

  const load = useCallback(() => {
    if (!user?.uid) return;
    setLoading(true);
    Promise.all([
      getTodaySessions(user.uid, today),
      getScheduleEntries(user.uid, today),
    ]).then(([sess, sched]) => {
      setSessions(sess);
      setScheduleEntries(sched);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.uid, today]);

  useEffect(() => { load(); }, [load, refresh]);

  const getLog = (sessionNumber) =>
    sessions.find(s => s.sessionNumber === sessionNumber && s.type === 'scheduled');

  const customSessions    = sessions.filter(s => s.type === 'custom');
  const customTotalMinutes = customSessions.reduce((a, s) => a + (s.durationMinutes || 0), 0);
  const totalMinutes      = sessions.reduce((a, s) => a + (s.durationMinutes || 0), 0);

  const handleDeleteCustom = async (id) => {
    await deleteSession(id);
    setRefresh(r => r + 1);
  };

  const handleEntryUpdated = (id, data) => {
    setScheduleEntries(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  };

  const handleEntryDeleted = (id) => {
    setScheduleEntries(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarDays size={20} className="text-cyan-400" /> {day}, {today}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isBreak ? '🌴 Break day' : '📋 Session Check-in'}
            {totalMinutes > 0 && ` · ${formatDuration(totalMinutes)} studied`}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-medium"
        >
          <Plus size={15} /> শিডিউল
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">

          {/* ── Add Schedule Form ── */}
          <AnimatePresence>
            {showAddForm && (
              <ScheduleEntryForm
                uid={user?.uid} today={today}
                onSaved={() => { setShowAddForm(false); setRefresh(r => r + 1); }}
                onCancel={() => setShowAddForm(false)}
              />
            )}
          </AnimatePresence>

          {/* ── Today's Custom Schedule Entries ── */}
          {scheduleEntries.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">আজকের শিডিউল</p>
              {scheduleEntries.map(entry => (
                <ScheduleEntryCard
                  key={entry.id} entry={entry} uid={user?.uid}
                  onUpdated={handleEntryUpdated}
                  onDeleted={handleEntryDeleted}
                />
              ))}
            </div>
          )}

          {/* ── Fixed Scheduled Sessions ── */}
          {!isBreak && schedule && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Scheduled Sessions</p>
              {Object.entries(schedule).map(([slotNum, subjects]) => (
                <SessionCard
                  key={slotNum}
                  sessionNumber={Number(slotNum)}
                  subjects={subjects}
                  slotMeta={SESSION_SLOTS[slotNum] || { label: `S${slotNum}`, time: '' }}
                  log={getLog(Number(slotNum))}
                  today={today} uid={user?.uid} displayName={user?.displayName}
                  onSaved={() => setRefresh(r => r + 1)}
                />
              ))}
            </div>
          )}

          {/* ── Custom Practice Sessions Logged Today ── */}
          {customSessions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Custom Practice</p>
                <span className="text-[10px] text-slate-600">
                  {formatDuration(customTotalMinutes)} / 7h
                </span>
              </div>
              {customSessions.map(s => (
                <CustomSessionRow key={s.id} session={s} onDelete={handleDeleteCustom} />
              ))}
            </div>
          )}

          {/* ── Practice Logger ── */}
          <PracticeLogger
            today={today} uid={user?.uid} displayName={user?.displayName}
            existingCustomMinutes={customTotalMinutes}
            onSaved={() => setRefresh(r => r + 1)}
          />

        </div>
      )}
    </div>
  );
}
