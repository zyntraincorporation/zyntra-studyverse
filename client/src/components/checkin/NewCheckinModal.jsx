import { useState, useEffect } from 'react';
import { X, Clock, Calendar, Bell, Repeat, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '../../store';
import {
  createRoutineDefinition, updateRoutineDefinition,
  createScheduleEntry, updateScheduleEntry,
} from '../../firebase/db';
import { getBSTDateString } from '../../lib/bst';

const SUBJECTS = ['Physics', 'Chemistry', 'Math', 'Botany', 'Zoology', 'English', 'Bangla', 'ICT'];
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = { Sunday: 'Sun', Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };
const DURATION_PRESETS = [30, 45, 60, 90, 120];
const REMINDER_PRESETS = [0, 5, 10, 15, 30];

function computeEndTime(startTime, durationMinutes) {
  if (!startTime) return '';
  const [h, m] = startTime.split(':').map(Number);
  const totalMins = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMins / 60) % 24;
  const endM = totalMins % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

// editing: existing routineDefinition or schedule entry to edit (null = create new)
// editType: 'routine' | 'schedule' | null
export default function NewCheckinModal({ isOpen, onClose, onSaved, editing = null, editType = null }) {
  const user  = useAuthStore(s => s.user);
  const toast = useUIStore(s => s.toast);

  const [title,       setTitle]       = useState('');
  const [subject,     setSubject]     = useState('Physics');
  const [chapter,     setChapter]     = useState('');
  const [topic,       setTopic]       = useState('');
  const [repeat,      setRepeat]      = useState('weekly');   // 'weekly' | 'daily' | 'once'
  const [selectedDays,setSelectedDays]= useState(['Monday']);
  const [startTime,   setStartTime]   = useState('19:00');
  const [duration,    setDuration]    = useState(60);
  const [reminder,    setReminder]    = useState(10);
  const [specificDate,setSpecificDate]= useState(() => getBSTDateString());
  const [notes,       setNotes]       = useState('');
  const [saving,      setSaving]      = useState(false);

  // Pre-fill when editing
  useEffect(() => {
    if (!editing) return;
    setTitle(editing.title || '');
    setSubject(editing.subject || 'Physics');
    setChapter(editing.chapter || '');
    setTopic(editing.topic || '');
    setNotes(editing.notes || '');

    if (editType === 'routine') {
      setRepeat(editing.repeat || 'weekly');
      setSelectedDays(editing.daysOfWeek || ['Monday']);
      setStartTime(editing.startTime || '19:00');
      setDuration(editing.durationMinutes || 60);
      setReminder(editing.reminderMinutes ?? 10);
    } else {
      // schedule entry
      setRepeat('once');
      setSpecificDate(editing.date || getBSTDateString());
      setStartTime(editing.time || '19:00');
      // compute duration from time + endTime
      if (editing.time && editing.endTime) {
        const [sh, sm] = editing.time.split(':').map(Number);
        const [eh, em] = editing.endTime.split(':').map(Number);
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff > 0) setDuration(diff);
      }
    }
  }, [editing, editType]);

  const toggleDay = (day) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (!subject) { toast('Subject is required', 'error'); return; }
    if (repeat === 'weekly' && selectedDays.length === 0) { toast('Select at least one day', 'error'); return; }
    if (!startTime) { toast('Start time is required', 'error'); return; }

    setSaving(true);
    try {
      if (repeat === 'once') {
        // One-off → users/{uid}/schedule (existing system)
        const data = {
          subject, chapter, topic, notes,
          date:    specificDate,
          time:    startTime,
          endTime: computeEndTime(startTime, duration),
        };
        if (editing && editType === 'schedule') {
          await updateScheduleEntry(user.uid, editing.id, data);
          toast('Schedule updated ✓', 'success');
        } else {
          await createScheduleEntry(user.uid, data);
          toast('Session scheduled! 📅', 'success');
        }
      } else {
        // Recurring → users/{uid}/routineDefinitions
        const daysToUse = repeat === 'daily' ? DAYS_OF_WEEK : selectedDays;
        const data = {
          title:           title || `${subject}${chapter ? ' — ' + chapter : ''}`,
          subject, chapter, topic, notes,
          daysOfWeek:      daysToUse,
          startTime,
          durationMinutes: duration,
          reminderMinutes: reminder,
          repeat,
          isActive:        true,
        };
        if (editing && editType === 'routine') {
          await updateRoutineDefinition(user.uid, editing.id, data);
          toast('Routine updated ✓', 'success');
        } else {
          await createRoutineDefinition(user.uid, data);
          toast('Routine created! 🔁', 'success');
        }
      }
      onSaved?.();
      handleClose();
    } catch (err) {
      console.error(err);
      toast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!editing) {
      setTitle(''); setSubject('Physics'); setChapter(''); setTopic('');
      setRepeat('weekly'); setSelectedDays(['Monday']); setStartTime('19:00');
      setDuration(60); setReminder(10); setNotes('');
      setSpecificDate(getBSTDateString());
    }
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 8 }}
          className="relative w-full max-w-lg bg-[#0f1629] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02] shrink-0">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen size={16} className="text-cyan-400" />
              {editing ? 'Edit Session' : 'New Study Session'}
            </h2>
            <button onClick={handleClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 p-5 space-y-5">

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Subject <span className="text-cyan-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map(s => (
                  <button key={s} onClick={() => setSubject(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      subject === s
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Title / Chapter / Topic */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Session Title (optional)</label>
                <input
                  type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder={`e.g. ${subject} Chapter 03`}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Chapter</label>
                <input
                  type="text" value={chapter} onChange={e => setChapter(e.target.value)}
                  placeholder="Chapter 03"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Topic</label>
                <input
                  type="text" value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder="Newton's Laws"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-colors"
                />
              </div>
            </div>

            {/* Repeat */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Repeat size={11} /> Repeat
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'daily',  label: 'Daily'  },
                  { value: 'once',   label: 'Once'   },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setRepeat(opt.value)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                      repeat === opt.value
                        ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Day selector (weekly) */}
            <AnimatePresence>
              {repeat === 'weekly' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Days</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {DAYS_OF_WEEK.map(day => (
                      <button key={day} onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          selectedDays.includes(day)
                            ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                            : 'bg-white/[0.03] border-white/10 text-slate-500 hover:text-white'
                        }`}>
                        {DAY_SHORT[day]}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
              {repeat === 'once' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar size={11} /> Date
                  </label>
                  <input type="date" value={specificDate} onChange={e => setSpecificDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/40" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Time + Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Clock size={11} /> Start Time
                </label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/40" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  End Time (auto)
                </label>
                <div className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2.5 text-slate-400 text-sm font-mono">
                  {computeEndTime(startTime, duration) || '—'}
                </div>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Duration (minutes)</label>
              <div className="flex gap-2 flex-wrap">
                {DURATION_PRESETS.map(d => (
                  <button key={d} onClick={() => setDuration(d)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      duration === d
                        ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                    }`}>
                    {d}m
                  </button>
                ))}
                <input
                  type="number" min="5" max="480" value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs text-center focus:outline-none focus:border-cyan-500/40"
                />
              </div>
            </div>

            {/* Reminder (only for recurring) */}
            {repeat !== 'once' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Bell size={11} /> Reminder
                </label>
                <div className="flex gap-2 flex-wrap">
                  {REMINDER_PRESETS.map(r => (
                    <button key={r} onClick={() => setReminder(r)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        reminder === r
                          ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                          : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                      }`}>
                      {r === 0 ? 'None' : `${r}m before`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Notes (optional)</label>
              <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Any notes for this session…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 resize-none transition-colors" />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-5 py-4 border-t border-white/10 bg-white/[0.02] shrink-0">
            <button onClick={handleClose}
              className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm hover:bg-white/10 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20">
              {saving ? 'Saving…' : editing ? 'Save Changes' : repeat === 'once' ? 'Schedule Session' : 'Create Routine'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
