import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '../store';
import {
  getTodaySessions, saveSession, getTodayStudyMinutes,
  recalculateAndSaveLeaderboard, updateChatStudyMinutes,
} from '../firebase/db';
import {
  getBSTDateString, getBSTDayName, formatDuration,
  WEEKLY_SCHEDULE, SESSION_SLOTS,
} from '../lib/bst';

const SUBJECT_COLOR = {
  Physics:   'bg-cyan-500/10   text-cyan-300   border-cyan-500/20',
  Chemistry: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  Math:      'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
  Botany:    'bg-green-500/10  text-green-300  border-green-500/20',
  Zoology:   'bg-red-500/10    text-red-300    border-red-500/20',
  English:   'bg-blue-500/10   text-blue-300   border-blue-500/20',
  default:   'bg-slate-500/10  text-slate-300  border-slate-500/20',
};

const MISS_REASONS = [
  'Sick / not feeling well',
  'Family commitment',
  'Load shedding / no electricity',
  'Studied extra in another session',
  'Too tired',
  'Forgot / slept',
  'Other',
];

function SubjectBadge({ subject }) {
  const cls = SUBJECT_COLOR[subject] || SUBJECT_COLOR.default;
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>{subject}</span>;
}

function SessionCard({ sessionNumber, subjects, slotMeta, log, today, uid, displayName, onSaved }) {
  const toast = useUIStore(s => s.toast);
  const [saving,       setSaving]       = useState(false);
  const [showMissForm, setShowMissForm] = useState(false);
  const [missReason,   setMissReason]   = useState('');
  const [missNotes,    setMissNotes]    = useState('');
  const [partialMins,  setPartialMins]  = useState(0);

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
      toast('Session marked as completed! 🎉', 'success');
      onSaved();
    } catch (err) {
      toast('Failed to save session', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveMissed = async () => {
    if (!missReason) { toast('Select a reason', 'error'); return; }
    setSaving(true);
    try {
      await saveSession(uid, {
        type: 'scheduled', sessionNumber, subjects,
        subject: subjects[0], date: today, dayOfWeek: getBSTDayName(),
        completed: false, durationMinutes: Number(partialMins) || 0,
        reasonMissed: missReason, notes: missNotes,
      });
      toast('Session logged as missed.', 'info');
      setShowMissForm(false);
      onSaved();
    } catch {
      toast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
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

      {/* Already logged */}
      {log && !showMissForm && (
        <div className="text-xs text-slate-500 mt-2">
          {log.completed
            ? `Completed — ${formatDuration(log.durationMinutes || defaultMinutes)}`
            : `Missed — ${log.reasonMissed || ''}`
          }
          <button onClick={() => setShowMissForm(true)} className="ml-3 text-slate-600 hover:text-slate-400 underline underline-offset-2">
            Edit
          </button>
        </div>
      )}

      {/* Not logged yet */}
      {!log && !showMissForm && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={saveCompleted}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/15 border border-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/25 disabled:opacity-50 transition-all"
          >
            <CheckCircle size={15} /> Completed
          </button>
          <button
            onClick={() => setShowMissForm(true)}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 disabled:opacity-50 transition-all"
          >
            <XCircle size={15} /> Missed
          </button>
        </div>
      )}

      {/* Miss form */}
      <AnimatePresence>
        {showMissForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-3 overflow-hidden"
          >
            <select
              value={missReason}
              onChange={e => setMissReason(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/40"
            >
              <option value="">Select reason…</option>
              {MISS_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Partial minutes studied (if any)</label>
              <input
                type="number" min="0" max="180"
                value={partialMins}
                onChange={e => setPartialMins(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-slate-500/40"
              />
            </div>
            <textarea
              rows={2}
              placeholder="Notes (optional)…"
              value={missNotes}
              onChange={e => setMissNotes(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={saveMissed}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/30 disabled:opacity-50 transition-all"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setShowMissForm(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PracticeLogger({ today, uid, displayName, onSaved }) {
  const toast = useUIStore(s => s.toast);
  const [subject,  setSubject]  = useState('');
  const [minutes,  setMinutes]  = useState('');
  const [notes,    setNotes]    = useState('');
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    if (!subject || !minutes) { toast('Select subject and minutes', 'error'); return; }
    setSaving(true);
    try {
      await saveSession(uid, {
        type: 'custom', subject, date: today, dayOfWeek: getBSTDayName(),
        durationMinutes: Number(minutes), completed: true, notes,
      });
      await recalculateAndSaveLeaderboard(uid, displayName);
      const mins = await getTodayStudyMinutes(uid);
      await updateChatStudyMinutes(uid, displayName, mins);
      toast('Practice session logged! 💪', 'success');
      setSubject(''); setMinutes(''); setNotes('');
      onSaved();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <BookOpen size={15} className="text-cyan-400" /> Log Practice / QB Session
      </h3>
      <div className="space-y-3">
        <select
          value={subject} onChange={e => setSubject(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/40"
        >
          <option value="">Select subject…</option>
          {['Physics','Chemistry','Math','Botany','Zoology','English','Bangla','ICT'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="number" min="1" max="360"
          placeholder="Duration (minutes)"
          value={minutes} onChange={e => setMinutes(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
        />
        <textarea
          rows={2} placeholder="Notes (optional)…"
          value={notes} onChange={e => setNotes(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none resize-none"
        />
        <button
          onClick={handleSave} disabled={saving}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-semibold disabled:opacity-50 transition-all"
        >
          {saving ? 'Saving…' : 'Log Session'}
        </button>
      </div>
    </div>
  );
}

export default function CheckinPage() {
  const user  = useAuthStore(s => s.user);
  const today = getBSTDateString();
  const day   = getBSTDayName();
  const schedule = WEEKLY_SCHEDULE[day];
  const isBreak  = !schedule;

  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [refresh,  setRefresh]  = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    getTodaySessions(user.uid, today).then(s => {
      setSessions(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.uid, today, refresh]);

  const getLog = (sessionNumber) =>
    sessions.find(s => s.sessionNumber === sessionNumber && s.type === 'scheduled');

  const totalMinutes = sessions.reduce((a, s) => a + (s.durationMinutes || 0), 0);

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{day}, {today}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {isBreak ? '🌴 Break day — log practice sessions below' : '📋 Log your scheduled study sessions'}
          </p>
        </div>
        {totalMinutes > 0 && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Today</p>
            <p className="text-sm font-bold text-cyan-400">{formatDuration(totalMinutes)}</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Scheduled sessions */}
          {!isBreak && schedule && Object.entries(schedule).map(([slotNum, subjects]) => (
            <SessionCard
              key={slotNum}
              sessionNumber={Number(slotNum)}
              subjects={subjects}
              slotMeta={SESSION_SLOTS[slotNum] || { label: `S${slotNum}`, time: '' }}
              log={getLog(Number(slotNum))}
              today={today}
              uid={user?.uid}
              displayName={user?.displayName}
              onSaved={() => setRefresh(r => r + 1)}
            />
          ))}

          {/* Custom sessions logged today */}
          {sessions.filter(s => s.type === 'custom').map(s => (
            <div key={s.id} className="rounded-2xl border border-cyan-500/10 bg-cyan-500/[0.02] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-cyan-400" />
                  <span className="text-sm text-white">{s.subject}</span>
                  <span className="text-xs text-slate-500">— {formatDuration(s.durationMinutes || 0)}</span>
                </div>
                <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">Custom</span>
              </div>
              {s.notes && <p className="text-xs text-slate-500 mt-1.5 ml-6">{s.notes}</p>}
            </div>
          ))}

          {/* Practice logger (break days always, other days optionally) */}
          <PracticeLogger
            today={today}
            uid={user?.uid}
            displayName={user?.displayName}
            onSaved={() => setRefresh(r => r + 1)}
          />

          {/* Empty state for weekdays */}
          {!isBreak && !schedule && (
            <div className="text-center py-8 text-slate-600 text-sm">No sessions scheduled today.</div>
          )}
        </div>
      )}
    </div>
  );
}
