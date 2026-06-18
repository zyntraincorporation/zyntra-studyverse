import { useMemo } from 'react';
import { getBSTDayName, getBSTDateString, addDays } from '../../../lib/bst';

const WEEKLY_SCHEDULE = {
  Sunday:    { 1: ['Botany'],    2: ['Physics'],    3: ['Math', 'Physics'] },
  Monday:    { 1: ['Physics'],   2: ['Math'],       3: ['Chemistry', 'Math'] },
  Tuesday:   { 1: ['Chemistry'], 2: ['Zoology'],    3: ['Physics', 'Chemistry'] },
  Wednesday: { 1: ['Botany'],    2: ['Math'],       3: ['Math', 'Chemistry'] },
  Thursday:  { 1: ['Chemistry'], 2: ['Physics'],    3: ['Physics', 'Chemistry'] },
  Friday:    null,
  Saturday:  null,
};
const SESSION_SLOTS = {
  1: { label: 'S1 (5–7 PM)',   time: '5:00 PM' },
  2: { label: 'S2 (7:30–10)',  time: '7:30 PM' },
  3: { label: 'S3 (11–1 AM)',  time: '11:00 PM' },
};
const SUBJECT_COLOR = {
  Physics:   'text-cyan-400    bg-cyan-500/10   border-cyan-500/20',
  Chemistry: 'text-purple-400  bg-purple-500/10 border-purple-500/20',
  Math:      'text-yellow-400  bg-yellow-500/10 border-yellow-500/20',
  Botany:    'text-green-400   bg-green-500/10  border-green-500/20',
  Zoology:   'text-red-400     bg-red-500/10    border-red-500/20',
  default:   'text-slate-400   bg-slate-500/10  border-slate-500/20',
};

function getDaySchedule(dayName) {
  const sched = WEEKLY_SCHEDULE[dayName];
  if (!sched) return [];
  return Object.entries(sched).map(([slot, subjects]) => ({
    slot: Number(slot),
    slotLabel: SESSION_SLOTS[slot].label,
    time: SESSION_SLOTS[slot].time,
    subjects,
  }));
}

export default function UpcomingScheduleWidget() {
  const today    = getBSTDayName();
  const tomorrow = useMemo(() => {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return days[(days.indexOf(today) + 1) % 7];
  }, [today]);

  const todaySched    = getDaySchedule(today);
  const tomorrowSched = getDaySchedule(tomorrow);

  const renderDay = (label, schedule, isBreak) => (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">{label}</p>
      {isBreak ? (
        <div className="text-xs text-slate-600 italic">🌴 Break day — rest or self-study</div>
      ) : schedule.length === 0 ? (
        <div className="text-xs text-slate-600">No sessions</div>
      ) : (
        <div className="space-y-2">
          {schedule.map(({ slot, slotLabel, time, subjects }) => (
            <div key={slot} className="flex items-start gap-2">
              <span className="text-[10px] text-slate-600 w-16 shrink-0 mt-0.5">{time}</span>
              <div className="flex flex-wrap gap-1">
                {subjects.map(s => (
                  <span key={s} className={`text-[11px] px-1.5 py-0.5 rounded-md border font-medium ${SUBJECT_COLOR[s] || SUBJECT_COLOR.default}`}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-slate-500 uppercase tracking-widest">Schedule</p>
        <span className="text-lg">📅</span>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto">
        {renderDay(`Today (${today})`, todaySched, !WEEKLY_SCHEDULE[today])}
        <div className="border-t border-white/[0.06] pt-4">
          {renderDay(`Tomorrow (${tomorrow})`, tomorrowSched, !WEEKLY_SCHEDULE[tomorrow])}
        </div>
      </div>
    </div>
  );
}
