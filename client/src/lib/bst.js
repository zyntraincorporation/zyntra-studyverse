// ─────────────────────────────────────────────────────────────────────────────
// BST (Bangladesh Standard Time) Utilities — UTC+6
// Mirrors the server-side schedule logic for client-side use
// ─────────────────────────────────────────────────────────────────────────────

const BST_OFFSET_MS = 6 * 60 * 60 * 1000;

function getBSTNow() {
  return new Date(Date.now() + BST_OFFSET_MS);
}

export function getBSTDateString(date = null) {
  const d = date ? new Date(date.getTime() + BST_OFFSET_MS) : getBSTNow();
  const y   = d.getUTCFullYear();
  const m   = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getBSTDayName(date = null) {
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const d = date ? new Date(date.getTime() + BST_OFFSET_MS) : getBSTNow();
  return DAYS[d.getUTCDay()];
}

export function getBSTTime() {
  const d = getBSTNow();
  return { hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

export function getBSTYearMonth() {
  const d = getBSTNow();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00+06:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return getBSTDateString(d);
}

export function getDateRange(days = 7) {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    result.push({ date: getBSTDateString(d), day: getBSTDayName(d) });
  }
  return result;
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function minutesToHoursDecimal(minutes) {
  return (minutes / 60).toFixed(1);
}

// Weekly schedule for session engine
export const WEEKLY_SCHEDULE = {
  Sunday:    { 1: ['Botany'],    2: ['Physics'],    3: ['Math', 'Physics'] },
  Monday:    { 1: ['Physics'],   2: ['Math'],       3: ['Chemistry', 'Math'] },
  Tuesday:   { 1: ['Chemistry'], 2: ['Zoology'],    3: ['Physics', 'Chemistry'] },
  Wednesday: { 1: ['Botany'],    2: ['Math'],       3: ['Math', 'Chemistry'] },
  Thursday:  { 1: ['Chemistry'], 2: ['Physics'],    3: ['Physics', 'Chemistry'] },
  Friday:    null,
  Saturday:  null,
};

export const SESSION_SLOTS = {
  1: { label: 'S1', time: '5:00–7:00 PM',   startHour: 17, startMin: 0,  endHour: 19, endMin: 0  },
  2: { label: 'S2', time: '7:30–10:00 PM',  startHour: 19, startMin: 30, endHour: 22, endMin: 0  },
  3: { label: 'S3', time: '11:00 PM–1 AM',  startHour: 23, startMin: 0,  endHour: 1,  endMin: 0  },
};

export function formatElapsed(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
