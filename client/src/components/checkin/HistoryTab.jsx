import { useState, useMemo } from 'react';
import { CalendarDays, Clock, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore, useUIStore } from '../../store';
import { deleteScheduleEntry } from '../../firebase/db';
import { getBSTDateString, getBSTTime, formatDuration } from '../../lib/bst';
import NewCheckinModal from './NewCheckinModal';

const FILTERS = ['All', 'Upcoming', 'Completed', 'Missed', 'Skipped'];

const STATUS_STYLE = {
  completed:   'bg-green-500/20  text-green-400  border-green-500/30',
  missed:      'bg-red-500/20    text-red-400    border-red-500/30',
  skipped:     'bg-slate-500/20  text-slate-400  border-slate-500/30',
  in_progress: 'bg-blue-500/20   text-blue-400   border-blue-500/30',
  upcoming:    'bg-slate-500/10  text-slate-400  border-slate-500/20',
  cancelled:   'bg-slate-700/20  text-slate-500  border-slate-700/30',
};
const STATUS_LABEL = {
  completed: '✅ Completed', missed: '❌ Missed', skipped: '⏭ Skipped',
  in_progress: '▶ In Progress', upcoming: 'Upcoming', cancelled: 'Cancelled',
};

function formatDateHeader(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d, 10)} ${months[parseInt(m,10)-1]} ${y}`;
}

function HistoryCard({ record, onEditSchedule, onDeleteSchedule }) {
  const status = record.status || 'upcoming';
  const style  = STATUS_STYLE[status] || STATUS_STYLE.upcoming;
  const label  = STATUS_LABEL[status] || status;

  return (
    <div className={`rounded-2xl border p-4 transition-all ${
      status === 'completed' ? 'border-green-500/15 bg-green-500/[0.02]'
      : status === 'missed'  ? 'border-red-500/15   bg-red-500/[0.02]'
      : status === 'skipped' ? 'border-slate-500/15 bg-slate-500/[0.02]'
      : 'border-white/10 bg-white/[0.02]'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold tracking-wide uppercase ${style}`}>
              {label}
            </span>
            {record._source === 'routine' && (
              <span className="text-[10px] text-slate-600 bg-white/[0.03] px-2 py-0.5 rounded-full border border-white/[0.06]">Routine</span>
            )}
          </div>
          <p className="text-sm font-semibold text-white">
            {record.title || record.chapter || record.subject || '—'}
          </p>
          {record.chapter && record.title && record.title !== record.chapter && (
            <p className="text-xs text-slate-500 mt-0.5">{record.chapter}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {record.startTime || record.time || '—'}
              {record.durationMinutes ? ` · ${formatDuration(record.durationMinutes)}` : ''}
            </span>
            {record.subject && (
              <span className="text-slate-600">{record.subject}</span>
            )}
          </div>
          {/* Timestamps */}
          {status === 'completed' && record.completedAt && (
            <p className="text-[11px] text-green-400/60 mt-1.5">
              Completed at {new Date(record.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              {record.actualDurationMinutes && ` · ${formatDuration(record.actualDurationMinutes)} actual`}
            </p>
          )}
          {record.notes && <p className="text-xs text-slate-600 mt-1 italic">{record.notes}</p>}
        </div>

        {/* Actions for schedule entries */}
        {record._source === 'schedule' && (
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100">
            <button onClick={() => onEditSchedule?.(record)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/10 transition-colors">
              <Edit2 size={13} />
            </button>
            <button onClick={() => onDeleteSchedule?.(record)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryTab({ sessionLogs, scheduleEntries, routineDefs, onRefresh }) {
  const user  = useAuthStore(s => s.user);
  const toast = useUIStore(s => s.toast);
  const today = getBSTDateString();
  const { hour, minute } = getBSTTime();
  const currentMins = hour * 60 + minute;

  const [filter,        setFilter]       = useState('All');
  const [editEntry,     setEditEntry]    = useState(null);
  const [confirmDelete, setConfirmDelete]= useState(null);

  // Compute effective status for schedule entries
  function getSchedStatus(entry) {
    if (entry.status && entry.status !== 'pending') return entry.status;
    if (entry.date < today) return 'missed';   // past pending = implicitly missed
    if (entry.date > today) return 'upcoming';
    // Today
    const startMins = (() => { const [h,m] = (entry.time||'00:00').split(':').map(Number); return h*60+m; })();
    const endMins   = (() => {
      if (entry.endTime) { const [h,m]=entry.endTime.split(':').map(Number); return h*60+m; }
      return startMins + 120;
    })();
    if (currentMins < startMins) return 'upcoming';
    if (currentMins <= endMins)  return 'in_progress';
    return 'missed';
  }

  // Merge all records
  const allRecords = useMemo(() => {
    const recs = [];

    // Session logs from routines
    sessionLogs.forEach(log => {
      const def = routineDefs.find(d => d.id === log.routineDefinitionId);
      recs.push({
        ...log,
        _source:  'routine',
        _sortKey: `${log.date}_${log.startTime || '00:00'}`,
        title:    log.title || (def ? def.title || def.subject : log.subject),
      });
    });

    // Schedule entries
    scheduleEntries.forEach(entry => {
      const st = getSchedStatus(entry);
      recs.push({
        ...entry,
        status:   st,
        startTime: entry.time,
        title:    entry.chapter || entry.subject,
        _source:  'schedule',
        _sortKey: `${entry.date}_${entry.time || '00:00'}`,
      });
    });

    return recs.sort((a, b) => b._sortKey.localeCompare(a._sortKey));
  }, [sessionLogs, scheduleEntries, routineDefs, today, currentMins]);

  // Filter
  const filtered = useMemo(() => {
    if (filter === 'All')       return allRecords;
    if (filter === 'Upcoming')  return allRecords.filter(r => r.status === 'upcoming' || r.status === 'in_progress');
    if (filter === 'Completed') return allRecords.filter(r => r.status === 'completed');
    if (filter === 'Missed')    return allRecords.filter(r => r.status === 'missed');
    if (filter === 'Skipped')   return allRecords.filter(r => r.status === 'skipped');
    return allRecords;
  }, [allRecords, filter]);

  // Group by date
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const d = r.date;
      if (!map[d]) map[d] = [];
      map[d].push(r);
    });
    const sortedDates = Object.keys(map).sort((a,b) =>
      filter === 'Upcoming' ? a.localeCompare(b) : b.localeCompare(a)
    );
    return sortedDates.map(date => ({ date, records: map[date] }));
  }, [filtered, filter]);

  const handleDeleteSchedule = async (entry) => {
    if (confirmDelete !== entry.id) {
      setConfirmDelete(entry.id);
      setTimeout(() => setConfirmDelete(null), 3000);
      return;
    }
    try {
      await deleteScheduleEntry(user.uid, entry.id);
      toast('Session deleted', 'info');
      setConfirmDelete(null);
      onRefresh();
    } catch { toast('Failed to delete', 'error'); }
  };

  return (
    <div className="space-y-5">
      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap border transition-all ${
              filter === f
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                : 'bg-white/[0.03] text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
            }`}>
            {f}
            {f === 'All' && allRecords.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{allRecords.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Grouped records */}
      {grouped.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-10 text-center">
          <CalendarDays size={32} className="mx-auto mb-3 opacity-20 text-slate-400" />
          <p className="text-slate-400 font-medium">No check-ins found</p>
          <p className="text-sm text-slate-600 mt-1">
            {filter === 'All' ? 'Complete some sessions to see your history.' : `No ${filter.toLowerCase()} sessions.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ date, records }) => (
            <div key={date}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-white/[0.06] pb-2">
                {formatDateHeader(date)}
                {date === today && (
                  <span className="text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded text-[10px] normal-case tracking-normal">Today</span>
                )}
                <span className="text-slate-700 font-normal">{records.length} session{records.length !== 1 ? 's' : ''}</span>
              </h3>
              <div className="group space-y-3">
                {records.map(rec => (
                  <HistoryCard
                    key={rec.id || rec._sortKey}
                    record={rec}
                    onEditSchedule={(e) => setEditEntry(e)}
                    onDeleteSchedule={handleDeleteSchedule}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit schedule entry modal */}
      <NewCheckinModal
        isOpen={!!editEntry}
        onClose={() => setEditEntry(null)}
        onSaved={() => { setEditEntry(null); onRefresh(); }}
        editing={editEntry}
        editType="schedule"
      />
    </div>
  );
}
