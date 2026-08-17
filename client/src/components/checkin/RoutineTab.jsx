import { useState } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Clock, ChevronDown, ChevronRight, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '../../store';
import { updateRoutineDefinition, deleteRoutineDefinition } from '../../firebase/db';
import { formatDuration } from '../../lib/bst';
import NewCheckinModal from './NewCheckinModal';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT    = { Sunday:'Sun', Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri', Saturday:'Sat' };

const SUBJECT_COLOR = {
  Physics:   'text-cyan-300   bg-cyan-500/10   border-cyan-500/20',
  Chemistry: 'text-purple-300 bg-purple-500/10 border-purple-500/20',
  Math:      'text-yellow-300 bg-yellow-500/10 border-yellow-500/20',
  Botany:    'text-green-300  bg-green-500/10  border-green-500/20',
  Zoology:   'text-red-300    bg-red-500/10    border-red-500/20',
  English:   'text-blue-300   bg-blue-500/10   border-blue-500/20',
  default:   'text-slate-300  bg-slate-500/10  border-slate-500/20',
};

function RoutineCard({ def, onEdit, onDeleted, onToggled }) {
  const user    = useAuthStore(s => s.user);
  const toast   = useUIStore(s => s.toast);
  const [delArmed, setDelArmed] = useState(false);
  const [toggling, setToggling] = useState(false);

  const cls = SUBJECT_COLOR[def.subject] || SUBJECT_COLOR.default;

  const handleToggle = async () => {
    setToggling(true);
    try {
      await updateRoutineDefinition(user.uid, def.id, { isActive: !def.isActive });
      toast(def.isActive ? 'Routine paused' : 'Routine activated', 'info');
      onToggled();
    } catch { toast('Failed to update', 'error'); }
    finally { setToggling(false); }
  };

  const handleDelete = async () => {
    if (!delArmed) {
      setDelArmed(true);
      setTimeout(() => setDelArmed(false), 3000);
      return;
    }
    try {
      await deleteRoutineDefinition(user.uid, def.id);
      toast('Routine deleted', 'info');
      onDeleted();
    } catch { toast('Failed to delete', 'error'); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 transition-all ${
        def.isActive ? 'border-white/10 bg-white/[0.02]' : 'border-white/[0.05] bg-white/[0.01] opacity-60'
      }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Title + subject badge */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>{def.subject}</span>
            {!def.isActive && (
              <span className="text-[10px] text-slate-600 bg-white/[0.03] px-2 py-0.5 rounded-full border border-white/[0.06]">Paused</span>
            )}
          </div>
          <p className="text-sm font-semibold text-white">{def.title || `${def.subject}${def.chapter ? ' — ' + def.chapter : ''}`}</p>
          {def.chapter && <p className="text-xs text-slate-500 mt-0.5">{def.chapter}</p>}

          {/* Time + duration */}
          <div className="flex items-center gap-3 mt-2.5 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock size={11} /> {def.startTime}
            </span>
            <span>{formatDuration(def.durationMinutes || 60)}</span>
            {def.reminderMinutes > 0 && (
              <span className="text-slate-600">🔔 {def.reminderMinutes}m before</span>
            )}
          </div>

          {/* Days pills */}
          <div className="flex gap-1 mt-2.5 flex-wrap">
            {DAYS_OF_WEEK.map(day => {
              const active = (def.daysOfWeek || []).includes(day);
              return (
                <span key={day} className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                  active
                    ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400'
                    : 'bg-white/[0.02] border-white/[0.05] text-slate-700'
                }`}>
                  {DAY_SHORT[day]}
                </span>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={handleToggle} disabled={toggling}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-cyan-400 transition-colors" title={def.isActive ? 'Pause' : 'Activate'}>
            {def.isActive ? <ToggleRight size={16} className="text-cyan-400" /> : <ToggleLeft size={16} />}
          </button>
          <button onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors">
            <Edit2 size={14} />
          </button>
          <button onClick={handleDelete}
            className={`p-1.5 rounded-lg transition-all text-xs font-bold ${
              delArmed ? 'bg-red-500/20 border border-red-500/30 text-red-400 px-2' : 'hover:bg-white/10 text-slate-500 hover:text-red-400'
            }`}
            title={delArmed ? 'Click again to confirm' : 'Delete'}>
            {delArmed ? 'Confirm' : <Trash2 size={14} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function DayGroup({ dayName, defs, currentDayName, onEdit, onDeleted, onToggled }) {
  const [collapsed, setCollapsed] = useState(false);
  const isToday = dayName === currentDayName;

  return (
    <div>
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between py-2 group"
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold uppercase tracking-widest ${isToday ? 'text-cyan-400' : 'text-slate-500'}`}>
            {dayName}
          </span>
          {isToday && (
            <span className="text-[10px] bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full">Today</span>
          )}
          <span className="text-[10px] text-slate-700">{defs.length} session{defs.length !== 1 ? 's' : ''}</span>
        </div>
        {collapsed
          ? <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400" />
          : <ChevronDown  size={14} className="text-slate-600 group-hover:text-slate-400" />
        }
      </button>
      <AnimatePresence>
        {!collapsed && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="space-y-3 pb-4">
              {defs.map(def => (
                <RoutineCard
                  key={def.id} def={def}
                  onEdit={() => onEdit(def)}
                  onDeleted={onDeleted}
                  onToggled={onToggled}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function RoutineTab({ routineDefs, onRefresh }) {
  const currentDayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Dhaka' }).format(new Date());

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDef, setEditingDef] = useState(null);

  const handleEdit = (def) => {
    setEditingDef(def);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingDef(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingDef(null);
  };

  // Group definitions by day
  const byDay = {};
  DAYS_OF_WEEK.forEach(day => { byDay[day] = []; });
  routineDefs.forEach(def => {
    (def.daysOfWeek || []).forEach(day => {
      if (byDay[day]) byDay[day].push(def);
    });
  });
  // Sort definitions within each day by startTime
  DAYS_OF_WEEK.forEach(day => {
    byDay[day].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  });

  const activeDays = DAYS_OF_WEEK.filter(d => byDay[d].length > 0);

  return (
    <div className="space-y-1">
      {/* Header + Add button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-white">Weekly Routine</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {routineDefs.length > 0
              ? `${routineDefs.filter(d => d.isActive).length} active · ${routineDefs.length} total`
              : 'No routines yet'}
          </p>
        </div>
        <button onClick={handleAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-xs font-semibold hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20">
          <Plus size={14} /> Add Session
        </button>
      </div>

      {activeDays.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
          <CalendarDays size={36} className="mx-auto mb-4 opacity-20 text-slate-400" />
          <p className="text-slate-400 font-semibold">Your routine is empty</p>
          <p className="text-sm text-slate-600 mt-1.5">
            Click "Add Session" to build your weekly study schedule from scratch.
          </p>
          <button onClick={handleAdd}
            className="mt-5 px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/10 transition-colors">
            <Plus size={14} className="inline mr-1.5" />Get Started
          </button>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.05]">
          {DAYS_OF_WEEK.filter(d => byDay[d].length > 0).map(day => (
            <DayGroup
              key={day} dayName={day} defs={byDay[day]}
              currentDayName={currentDayName}
              onEdit={handleEdit}
              onDeleted={onRefresh}
              onToggled={onRefresh}
            />
          ))}
        </div>
      )}

      {/* Show days with no sessions */}
      {activeDays.length > 0 && (
        <div className="pt-4">
          {DAYS_OF_WEEK.filter(d => byDay[d].length === 0).map(day => (
            <button key={day} onClick={handleAdd}
              className="w-full flex items-center gap-3 py-2 px-1 text-left group opacity-40 hover:opacity-70 transition-opacity">
              <span className="text-xs text-slate-600 uppercase tracking-widest w-16">{day}</span>
              <span className="text-xs text-slate-700 group-hover:text-slate-500 flex items-center gap-1 transition-colors">
                <Plus size={11} /> Add session
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Modal */}
      <NewCheckinModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSaved={() => { onRefresh(); handleModalClose(); }}
        editing={editingDef}
        editType={editingDef ? 'routine' : null}
      />
    </div>
  );
}
