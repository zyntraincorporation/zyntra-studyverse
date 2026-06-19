import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import { useAuthStore } from '../store';
import { getAllScheduleEntries } from '../firebase/db';
import { SUBJECT_DISPLAY_NAMES } from '../lib/chapters-data';
import { getBSTDateString, getBSTTime } from '../lib/bst';

// Helper to check if a session is currently ongoing
function getSessionCategory(entry, today, currentMins) {
  if (entry.status === 'completed') return 'Completed';
  if (entry.status === 'missed') return 'Missed';

  // For pending sessions:
  if (entry.date < today) return 'Missed'; // Past pending sessions are implicitly missed
  if (entry.date > today) return 'Upcoming';

  // Today's pending sessions:
  const startMins = parseTime(entry.time);
  const endMins = parseTime(entry.endTime || getFallbackEndTime(entry.time));

  if (currentMins >= startMins && currentMins <= endMins) return 'Ongoing';
  if (currentMins < startMins) return 'Upcoming';
  return 'Missed'; // Today, but time has passed
}

function parseTime(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function getFallbackEndTime(startTime) {
  if (!startTime) return '23:59';
  const [h, m] = startTime.split(':').map(Number);
  const endH = (h + 2) % 24; // fallback 2 hours
  return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function CheckinHistoryPage() {
  const user = useAuthStore(s => s.user);
  const today = getBSTDateString();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All'); // All, Upcoming, Ongoing, Completed, Missed

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getAllScheduleEntries(user.uid);
      setEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => { load(); }, [load]);

  const { hour, minute } = getBSTTime();
  const currentMins = hour * 60 + minute;

  const categorizedEntries = entries.map(entry => ({
    ...entry,
    category: getSessionCategory(entry, today, currentMins)
  }));

  const filteredEntries = filter === 'All' 
    ? categorizedEntries 
    : categorizedEntries.filter(e => e.category === filter);

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarDays size={20} className="text-cyan-400" /> Check-ins History
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            View all your past, current, and upcoming study sessions
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['All', 'Ongoing', 'Upcoming', 'Completed', 'Missed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filter === f
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <CalendarDays size={32} className="mx-auto mb-3 opacity-20" />
          <p>No check-ins found for this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map(entry => (
            <HistoryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryCard({ entry }) {
  const STATUS_STYLES = {
    Ongoing: 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.3)]',
    Upcoming: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    Completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    Missed: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const statusStyle = STATUS_STYLES[entry.category] || STATUS_STYLES.Upcoming;
  const endTime = entry.endTime || getFallbackEndTime(entry.time);

  return (
    <div className={`rounded-2xl border p-4 transition-all
      ${entry.category === 'Ongoing' ? 'border-blue-500/30 bg-blue-500/[0.05]'
      : entry.category === 'Completed' ? 'border-green-500/20 bg-green-500/[0.03]'
        : entry.category === 'Missed' ? 'border-red-500/20 bg-red-500/[0.03]'
        : 'border-white/10 bg-white/[0.02]'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white bangla">
            {SUBJECT_DISPLAY_NAMES[entry.subject] || entry.subject}
          </p>
          {entry.chapter && <p className="text-xs text-slate-400 mt-0.5 bangla">{entry.chapter}</p>}
          <div className="flex items-center gap-2 mt-2">
             <CalendarDays size={12} className="text-slate-500" />
             <p className="text-[11px] text-slate-500">{entry.date}</p>
             <Clock size={12} className="text-slate-500 ml-2" />
             <p className="text-[11px] text-slate-500">{entry.time} - {endTime}</p>
          </div>
          {entry.notes && <p className="text-[11px] text-slate-600 mt-1.5 bangla italic">"{entry.notes}"</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {entry.category === 'Ongoing' && (
            <span className="relative flex h-2.5 w-2.5 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
          )}
          <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold tracking-wide uppercase ${statusStyle}`}>
            {entry.category}
          </span>
        </div>
      </div>
    </div>
  );
}
