import { useState, useEffect, useCallback } from 'react';
import { Plus, LayoutDashboard, CalendarDays, Clock, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store';
import {
  subscribeToRoutineDefinitions,
  subscribeToSessionLogs,
  subscribeToAllScheduleEntries,
} from '../firebase/db';
import { getBSTDateString, getBSTDayName } from '../lib/bst';
import OverviewTab  from '../components/checkin/OverviewTab';
import RoutineTab   from '../components/checkin/RoutineTab';
import HistoryTab   from '../components/checkin/HistoryTab';
import StatsTab     from '../components/checkin/StatsTab';
import NewCheckinModal from '../components/checkin/NewCheckinModal';

const TABS = [
  { id: 'overview',  label: 'Overview',   icon: LayoutDashboard },
  { id: 'routine',   label: 'Routine',    icon: CalendarDays    },
  { id: 'history',   label: 'History',    icon: Clock           },
  { id: 'statistics',label: 'Statistics', icon: BarChart2       },
];

export default function CheckInCenterPage() {
  const user    = useAuthStore(s => s.user);
  const today   = getBSTDateString();
  const dayName = getBSTDayName();

  const [activeTab,      setActiveTab]      = useState('overview');
  const [modalOpen,      setModalOpen]      = useState(false);
  const [routineDefs,    setRoutineDefs]    = useState([]);
  const [sessionLogs,    setSessionLogs]    = useState([]);
  const [allSchedule,    setAllSchedule]    = useState([]);
  const [todaySchedule,  setTodaySchedule]  = useState([]);
  const [loadingInit,    setLoadingInit]    = useState(true);

  // ── Real-time subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;

    // Safety timeout — never leave stuck in loading state
    const safetyTimer = setTimeout(() => setLoadingInit(false), 5000);

    const unsubDefs = subscribeToRoutineDefinitions(
      user.uid,
      (defs) => { setRoutineDefs(defs); setLoadingInit(false); },
      (err)  => { console.error('[CheckInCenter] routineDefinitions:', err); setLoadingInit(false); }
    );

    const unsubLogs = subscribeToSessionLogs(
      user.uid,
      (logs) => setSessionLogs(logs),
      (err)  => console.error('[CheckInCenter] sessionLogs:', err)
    );

    const unsubSched = subscribeToAllScheduleEntries(
      user.uid,
      (entries) => {
        setAllSchedule(entries);
        setTodaySchedule(entries.filter(e => e.date === today));
      },
      (err) => console.error('[CheckInCenter] schedule:', err)
    );

    return () => {
      clearTimeout(safetyTimer);
      unsubDefs();
      unsubLogs();
      unsubSched();
    };
  }, [user?.uid, today]);

  const handleRefresh = useCallback(() => {
    // Real-time subscriptions handle refresh automatically.
    // This callback is passed to children that need to trigger refresh hints.
  }, []);

  if (!user?.uid) return null;

  return (
    <div className="min-h-screen p-4 lg:p-6 max-w-3xl mx-auto">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Check-In Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            {dayName} · {today}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20 shrink-0"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">New Session</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* ── Tab navigation ───────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1.5 mb-6 overflow-x-auto scrollbar-hide">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-1 justify-center ${
              activeTab === id
                ? 'text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {activeTab === id && (
              <motion.div
                layoutId="tab-pill"
                className="absolute inset-0 bg-white/10 rounded-xl border border-white/[0.12]"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <Icon size={14} />
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {loadingInit && activeTab !== 'statistics' ? (
          <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'overview' && (
              <OverviewTab
                routineDefs={routineDefs}
                sessionLogs={sessionLogs}
                scheduleEntries={todaySchedule}
                onRefresh={handleRefresh}
              />
            )}
            {activeTab === 'routine' && (
              <RoutineTab
                routineDefs={routineDefs}
                onRefresh={handleRefresh}
              />
            )}
            {activeTab === 'history' && (
              <HistoryTab
                sessionLogs={sessionLogs}
                scheduleEntries={allSchedule}
                routineDefs={routineDefs}
                onRefresh={handleRefresh}
              />
            )}
            {activeTab === 'statistics' && (
              <StatsTab />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── New session modal ─────────────────────────────────────────────── */}
      <NewCheckinModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => setModalOpen(false)}
      />
    </div>
  );
}
