import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Clock, RotateCcw, BookOpen, Monitor, Plus, Trash2, Coffee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimerStore, useAuthStore, useUIStore } from '../store';
import {
  saveSession, getSessionsByDateRange, deleteSession,
  getTodayStudyMinutes, recalculateAndSaveLeaderboard,
  updateChatStudyMinutes, updatePresence, clearPresence,
} from '../firebase/db';
import { getBSTDateString, getBSTDayName, formatDuration } from '../lib/bst';

const SUBJECT_GROUPS = [
  { label: '🔴 BUET Core',   subjects: ['Physics', 'Chemistry', 'Math'] },
  { label: '🟡 HSC / Other', subjects: ['Botany', 'Zoology', 'English', 'Bangla', 'ICT', 'Other'] },
];

const POMODORO_PRESETS = [
  { label: '25/5',  work: 25, brk: 5,  desc: 'Classic Pomodoro' },
  { label: '45/10', work: 45, brk: 10, desc: 'Deep work' },
  { label: '50/10', work: 50, brk: 10, desc: 'Study marathon' },
  { label: '90/20', work: 90, brk: 20, desc: 'Ultradian' },
];

const STUDY_TYPES = [
  { key: 'self',   label: '📖 Self Study'   },
  { key: 'online', label: '🖥️ Online Class' },
];

function formatElapsed(secs) {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ── Free Timer ────────────────────────────────────────────────────────────────
function FreeTimer() {
  const user  = useAuthStore(s => s.user);
  const toast = useUIStore(s => s.toast);
  const { isRunning, subject, studyType, elapsed, start, stop, reset } = useTimerStore();

  const [selSubject,   setSelSubject]   = useState('Physics');
  const [selStudyType, setSelStudyType] = useState('self');
  const [selChapter,   setSelChapter]   = useState('');

  const handleStart = async () => {
    start(selSubject, selStudyType, selChapter || null);
    await updatePresence(user.uid, {
      isStudying: true, subject: selSubject, chapter: selChapter || null,
      startedAt: new Date().toISOString(),
    }).catch(() => {});
  };

  const handleStop = async () => {
    const result = stop();
    if (result.durationMinutes < 1) { toast('Session too short (< 1 min)', 'error'); return; }

    await clearPresence(user.uid).catch(() => {});
    try {
      await saveSession(user.uid, {
        ...result, type: 'custom', date: getBSTDateString(),
        dayOfWeek: getBSTDayName(), completed: true,
      });
      const mins = await getTodayStudyMinutes(user.uid);
      await recalculateAndSaveLeaderboard(user.uid, user.displayName);
      await updateChatStudyMinutes(user.uid, user.displayName, mins);
      toast(`Session saved — ${formatDuration(result.durationMinutes)} 🎉`, 'success');
    } catch {
      toast('Failed to save session', 'error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Subject selector */}
      {!isRunning && (
        <div className="space-y-3">
          <div className="space-y-2">
            {SUBJECT_GROUPS.map(g => (
              <div key={g.label}>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">{g.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {g.subjects.map(s => (
                    <button key={s} onClick={() => setSelSubject(s)}
                      className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                        selSubject === s
                          ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300 font-medium'
                          : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >{s}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {STUDY_TYPES.map(t => (
              <button key={t.key} onClick={() => setSelStudyType(t.key)}
                className={`flex-1 py-2 rounded-xl text-sm border transition-all ${
                  selStudyType === t.key
                    ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-300'
                    : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white'
                }`}
              >{t.label}</button>
            ))}
          </div>

          <input
            type="text" placeholder="Chapter / topic (optional)"
            value={selChapter} onChange={e => setSelChapter(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
          />
        </div>
      )}

      {/* Timer display */}
      <div className="flex flex-col items-center gap-6 py-6">
        {isRunning && (
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Studying</p>
            <p className="text-lg font-semibold text-cyan-300">{subject}</p>
          </div>
        )}
        <div className="relative">
          <motion.div
            animate={{ scale: isRunning ? [1, 1.02, 1] : 1 }}
            transition={{ duration: 2, repeat: isRunning ? Infinity : 0 }}
            className={`w-44 h-44 rounded-full border-4 flex items-center justify-center font-mono text-4xl font-bold
              ${isRunning ? 'border-cyan-500/40 text-cyan-300 shadow-[0_0_40px_rgba(6,182,212,0.2)]' : 'border-white/10 text-white'}`}
          >
            {formatElapsed(elapsed)}
          </motion.div>
        </div>

        <div className="flex gap-3">
          {!isRunning ? (
            <button onClick={handleStart}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all"
            >
              <Play size={18} /> Start
            </button>
          ) : (
            <>
              <button onClick={handleStop}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 font-semibold hover:bg-red-500/30 transition-all"
              >
                <Square size={18} /> Stop & Save
              </button>
              <button onClick={() => { reset(); clearPresence(user.uid).catch(() => {}); }}
                className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white"
              >
                <RotateCcw size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pomodoro ──────────────────────────────────────────────────────────────────
function PomodoroTimer() {
  const [preset,    setPreset]    = useState(POMODORO_PRESETS[0]);
  const [phase,     setPhase]     = useState('work'); // 'work' | 'break'
  const [running,   setRunning]   = useState(false);
  const [remaining, setRemaining] = useState(POMODORO_PRESETS[0].work * 60);
  const [cycles,    setCycles]    = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    setRemaining(preset.work * 60);
    setPhase('work');
    setRunning(false);
  }, [preset]);

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          if (phase === 'work') { setPhase('break'); setRemaining(preset.brk * 60); setCycles(c => c + 1); }
          else                 { setPhase('work');  setRemaining(preset.work * 60); }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, phase, preset]);

  const total = phase === 'work' ? preset.work * 60 : preset.brk * 60;
  const pct   = 1 - remaining / total;
  const r     = 70, circ = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Presets */}
      <div className="flex flex-wrap gap-2 justify-center">
        {POMODORO_PRESETS.map(p => (
          <button key={p.label} onClick={() => { setPreset(p); setRunning(false); }}
            className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
              preset.label === p.label
                ? 'bg-red-500/20 border-red-500/30 text-red-300'
                : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
            }`}
          >🍅 {p.label}<span className="text-[10px] text-slate-500 ml-1">{p.desc}</span></button>
        ))}
      </div>

      {/* Ring */}
      <div className="relative">
        <svg width={180} height={180} viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <circle cx="90" cy="90" r={r} fill="none"
            stroke={phase === 'work' ? '#06b6d4' : '#22c55e'}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
            transform="rotate(-90 90 90)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-slate-500 uppercase tracking-widest">
            {phase === 'work' ? '📖 Work' : <><Coffee size={10} className="inline" /> Break</>}
          </span>
          <span className="text-3xl font-bold font-mono text-white">{formatElapsed(remaining)}</span>
          <span className="text-xs text-slate-500 mt-1">{cycles} cycles</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => setRunning(v => !v)}
          className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-semibold transition-all ${
            running
              ? 'bg-white/10 border border-white/20 text-white'
              : 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]'
          }`}
        >{running ? <><Square size={16} /> Pause</> : <><Play size={16} /> Start</>}</button>
        <button onClick={() => { setRunning(false); setRemaining(preset.work * 60); setPhase('work'); setCycles(0); }}
          className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white"
        ><RotateCcw size={18} /></button>
      </div>
    </div>
  );
}

// ── Custom Log ────────────────────────────────────────────────────────────────
function CustomLog() {
  const user  = useAuthStore(s => s.user);
  const toast = useUIStore(s => s.toast);
  const [subject,  setSubject]  = useState('Physics');
  const [type,     setType]     = useState('self');
  const [hours,    setHours]    = useState('');
  const [minutes,  setMinutes]  = useState('');
  const [chapter,  setChapter]  = useState('');
  const [notes,    setNotes]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [history,  setHistory]  = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    const start = getBSTDateString(new Date(Date.now() - 7 * 86400000));
    getSessionsByDateRange(user.uid, start, getBSTDateString())
      .then(s => setHistory(s.filter(x => x.type === 'custom').reverse()))
      .catch(() => {});
  }, [user?.uid]);

  const handleSave = async () => {
    const mins = (Number(hours || 0) * 60) + Number(minutes || 0);
    if (!subject) { toast('Select a subject', 'error'); return; }
    if (mins < 1) { toast('Enter valid duration', 'error'); return; }
    setSaving(true);
    try {
      const s = await saveSession(user.uid, {
        type: 'custom', subject, studyType: type,
        chapter: chapter || null, notes: notes || null,
        date: getBSTDateString(), dayOfWeek: getBSTDayName(),
        durationMinutes: mins, completed: true,
      });
      const totalMins = await getTodayStudyMinutes(user.uid);
      await recalculateAndSaveLeaderboard(user.uid, user.displayName);
      await updateChatStudyMinutes(user.uid, user.displayName, totalMins);
      toast(`Logged ${formatDuration(mins)} 📝`, 'success');
      setHours(''); setMinutes(''); setChapter(''); setNotes('');
      // refresh history
      const start2 = getBSTDateString(new Date(Date.now() - 7 * 86400000));
      getSessionsByDateRange(user.uid, start2, getBSTDateString())
        .then(s => setHistory(s.filter(x => x.type === 'custom').reverse())).catch(() => {});
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await deleteSession(id).catch(() => {});
    setHistory(h => h.filter(s => s.id !== id));
    toast('Session deleted', 'info');
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {['Physics','Chemistry','Math','Botany','Zoology','English','Bangla','ICT','Other'].map(s => (
            <button key={s} onClick={() => setSubject(s)}
              className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                subject === s ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300' : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
              }`}
            >{s}</button>
          ))}
        </div>
        <div className="flex gap-2">
          {STUDY_TYPES.map(t => (
            <button key={t.key} onClick={() => setType(t.key)}
              className={`flex-1 py-2 rounded-xl text-sm border transition-all ${
                type === t.key ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-300' : 'bg-white/[0.02] border-white/10 text-slate-400'
              }`}
            >{t.label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="number" min="0" max="24" placeholder="Hours" value={hours} onChange={e => setHours(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none" />
          <input type="number" min="0" max="59" placeholder="Minutes" value={minutes} onChange={e => setMinutes(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none" />
        </div>
        <input type="text" placeholder="Chapter / topic" value={chapter} onChange={e => setChapter(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none" />
        <textarea rows={2} placeholder="Notes…" value={notes} onChange={e => setNotes(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none resize-none" />
        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold disabled:opacity-50"
        >{saving ? 'Saving…' : <><Plus size={15} className="inline mr-1" />Log Session</>}</button>
      </div>

      {history.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Recent (7 days)</p>
          <div className="space-y-2">
            {history.slice(0, 10).map(s => (
              <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div>
                  <span className="text-sm text-white font-medium">{s.subject}</span>
                  <span className="text-xs text-slate-500 ml-2">{s.date}</span>
                  {s.chapter && <span className="text-xs text-slate-600 ml-1">· {s.chapter}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-cyan-400 font-mono">{formatDuration(s.durationMinutes || 0)}</span>
                  <button onClick={() => handleDelete(s.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TimerPage() {
  const [tab, setTab] = useState('free');
  return (
    <div className="p-4 lg:p-6 max-w-xl mx-auto space-y-5 pb-24">
      <div className="flex gap-1 bg-white/[0.03] border border-white/10 rounded-2xl p-1">
        {[{ key:'free', label:'⏱ Free Timer' }, { key:'pomo', label:'🍅 Pomodoro' }, { key:'log', label:'📝 Custom Log' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t.key ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
            }`}
          >{t.label}</button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
          {tab === 'free'  && <FreeTimer />}
          {tab === 'pomo'  && <PomodoroTimer />}
          {tab === 'log'   && <CustomLog />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
