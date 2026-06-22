import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Clock, CheckCircle, XCircle, Search, Edit2, Trash2, Calendar as CalendarIcon, X, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useAuthStore } from '../store';
import { subscribeToAllScheduleEntries, updateScheduleEntry, deleteScheduleEntry } from '../firebase/db';
import { SUBJECT_DISPLAY_NAMES } from '../lib/chapters-data';
import { getBSTDateString, getBSTTime } from '../lib/bst';
import { motion, AnimatePresence } from 'framer-motion';

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

function formatDateString(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

export default function CheckinHistoryPage() {
  const user = useAuthStore(s => s.user);
  const today = getBSTDateString();
  
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All'); // All, Today, Tomorrow, Upcoming, Completed, Missed
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null); // specific date from calendar

  const [editingEntry, setEditingEntry] = useState(null);
  const [viewingEntry, setViewingEntry] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    const unsub = subscribeToAllScheduleEntries(user.uid, (data) => {
      setEntries(data);
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  const { hour, minute } = getBSTTime();
  const currentMins = hour * 60 + minute;

  const categorizedEntries = entries.map(entry => ({
    ...entry,
    category: getSessionCategory(entry, today, currentMins)
  }));

  const getTomorrowDateString = () => {
    const d = new Date(`${today}T00:00:00+06:00`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().split('T')[0];
  };
  const tomorrow = getTomorrowDateString();

  let filteredEntries = categorizedEntries;

  if (selectedDate) {
    filteredEntries = categorizedEntries.filter(e => e.date === selectedDate);
  } else {
    if (filter === 'Today') {
      filteredEntries = categorizedEntries.filter(e => e.date === today);
    } else if (filter === 'Tomorrow') {
      filteredEntries = categorizedEntries.filter(e => e.date === tomorrow);
    } else if (filter === 'Upcoming') {
      filteredEntries = categorizedEntries.filter(e => e.category === 'Upcoming' || e.category === 'Ongoing');
    } else if (filter === 'Completed') {
      filteredEntries = categorizedEntries.filter(e => e.category === 'Completed');
    } else if (filter === 'Missed') {
      filteredEntries = categorizedEntries.filter(e => e.category === 'Missed');
    }
  }

  // Group by Date
  const grouped = {};
  filteredEntries.forEach(entry => {
    if (!grouped[entry.date]) grouped[entry.date] = [];
    grouped[entry.date].push(entry);
  });

  const sortedDates = Object.keys(grouped).sort((a, b) => {
    if (filter === 'Upcoming' || filter === 'Tomorrow') return a.localeCompare(b);
    return b.localeCompare(a); // Default descending
  });

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckSquare size={24} className="text-cyan-400" /> My Check-ins
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your scheduled study sessions and history
          </p>
        </div>
        <button
          onClick={() => {
            setShowCalendar(!showCalendar);
            if (showCalendar) setSelectedDate(null); // clear date if closing calendar
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            showCalendar ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
          }`}
        >
          <CalendarIcon size={16} />
          {showCalendar ? 'Hide Calendar' : 'Calendar View'}
        </button>
      </div>

      <AnimatePresence>
        {showCalendar && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <CalendarWidget
              entries={categorizedEntries}
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                if (selectedDate === date) setSelectedDate(null);
                else setSelectedDate(date);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters (only show if not using specific date) */}
      {!selectedDate && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['All', 'Today', 'Tomorrow', 'Upcoming', 'Completed', 'Missed'].map(f => (
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
      )}

      {selectedDate && (
        <div className="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/20 px-4 py-3 rounded-xl">
          <p className="text-sm text-cyan-300 font-medium">
            Showing check-ins for: {formatDateString(selectedDate)}
          </p>
          <button onClick={() => setSelectedDate(null)} className="text-cyan-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-2xl">
          <CalendarDays size={32} className="mx-auto mb-3 opacity-20 text-slate-400" />
          <p className="text-slate-400 font-medium">No check-ins found</p>
          <p className="text-sm text-slate-500 mt-1">Try changing your filters or selecting a different date.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(date => (
            <div key={date} className="space-y-3">
              <h3 className="text-sm font-bold text-slate-300 border-b border-white/10 pb-2 uppercase tracking-wide">
                {formatDateString(date)}
                {date === today && <span className="ml-2 text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded text-[10px]">TODAY</span>}
                {date === tomorrow && <span className="ml-2 text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded text-[10px]">TOMORROW</span>}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {grouped[date].map(entry => (
                  <HistoryCard
                    key={entry.id}
                    entry={entry}
                    onEdit={() => setEditingEntry(entry)}
                    onView={() => setViewingEntry(entry)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {editingEntry && (
          <EditModal
            entry={editingEntry}
            onClose={() => setEditingEntry(null)}
            userId={user?.uid}
          />
        )}
        {viewingEntry && (
          <DetailsModal
            entry={viewingEntry}
            onClose={() => setViewingEntry(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function HistoryCard({ entry, onEdit, onView }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const user = useAuthStore(s => s.user);

  const STATUS_STYLES = {
    Ongoing: 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.3)]',
    Upcoming: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    Completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    Missed: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const statusStyle = STATUS_STYLES[entry.category] || STATUS_STYLES.Upcoming;
  const endTime = entry.endTime || getFallbackEndTime(entry.time);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (confirmDeleteId === entry.id) {
      if (user?.uid) {
        await deleteScheduleEntry(user.uid, entry.id);
      }
    } else {
      setConfirmDeleteId(entry.id);
      setTimeout(() => setConfirmDeleteId(null), 3000); // reset after 3s
    }
  };

  return (
    <div
      onClick={onView}
      className={`relative group rounded-2xl border p-4 transition-all cursor-pointer hover:bg-white/[0.04]
      ${entry.category === 'Ongoing' ? 'border-blue-500/30 bg-blue-500/[0.05]'
      : entry.category === 'Completed' ? 'border-green-500/20 bg-green-500/[0.03]'
        : entry.category === 'Missed' ? 'border-red-500/20 bg-red-500/[0.03]'
        : 'border-white/10 bg-white/[0.02]'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium text-white bangla truncate">
            {SUBJECT_DISPLAY_NAMES[entry.subject] || entry.subject}
          </p>
          {entry.chapter && <p className="text-sm text-slate-400 mt-0.5 bangla truncate">{entry.chapter}</p>}
          <div className="flex items-center gap-3 mt-3">
             <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg">
                <Clock size={12} className="text-cyan-400" />
                <p className="text-xs font-mono text-slate-300">{entry.time} - {endTime}</p>
             </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center">
            {entry.category === 'Ongoing' && (
              <span className="relative flex h-2.5 w-2.5 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
            )}
            <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold tracking-wide uppercase ${statusStyle}`}>
              {entry.category}
            </span>
          </div>

          {/* Actions (visible on hover or always on touch) */}
          <div className="flex items-center gap-1 mt-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={handleDelete}
              className={`p-1.5 rounded-lg transition-all ${
                confirmDeleteId === entry.id
                  ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)] px-3 text-xs font-bold'
                  : 'text-slate-400 hover:text-red-400 hover:bg-red-400/10'
              }`}
              title="Delete"
            >
              {confirmDeleteId === entry.id ? 'Confirm' : <Trash2 size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ entry, onClose, userId }) {
  const [formData, setFormData] = useState({
    subject: entry.subject || 'physics',
    chapter: entry.chapter || '',
    date: entry.date || '',
    time: entry.time || '',
    endTime: entry.endTime || getFallbackEndTime(entry.time),
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);
    try {
      await updateScheduleEntry(userId, entry.id, formData);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to update entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-[#0f1629] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Edit2 size={18} className="text-cyan-400" /> Edit Check-in
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Subject</label>
            <select
              required
              value={formData.subject}
              onChange={e => setFormData({ ...formData, subject: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
            >
              {Object.entries(SUBJECT_DISPLAY_NAMES).map(([val, label]) => (
                <option key={val} value={val} className="bg-[#0f1629]">{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Chapter / Topic</label>
            <input
              type="text"
              required
              value={formData.chapter}
              onChange={e => setFormData({ ...formData, chapter: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 bangla"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Date</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Start Time</label>
              <input
                type="time"
                required
                value={formData.time}
                onChange={e => setFormData({ ...formData, time: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">End Time</label>
              <input
                type="time"
                required
                value={formData.endTime}
                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
          
          <div className="pt-4 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white">Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function DetailsModal({ entry, onClose }) {
  const createdAt = entry.createdAt?.toDate ? entry.createdAt.toDate().toLocaleString() : new Date(entry.createdAt).toLocaleString();
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-[#0f1629] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/[0.02]">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Info size={18} className="text-cyan-400" /> Check-in Details
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-slate-500 uppercase font-medium">Subject</p>
            <p className="text-base text-white font-semibold mt-0.5">{SUBJECT_DISPLAY_NAMES[entry.subject] || entry.subject}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-medium">Chapter</p>
            <p className="text-base text-white mt-0.5 bangla">{entry.chapter}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase font-medium">Date</p>
              <p className="text-sm text-white mt-0.5">{formatDateString(entry.date)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-medium">Time</p>
              <p className="text-sm text-white mt-0.5 font-mono">{entry.time} - {entry.endTime || getFallbackEndTime(entry.time)}</p>
            </div>
          </div>
          <div className="pt-3 border-t border-white/10">
            <p className="text-xs text-slate-500 uppercase font-medium">Current Status</p>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-sm font-bold text-white bg-white/10 px-2.5 py-1 rounded-md uppercase tracking-wider">{entry.category}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-medium">Created Time</p>
            <p className="text-xs text-slate-400 mt-0.5">{createdAt}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CalendarWidget({ entries, selectedDate, onSelectDate }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const nextMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    setCurrentMonth(next);
  };
  const prevMonth = () => {
    const prev = new Date(currentMonth);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentMonth(prev);
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const monthName = currentMonth.toLocaleString('default', { month: 'long' });

  // Pre-calculate which dates have entries
  const entryCounts = {};
  entries.forEach(e => {
    entryCounts[e.date] = (entryCounts[e.date] || 0) + 1;
  });

  return (
    <div className="bg-[#0f1629] border border-white/10 rounded-2xl p-4 md:p-6 shadow-lg mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">{monthName} {year}</h3>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300">
            <ChevronLeft size={18} />
          </button>
          <button onClick={nextMonth} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-xs font-medium text-slate-500 py-1">{d}</div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1 md:gap-2 text-center">
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="p-2"></div>;
          
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const count = entryCounts[dateStr] || 0;
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === getBSTDateString();

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-all aspect-square
                ${isSelected ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                  : 'bg-white/[0.03] hover:bg-white/10 text-slate-300'}`}
            >
              <span className={`text-sm font-medium ${isToday && !isSelected ? 'text-cyan-400' : ''}`}>
                {day}
              </span>
              
              {count > 0 && (
                <div className="flex gap-0.5 mt-1">
                  {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black/60' : 'bg-cyan-400'}`} />
                  ))}
                  {count > 3 && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black/60' : 'bg-cyan-400'} opacity-50`} />}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
