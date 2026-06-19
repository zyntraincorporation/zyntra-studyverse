import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Timer, BarChart2, RotateCcw,
  AlertTriangle, CalendarDays, BookOpen, Sparkles, LogOut,
  Menu, X, Zap, FileText, MessageCircle, Trophy, Library,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useTimerStore } from '../../store';
import { logout as firebaseLogout } from '../../firebase/auth';
import { subscribeToUnreadCount } from '../../firebase/db';
import { usePartnerStats } from '../../hooks/usePartnerStats';
import { useHeartbeat } from '../../hooks/useHeartbeat';
import { getBSTDayName, getBSTTime } from '../../lib/bst';
import NotificationCenter from '../../features/notifications/NotificationCenter';
import { requestPushPermission } from '../../firebase/messaging';

function formatElapsed(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/checkin',    icon: CheckSquare,     label: 'Check-in'     },
  { to: '/timer',      icon: Timer,           label: 'Study Timer'  },
  { to: '/stats',      icon: BarChart2,       label: 'Weekly Stats' },
  { to: '/chapters',   icon: BookOpen,        label: 'Chapters'     },
  { to: '/vocabulary', icon: Library,         label: 'Vocabulary'   },
  { to: '/ai',         icon: Sparkles,        label: 'AI Mentor'    },
  { to: '/routine',    icon: CalendarDays,    label: 'Routine'      },
  { to: '/revision',   icon: RotateCcw,       label: 'Revision'     },
  { to: '/notes',      icon: FileText,        label: 'Daily Notes'  },
  { to: '/mistakes',   icon: AlertTriangle,   label: 'Mistakes'     },
];

const COUPLE_NAV = [
  { to: '/leaderboard', icon: Trophy,         label: 'Leaderboard', highlight: 'gold' },
  { to: '/chat',        icon: MessageCircle,  label: 'Chat',        highlight: 'cyan' },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatUnread,  setChatUnread]  = useState(0);

  const user     = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const location = useLocation();

  const isRunning = useTimerStore(s => s.isRunning);
  const elapsed   = useTimerStore(s => s.elapsed);
  const subject   = useTimerStore(s => s.subject);

  const day  = getBSTDayName();
  const { hour } = getBSTTime();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Unified partner stats (presence + user doc, deduplicated)
  const partnerStats = usePartnerStats();

  // Heartbeat to ping presence.lastSeen while active
  useHeartbeat();

  // Rehydrate timer on mount
  useEffect(() => {
    useTimerStore.getState().rehydrate();
  }, []);

  // Unread chat message count
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToUnreadCount(user.uid, count => {
      setChatUnread(count);
    });
    return unsub;
  }, [user?.uid]);

  // Clear unread badge when user navigates to /chat
  useEffect(() => {
    if (location.pathname === '/chat') {
      setChatUnread(0);
    }
  }, [location.pathname]);

  // Request push permission after first load (silent — no banner here)
  useEffect(() => {
    if (!user?.uid) return;
    if ('Notification' in window && Notification.permission === 'default') {
      // Silently attempt — won't show prompt, just set up if already granted
      requestPushPermission(user.uid).catch(() => {});
    }
  }, [user?.uid]);

  const handleLogout = async () => {
    try {
      await firebaseLogout();
      useAuthStore.getState().logout();
      navigate('/login');
    } catch (_) {}
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#080b14]">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 bg-black/70 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 flex flex-col
        bg-[#0c1220] border-r border-white/[0.06]
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.4)]">
            <Zap size={15} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-wide text-white">ZYNTRA</div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest">StudyVerse</div>
          </div>
          <button className="ml-auto lg:hidden text-white/40 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* User info */}
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <div className="text-[11px] text-white/40">{greeting}</div>
          <div className="text-sm font-semibold text-white mt-0.5">{user?.displayName || 'User'} 👋</div>
          <div className="text-[11px] text-white/30 mt-0.5">{day} · BUET Prep 2027</div>

          {/* Partner status (from unified hook) */}
          {partnerStats.uid && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className={`w-1.5 h-1.5 rounded-full ${partnerStats.isStudying ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-[10px] text-slate-500">
                {partnerStats.isStudying
                  ? `${partnerStats.displayName} studying ${partnerStats.subject}`
                  : `${partnerStats.displayName} offline`
                }
              </span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150
                ${isActive
                  ? 'bg-gradient-to-r from-cyan-500/15 to-purple-500/15 border border-cyan-500/20 text-cyan-300 font-medium'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
                }`
              }
            >
              <Icon size={16} />
              {label}
              {label === 'Study Timer' && isRunning && (
                <span className="ml-auto text-[10px] font-mono text-cyan-400 animate-pulse">
                  {formatElapsed(elapsed)}
                </span>
              )}
            </NavLink>
          ))}

          {/* Divider */}
          <div className="my-2 border-t border-white/[0.06]" />
          <div className="px-3 py-1 text-[10px] text-white/20 uppercase tracking-widest">Couple Zone</div>

          {COUPLE_NAV.map(({ to, icon: Icon, label, highlight }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150
                ${isActive
                  ? `bg-gradient-to-r ${highlight === 'gold' ? 'from-yellow-500/15 to-orange-500/15 border border-yellow-500/20 text-yellow-300' : 'from-cyan-500/15 to-purple-500/15 border border-cyan-500/20 text-cyan-300'} font-medium`
                  : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
                }`
              }
            >
              <Icon size={16} />
              {label}

              {/* Chat unread badge */}
              {to === '/chat' && chatUnread > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto min-w-[18px] h-[18px] rounded-full bg-gradient-to-br from-cyan-500 to-purple-600
                             text-[9px] font-bold text-white flex items-center justify-center px-1
                             shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                >
                  {chatUnread > 9 ? '9+' : chatUnread}
                </motion.span>
              )}

              {/* Partner studying dot (when no unread) */}
              {to === '/chat' && chatUnread === 0 && (
                <span className={`ml-auto w-1.5 h-1.5 rounded-full ${partnerStats.isStudying ? 'bg-green-400 animate-pulse' : 'bg-slate-700'}`} />
              )}

              {/* Leaderboard dot */}
              {to === '/leaderboard' && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* Active timer pill */}
        <AnimatePresence>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="mx-3 mb-2 px-3 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20"
            >
              <div className="text-[10px] text-cyan-400/70 uppercase tracking-wider">Studying now</div>
              <div className="text-sm font-semibold text-cyan-300">{subject}</div>
              <div className="text-xl font-mono text-cyan-400 mt-0.5">{formatElapsed(elapsed)}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Logout */}
        <div className="p-3 border-t border-white/[0.06]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.06] bg-[#0c1220]/80 backdrop-blur-sm lg:px-6 shrink-0">
          <button className="lg:hidden text-white/50 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <PageTitle />
          <div className="ml-auto flex items-center gap-3">
            <BSTClock />
            <NotificationCenter />
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function PageTitle() {
  const location = useLocation();
  const titles = {
    '/':            'Dashboard',
    '/checkin':     'Session Check-in',
    '/timer':       'Study Timer',
    '/stats':       'Weekly Statistics',
    '/chapters':    'Chapter Progress',
    '/vocabulary':  'Vocabulary',
    '/ai':          'AI Mentor',
    '/revision':    'Revision Tracker',
    '/notes':       'Daily Notes',
    '/routine':     'Monthly Routine',
    '/mistakes':    'Mistake Log',
    '/leaderboard': 'Leaderboard',
    '/chat':        'StudyVerse Chat',
  };
  return <h1 className="text-sm font-semibold text-white/80">{titles[location.pathname] || 'ZYNTRA'}</h1>;
}

function BSTClock() {
  const [time, setTime] = useState(() => {
    const { hour, minute } = getBSTTime();
    return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
  });
  useEffect(() => {
    const tick = () => {
      const { hour, minute } = getBSTTime();
      setTime(`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`);
    };
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  return <div className="text-xs font-mono text-white/30 hidden sm:block" title="BST">{time} BST</div>;
}
