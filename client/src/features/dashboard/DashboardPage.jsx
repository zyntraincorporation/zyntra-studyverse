import { useState, useEffect, useCallback } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import { Settings, Plus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store';
import { saveWidgetLayout, getWidgetLayout } from '../../firebase/db';
import { getBSTDateString, getBSTDayName, getBSTTime } from '../../lib/bst';
import LiveStudyBanner from '../presence/LiveStudyBanner';

import BuetCountdownWidget  from './widgets/BuetCountdownWidget';
import StudyStreakWidget     from './widgets/StudyStreakWidget';
import PartnerStatusWidget  from './widgets/PartnerStatusWidget';
import LeaderboardWidget    from './widgets/LeaderboardWidget';
import VocabProgressWidget  from './widgets/VocabProgressWidget';
import UpcomingScheduleWidget from './widgets/UpcomingScheduleWidget';
import WeeklyAnalyticsWidget from './widgets/WeeklyAnalyticsWidget';
import ChatStatusWidget     from './widgets/ChatStatusWidget';
import BuetProgressWidget   from './widgets/BuetProgressWidget';
import HscProgressWidget    from './widgets/HscProgressWidget';

import 'react-grid-layout/css/styles.css';

const ResponsiveGrid = WidthProvider(Responsive);

const ALL_WIDGETS = [
  { id: 'buet',        label: 'BUET Countdown',     Component: BuetCountdownWidget,   defaultH: 3 },
  { id: 'streak',      label: 'Study Streak',        Component: StudyStreakWidget,      defaultH: 3 },
  { id: 'partner',     label: 'Partner Status',      Component: PartnerStatusWidget,   defaultH: 3 },
  { id: 'chat',        label: 'Chat Status',         Component: ChatStatusWidget,      defaultH: 3 },
  { id: 'buetprog',   label: 'BUET Chapter Progress',Component: BuetProgressWidget,   defaultH: 5 },
  { id: 'hscprog',    label: 'HSC All Subjects',     Component: HscProgressWidget,    defaultH: 6 },
  { id: 'schedule',    label: "Today's Schedule",   Component: UpcomingScheduleWidget,defaultH: 4 },
  { id: 'analytics',   label: 'Weekly Analytics',    Component: WeeklyAnalyticsWidget, defaultH: 4 },
  { id: 'leaderboard', label: 'Leaderboard',         Component: LeaderboardWidget,     defaultH: 4 },
  { id: 'vocab',       label: 'Vocabulary Progress', Component: VocabProgressWidget,   defaultH: 3 },
];

const DEFAULT_LAYOUT = {
  lg: [
    { i: 'buet',     x: 0, y: 0,  w: 1, h: 3 },
    { i: 'streak',   x: 1, y: 0,  w: 1, h: 3 },
    { i: 'partner',  x: 2, y: 0,  w: 1, h: 3 },
    { i: 'chat',     x: 3, y: 0,  w: 1, h: 3 },
    { i: 'buetprog', x: 0, y: 3,  w: 2, h: 5 },
    { i: 'hscprog',  x: 2, y: 3,  w: 2, h: 6 },
    { i: 'schedule', x: 0, y: 8,  w: 2, h: 4 },
    { i: 'analytics',x: 2, y: 9,  w: 2, h: 4 },
    { i: 'leaderboard', x: 0, y: 12, w: 2, h: 4 },
    { i: 'vocab',    x: 2, y: 13, w: 2, h: 3 },
  ],
  md: [
    { i: 'buet',     x: 0, y: 0, w: 1, h: 3 },
    { i: 'streak',   x: 1, y: 0, w: 1, h: 3 },
    { i: 'partner',  x: 0, y: 3, w: 1, h: 3 },
    { i: 'chat',     x: 1, y: 3, w: 1, h: 3 },
    { i: 'buetprog', x: 0, y: 6, w: 2, h: 5 },
    { i: 'hscprog',  x: 0, y: 11,w: 2, h: 6 },
    { i: 'schedule', x: 0, y: 17,w: 2, h: 4 },
    { i: 'analytics',x: 0, y: 21,w: 2, h: 4 },
    { i: 'leaderboard',x:0,y: 25,w: 2, h: 4 },
    { i: 'vocab',    x: 0, y: 29,w: 2, h: 3 },
  ],
  sm: ALL_WIDGETS.map((w, i) => ({ i: w.id, x: 0, y: i * 4, w: 2, h: w.defaultH })),
};

function getGreeting() {
  const { hour } = getBSTTime();
  if (hour < 5)  return 'Still up? 🌙';
  if (hour < 12) return 'Good morning ☀️';
  if (hour < 17) return 'Good afternoon 🌤️';
  if (hour < 21) return 'Good evening 🌆';
  return 'Good night 🌙';
}

export default function DashboardPage() {
  const user    = useAuthStore(s => s.user);
  const [layouts,     setLayouts]     = useState(DEFAULT_LAYOUT);
  const [editMode,    setEditMode]    = useState(false);
  const [activeWidgets, setActiveWidgets] = useState(() => ALL_WIDGETS.map(w => w.id));
  const [showPicker,  setShowPicker]  = useState(false);
  const [saving,      setSaving]      = useState(false);

  // Load saved layout
  useEffect(() => {
    if (!user?.uid) return;
    getWidgetLayout(user.uid).then(saved => {
      if (saved?.layouts)  setLayouts(saved.layouts);
      if (saved?.active)   setActiveWidgets(saved.active);
    }).catch(() => {});
  }, [user?.uid]);

  const handleLayoutChange = useCallback((_, allLayouts) => {
    setLayouts(allLayouts);
  }, []);

  const saveLayout = async () => {
    if (!user?.uid) return;
    setSaving(true);
    await saveWidgetLayout(user.uid, { layouts, active: activeWidgets }).catch(() => {});
    setSaving(false);
    setEditMode(false);
  };

  const toggleWidget = (id) => {
    setActiveWidgets(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  const visibleWidgets = ALL_WIDGETS.filter(w => activeWidgets.includes(w.id));
  const today  = getBSTDateString();
  const day    = getBSTDayName();

  return (
    <div className="min-h-screen bg-[#080b14] pb-24">
      {/* Live study banner */}
      <LiveStudyBanner />

      {/* Page header */}
      <div className="px-4 lg:px-6 pt-5 pb-3 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {getGreeting()} {user?.displayName || ''}! ⚡
          </h1>
          <p className="text-slate-500 text-sm mt-1">{day}, {today} · BUET Prep 2027</p>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button
                onClick={() => setShowPicker(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-slate-300 hover:text-white"
              >
                <Plus size={14} /> Widgets
              </button>
              <button
                onClick={saveLayout}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium"
              >
                {saving ? 'Saving…' : 'Save Layout'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all"
            >
              <Settings size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Widget picker */}
      {showPicker && editMode && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mx-4 lg:mx-6 mb-3 p-4 bg-[#0c1220] border border-white/10 rounded-2xl"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white">Toggle Widgets</p>
            <button onClick={() => setShowPicker(false)} className="text-slate-500 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_WIDGETS.map(w => (
              <button
                key={w.id}
                onClick={() => toggleWidget(w.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                  activeWidgets.includes(w.id)
                    ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                    : 'bg-white/[0.03] border-white/10 text-slate-500 hover:text-white'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Grid */}
      <div className={`px-2 pb-8 ${editMode ? 'select-none' : ''}`}>
        <ResponsiveGrid
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 768, sm: 480, xs: 0 }}
          cols={{ lg: 4, md: 2, sm: 2, xs: 1 }}
          rowHeight={80}
          isDraggable={editMode}
          isResizable={editMode}
          onLayoutChange={handleLayoutChange}
          margin={[12, 12]}
        >
          {visibleWidgets.map(({ id, Component }) => (
            <div key={id} className={`relative ${editMode ? 'cursor-grab active:cursor-grabbing' : ''}`}>
              {editMode && (
                <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-cyan-500/30 z-10 pointer-events-none" />
              )}
              <div className="h-full overflow-hidden rounded-2xl">
                <Component />
              </div>
            </div>
          ))}
        </ResponsiveGrid>
      </div>
    </div>
  );
}
