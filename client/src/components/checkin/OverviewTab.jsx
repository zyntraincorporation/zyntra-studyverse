import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Play, SkipForward, AlertCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '../../store';
import { saveSessionLog, updateScheduleEntry, getTargets } from '../../firebase/db';
import { getBSTDateString, getBSTDayName, getBSTTime, formatDuration, getBSTYearMonth } from '../../lib/bst';

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

function parseTimeMins(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Compute live status for a session that has no log yet
function inferStatus(startTime, durationMinutes, currentMins) {
  const startMins = parseTimeMins(startTime);
  const endMins   = startMins + (durationMinutes || 60);
  if (currentMins < startMins) return 'upcoming';
  if (currentMins <= endMins)  return 'live';
  return 'overdue';          // time passed, not completed
}

function SessionCard({ session, userId, today, currentMins, onUpdated }) {
  const toast   = useUIStore(s => s.toast);
  const [saving, setSaving]           = useState(false);
  const [missForm, setMissForm]       = useState(false);
  const [showSkipConfirm, setSkipConfirm] = useState(false);

  const status     = session.log?.status || inferStatus(session.startTime, session.durationMinutes, currentMins);
  const isRoutine  = session.type === 'routine';
  const startedAt  = session.log?.startedAt;

  const doRoutineLog = async (data) => {
    await saveSessionLog(userId, {
      routineDefinitionId: session.def.id,
      date:            today,
      subject:         session.def.subject,
      chapter:         session.def.chapter || '',
      topic:           session.def.topic   || '',
      title:           session.def.title   || session.def.subject,
      startTime:       session.def.startTime,
      durationMinutes: session.def.durationMinutes,
      ...data,
    });
  };

  const doScheduleUpdate = async (data) => {
    await updateScheduleEntry(userId, session.entry.id, data);
  };

  const handleStart = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (isRoutine) {
        await doRoutineLog({ status: 'in_progress', startedAt: now });
      } else {
        await doScheduleUpdate({ status: 'in_progress', startedAt: now });
      }
      toast('Session started! 📚', 'success');
      onUpdated();
    } catch { toast('Failed to start', 'error'); }
    finally { setSaving(false); }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      let actualDurationMinutes = null;
      if (startedAt) {
        actualDurationMinutes = Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);
      }
      if (isRoutine) {
        await doRoutineLog({ status: 'completed', completedAt: now, actualDurationMinutes });
      } else {
        await doScheduleUpdate({ status: 'completed', completedAt: now });
      }
      toast('Session completed! 🎉', 'success');
      onUpdated();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (isRoutine) {
        await doRoutineLog({ status: 'skipped', skippedAt: now });
      } else {
        await doScheduleUpdate({ status: 'skipped' });
      }
      toast('Session skipped', 'info');
      setSkipConfirm(false);
      onUpdated();
    } catch { toast('Failed to skip', 'error'); }
    finally { setSaving(false); }
  };

  const handleMiss = async () => {
    setSaving(true);
    try {
      if (isRoutine) {
        await doRoutineLog({ status: 'missed', missedAt: new Date().toISOString() });
      } else {
        await doScheduleUpdate({ status: 'missed' });
      }
      toast('Marked as missed', 'info');
      setMissForm(false);
      onUpdated();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  // Card border/bg by status
  const cardStyle =
    status === 'completed' ? 'border-green-500/20 bg-green-500/[0.03]'
    : status === 'missed'  ? 'border-red-500/20   bg-red-500/[0.03]'
    : status === 'skipped' ? 'border-slate-500/20 bg-slate-500/[0.03]'
    : status === 'live'    ? 'border-blue-500/30  bg-blue-500/[0.04]'
    : status === 'in_progress' ? 'border-blue-500/30 bg-blue-500/[0.04]'
    : 'border-white/10 bg-white/[0.02]';

  const startMins = parseTimeMins(session.startTime);
  const minsUntil = startMins - currentMins;
  const minsLeft  = startMins + (session.durationMinutes || 60) - currentMins;

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 transition-all ${cardStyle}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Time + subject */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
              <Clock size={11} className="shrink-0" />
              {session.startTime}
              {session.durationMinutes ? ` · ${formatDuration(session.durationMinutes)}` : ''}
            </span>
            {isRoutine && (
              <span className="text-[10px] text-slate-600 bg-white/[0.04] px-1.5 py-0.5 rounded-full border border-white/[0.06]">
                Routine
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-white">
            {session.title}
          </p>
          {session.chapter && (
            <p className="text-xs text-slate-500 mt-0.5">{session.chapter}</p>
          )}
          <div className="mt-2">
            <SubjectBadge subject={session.subject} />
          </div>

          {/* Countdown */}
          {(status === 'upcoming' || status === 'live' || status === 'in_progress') && (
            <p className={`text-xs mt-2 font-medium ${
              status === 'live' || status === 'in_progress' ? 'text-blue-400' : 'text-slate-500'
            }`}>
              {status === 'upcoming' && minsUntil > 0
                ? minsUntil === 1 ? 'Starts in 1 min' : minsUntil < 60 ? `Starts in ${minsUntil}m` : `Starts in ${Math.floor(minsUntil/60)}h ${minsUntil%60}m`
                : status === 'live' || status === 'in_progress'
                ? minsLeft > 0 ? `Ends in ${minsLeft}m` : 'Ending now'
                : ''}
            </p>
          )}
          {status === 'completed' && session.log?.completedAt && (
            <p className="text-xs text-green-400/70 mt-1.5">
              ✓ Completed at {new Date(session.log.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              {session.log.actualDurationMinutes && ` · ${formatDuration(session.log.actualDurationMinutes)} actual`}
            </p>
          )}
        </div>

        {/* Status badge */}
        <div className="shrink-0">
          {status === 'completed' && <span className="text-xs bg-green-500/20 border border-green-500/30 text-green-400 px-2.5 py-1 rounded-xl font-medium">✅ Done</span>}
          {status === 'missed'    && <span className="text-xs bg-red-500/20   border border-red-500/30   text-red-400   px-2.5 py-1 rounded-xl font-medium">❌ Missed</span>}
          {status === 'skipped'   && <span className="text-xs bg-slate-500/20 border border-slate-500/30 text-slate-400 px-2.5 py-1 rounded-xl font-medium">⏭ Skipped</span>}
          {(status === 'live' || status === 'in_progress') && (
            <span className="text-xs bg-blue-500/20 border border-blue-500/30 text-blue-400 px-2.5 py-1 rounded-xl font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> Live
            </span>
          )}
          {status === 'upcoming'  && <span className="text-xs bg-slate-500/10 border border-slate-500/20 text-slate-400 px-2.5 py-1 rounded-xl font-medium">Upcoming</span>}
          {status === 'overdue'   && <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-xl font-medium">Overdue</span>}
        </div>
      </div>

      {/* Action buttons */}
      {(status === 'upcoming' || status === 'overdue') && (
        <div className="flex gap-2 mt-3">
          <button onClick={handleStart} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/20 disabled:opacity-50 transition-all">
            <Play size={12} /> Start
          </button>
          <button onClick={handleComplete} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/20 disabled:opacity-50 transition-all">
            <CheckCircle size={12} /> Complete
          </button>
          {!showSkipConfirm ? (
            <button onClick={() => setSkipConfirm(true)} disabled={saving}
              className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-500 hover:text-slate-300 text-xs transition-all">
              <SkipForward size={12} />
            </button>
          ) : (
            <button onClick={handleSkip} disabled={saving}
              className="px-3 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium transition-all">
              Confirm
            </button>
          )}
        </div>
      )}
      {(status === 'live' || status === 'in_progress') && (
        <div className="flex gap-2 mt-3">
          <button onClick={handleComplete} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500/15 border border-green-500/20 text-green-400 text-sm font-semibold hover:bg-green-500/25 disabled:opacity-50 transition-all">
            <CheckCircle size={14} /> Mark Complete
          </button>
          <button onClick={() => setSkipConfirm(v => !v)} disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs hover:text-slate-300 transition-all">
            <SkipForward size={12} />
          </button>
        </div>
      )}
      {showSkipConfirm && status !== 'live' && status !== 'in_progress' && (
        <button onClick={handleSkip} disabled={saving}
          className="w-full mt-2 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
          Confirm Skip
        </button>
      )}

      {/* Missed option always visible for non-completed/skipped */}
      {(status === 'upcoming' || status === 'live' || status === 'in_progress' || status === 'overdue') && !missForm && (
        <button onClick={() => setMissForm(true)}
          className="mt-2 text-xs text-slate-600 hover:text-red-400 transition-colors underline underline-offset-2">
          Mark as missed
        </button>
      )}
      <AnimatePresence>
        {missForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-2">
            <div className="flex gap-2">
              <button onClick={handleMiss} disabled={saving}
                className="flex-1 py-2 rounded-xl bg-red-500/15 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/25 transition-all">
                <XCircle size={12} className="inline mr-1" /> Confirm Missed
              </button>
              <button onClick={() => setMissForm(false)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function OverviewTab({ routineDefs, sessionLogs, scheduleEntries, onRefresh }) {
  const user     = useAuthStore(s => s.user);
  const today    = getBSTDateString();
  const dayName  = getBSTDayName();
  const { hour, minute } = getBSTTime();
  const currentMins = hour * 60 + minute;

  // Monthly targets for "Today's Targets" section
  const [monthTargets, setMonthTargets] = useState([]);
  useEffect(() => {
    if (!user?.uid) return;
    getTargets(user.uid, getBSTYearMonth()).then(data => {
      setMonthTargets(data.chapters || []);
    }).catch(() => {});
  }, [user?.uid]);

  // Build today's session list
  const todaySessions = [];

  // 1. Routine occurrences for today
  routineDefs
    .filter(def => def.isActive && (def.daysOfWeek || []).includes(dayName))
    .forEach(def => {
      const log = sessionLogs.find(l => l.routineDefinitionId === def.id && l.date === today);
      todaySessions.push({
        type: 'routine',
        id:   `routine-${def.id}`,
        def,
        log,
        subject:         def.subject,
        chapter:         def.chapter  || '',
        title:           def.title    || `${def.subject}${def.chapter ? ' — ' + def.chapter : ''}`,
        startTime:       def.startTime,
        durationMinutes: def.durationMinutes,
      });
    });

  // 2. One-off schedule entries for today
  scheduleEntries.forEach(entry => {
    todaySessions.push({
      type:  'schedule',
      id:    `sched-${entry.id}`,
      entry,
      subject:         entry.subject,
      chapter:         entry.chapter || '',
      title:           entry.chapter || entry.subject,
      startTime:       entry.time,
      durationMinutes: entry.endTime
        ? (() => { const [sh,sm]=entry.time.split(':').map(Number); const [eh,em]=entry.endTime.split(':').map(Number); return Math.max(0,(eh*60+em)-(sh*60+sm)); })()
        : 60,
      log: null,  // schedule entries manage their own status field (entry.status)
      // Re-map schedule entry status so SessionCard can use it
      schedStatus: entry.status || 'pending',
    });
  });

  // Sort by startTime
  todaySessions.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  // For schedule entries: inject status into log-like structure
  const enriched = todaySessions.map(s => {
    if (s.type === 'schedule') {
      const st = s.schedStatus;
      if (st !== 'pending') {
        return { ...s, log: { status: st, startedAt: s.entry.startedAt, completedAt: s.entry.completedAt } };
      }
    }
    return s;
  });

  // Progress
  const total     = enriched.length;
  const completed = enriched.filter(s => (s.log?.status || '') === 'completed').length;
  const progress  = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Today's Progress */}
      {total > 0 && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-white">Today's Progress</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {completed} / {total} sessions completed
              </p>
            </div>
            <span className={`text-2xl font-black ${progress >= 80 ? 'text-green-400' : progress >= 50 ? 'text-cyan-400' : 'text-slate-400'}`}>
              {progress}%
            </span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
            />
          </div>
          {/* Mini status row */}
          <div className="flex gap-4 mt-3">
            {[
              { label: 'Done',    count: completed, color: 'text-green-400' },
              { label: 'Missed',  count: enriched.filter(s => (s.log?.status || '') === 'missed').length,  color: 'text-red-400'    },
              { label: 'Skipped', count: enriched.filter(s => (s.log?.status || '') === 'skipped').length, color: 'text-slate-400'  },
              { label: 'Pending', count: enriched.filter(s => !s.log || s.log.status === 'in_progress' || s.log.status === 'pending').length, color: 'text-slate-500' },
            ].map(({ label, count, color }) => count > 0 && (
              <div key={label} className="text-center">
                <p className={`text-base font-bold ${color}`}>{count}</p>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Sessions */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Zap size={12} className="text-cyan-400" />
          {dayName}'s Sessions
        </h3>
        {enriched.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-8 text-center">
            <Clock size={28} className="mx-auto mb-3 opacity-20 text-slate-400" />
            <p className="text-slate-500 text-sm">No sessions scheduled for today</p>
            <p className="text-xs text-slate-600 mt-1">Create a routine or add a one-off session.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {enriched.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                userId={user?.uid}
                today={today}
                currentMins={currentMins}
                onUpdated={onRefresh}
              />
            ))}
          </div>
        )}
      </div>

      {/* Monthly Targets (from RoutinePage) */}
      {monthTargets.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <AlertCircle size={12} className="text-purple-400" />
            Monthly Targets
          </h3>
          <div className="space-y-2">
            {monthTargets.map((t, i) => {
              const STATUS = {
                pending:     { dot: 'bg-slate-500', label: '○', color: 'text-slate-500' },
                in_progress: { dot: 'bg-yellow-400', label: '◑', color: 'text-yellow-400' },
                completed:   { dot: 'bg-green-400',  label: '✓', color: 'text-green-400'  },
                delayed:     { dot: 'bg-red-400',     label: '!', color: 'text-red-400'    },
              };
              const cfg = STATUS[t.status || 'pending'] || STATUS.pending;
              return (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className={`text-sm font-bold ${cfg.color} w-4 text-center`}>{cfg.label}</span>
                  <span className="text-sm text-white flex-1 truncate">{t.chapterName || t.description}</span>
                  {t.subject && (
                    <span className="text-[10px] text-slate-500 bg-white/5 border border-white/[0.06] px-1.5 py-0.5 rounded-full">
                      {t.subject}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
