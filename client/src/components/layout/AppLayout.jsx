import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Timer, BarChart2, RotateCcw,
  AlertTriangle, CalendarDays, BookOpen, Sparkles, LogOut,
  Menu, X, Zap, FileText, MessageCircle, Trophy, Library,
  ChevronLeft, ChevronRight,
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
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/checkin',    icon: CheckSquare,     label: 'Check-In Center' },
  { to: '/timer',      icon: Timer,           label: 'Study Timer'     },
  { to: '/stats',      icon: BarChart2,       label: 'Weekly Stats'    },
  { to: '/chapters',   icon: BookOpen,        label: 'Chapters'        },
  { to: '/vocabulary', icon: Library,         label: 'Vocabulary'      },
  { to: '/ai',         icon: Sparkles,        label: 'AI Mentor'       },
  { to: '/routine',    icon: CalendarDays,    label: 'Routine'         },
  { to: '/revision',   icon: RotateCcw,       label: 'Revision'        },
  { to: '/notes',      icon: FileText,        label: 'Daily Notes'     },
  { to: '/mistakes',   icon: AlertTriangle,   label: 'Mistakes'        },
];

const COUPLE_NAV = [
  { to: '/leaderboard', icon: Trophy,         label: 'Leaderboard', highlight: 'gold' },
  { to: '/chat',        icon: MessageCircle,  label: 'Chat',        highlight: 'cyan' },
];

/* Tooltip shown on hover when sidebar is collapsed */
function NavTooltip({ label, children }) {
  return (
    <div className="relative group/tip flex items-center justify-center w-full">
      {children}
      <div
        className="
          pointer-events-none absolute left-full ml-3 z-50
          px-2.5 py-1.5 rounded-lg
          bg-[#1a2235] border border-white/10
          text-xs font-medium text-white/90
          whitespace-nowrap shadow-xl
          opacity-0 group-hover/tip:opacity-100
          -translate-x-1.5 group-hover/tip:translate-x-0
          transition-all duration-150
        "
      >
        {label}
      </div>
    </div>
  );
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('zyntra_sidebar_collapsed') === 'true'; }
    catch { return false; }
  });
  const [chatUnread, setChatUnread] = useState(0);

  const user     = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const location = useLocation();

  const isRunning = useTimerStore(s => s.isRunning);
  const elapsed   = useTimerStore(s => s.elapsed);
  const subject   = useTimerStore(s => s.subject);

  const day  = getBSTDayName();
  const { hour } = getBSTTime();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const partnerStats = usePartnerStats();
  useHeartbeat();

  /* Persist collapse state */
  useEffect(() => {
    try { localStorage.setItem('zyntra_sidebar_collapsed', sidebarCollapsed); }
    catch {}
  }, [sidebarCollapsed]);

  /* Rehydrate timer */
  useEffect(() => {
    useTimerStore.getState().rehydrate();
  }, []);

  /* Unread chat count */
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToUnreadCount(user.uid, count => setChatUnread(count));
    return unsub;
  }, [user?.uid]);

  /* Clear badge on /chat */
  useEffect(() => {
    if (location.pathname === '/chat') setChatUnread(0);
  }, [location.pathname]);

  /* Push permission */
  useEffect(() => {
    if (!user?.uid) return;
    if ('Notification' in window && Notification.permission === 'default') {
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

  const toggleCollapse = () => setSidebarCollapsed(v => !v);

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

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        style={{ transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)' }}
        className={`
          fixed inset-y-0 left-0 z-30 flex flex-col
          bg-[#0c1220] border-r border-white/[0.06]
          transform transition-[width,transform] duration-[240ms]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:shrink-0
          ${sidebarCollapsed ? 'w-[68px]' : 'w-64'}
        `}
      >
        {/* ── Logo row ── */}
        <div className={`
          flex items-center border-b border-white/[0.06] shrink-0
          transition-all duration-[240ms]
          ${sidebarCollapsed ? 'px-3 py-4 justify-between' : 'px-5 py-4 gap-3'}
        `}>
          <img
            src="/android-chrome-192x192.png"
            alt="Zyntra Icon"
            className={`rounded-lg shadow-[0_0_12px_rgba(6,182,212,0.4)] shrink-0 transition-all duration-[240ms] ${sidebarCollapsed ? 'w-7 h-7' : 'w-8 h-8'}`}
          />

          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold tracking-wide text-white leading-tight">
                Zyntra<br/>StudyVerse
              </div>
            </div>
          )}

          {/* Mobile close */}
          <button
            className="lg:hidden text-white/40 hover:text-white shrink-0"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>

          {/* Desktop collapse button */}
          <button
            onClick={toggleCollapse}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="
              hidden lg:flex items-center justify-center shrink-0
              w-6 h-6 rounded-md
              text-white/30 hover:text-white/80 hover:bg-white/[0.07]
              transition-all duration-150
            "
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* ── User info (hidden when collapsed) ── */}
        <AnimatePresence initial={false}>
          {!sidebarCollapsed && (
            <motion.div
              key="userinfo"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden shrink-0"
            >
              <div className="px-5 py-3 border-b border-white/[0.06]">
                <div className="text-[11px] text-white/40">{greeting}</div>
                <div className="text-sm font-semibold text-white mt-0.5">{user?.displayName || 'User'} 👋</div>
                <div className="text-[11px] text-white/30 mt-0.5">{day} · BUET Prep 2027</div>

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
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Navigation ── */}
        <nav className={`
          flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden
          transition-all duration-[240ms]
          ${sidebarCollapsed ? 'px-2' : 'px-3'}
        `}>

          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center rounded-xl text-sm transition-all duration-150 border
                ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'}
                ${isActive
                  ? 'bg-gradient-to-r from-cyan-500/15 to-purple-500/15 border-cyan-500/20 text-cyan-300 font-medium'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.05] border-transparent'
                }`
              }
            >
              {({ isActive }) =>
                sidebarCollapsed ? (
                  <NavTooltip label={label}>
                    <Icon size={17} className={isActive ? 'text-cyan-300' : ''} />
                  </NavTooltip>
                ) : (
                  <>
                    <Icon size={16} />
                    <span className="truncate">{label}</span>
                    {label === 'Study Timer' && isRunning && (
                      <span className="ml-auto text-[10px] font-mono text-cyan-400 animate-pulse shrink-0">
                        {formatElapsed(elapsed)}
                      </span>
                    )}
                  </>
                )
              }
            </NavLink>
          ))}

          {/* Divider */}
          <div className="my-2 border-t border-white/[0.06]" />
          {!sidebarCollapsed && (
            <div className="px-3 py-1 text-[10px] text-white/20 uppercase tracking-widest">Couple Zone</div>
          )}

          {COUPLE_NAV.map(({ to, icon: Icon, label, highlight }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center rounded-xl text-sm transition-all duration-150 border
                ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'}
                ${isActive
                  ? `bg-gradient-to-r border font-medium ${
                      highlight === 'gold'
                        ? 'from-yellow-500/15 to-orange-500/15 border-yellow-500/20 text-yellow-300'
                        : 'from-cyan-500/15 to-purple-500/15 border-cyan-500/20 text-cyan-300'
                    }`
                  : 'text-white/50 hover:text-white hover:bg-white/[0.05] border-transparent'
                }`
              }
            >
              {({ isActive }) => {
                const iconCls = isActive
                  ? (highlight === 'gold' ? 'text-yellow-300' : 'text-cyan-300')
                  : '';

                if (sidebarCollapsed) {
                  return (
                    <NavTooltip label={label}>
                      <div className="relative">
                        <Icon size={17} className={iconCls} />
                        {to === '/chat' && chatUnread > 0 && (
                          <span className="absolute -top-1 -right-1 w-[14px] h-[14px] rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 text-[8px] font-bold text-white flex items-center justify-center">
                            {chatUnread > 9 ? '9+' : chatUnread}
                          </span>
                        )}
                        {to === '/chat' && chatUnread === 0 && (
                          <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${partnerStats.isStudying ? 'bg-green-400 animate-pulse' : 'bg-slate-700'}`} />
                        )}
                        {to === '/leaderboard' && (
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
                        )}
                      </div>
                    </NavTooltip>
                  );
                }

                return (
                  <>
                    <Icon size={16} className={iconCls} />
                    <span className="truncate">{label}</span>

                    {to === '/chat' && chatUnread > 0 && (
                      <motion.span
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="ml-auto min-w-[18px] h-[18px] rounded-full bg-gradient-to-br from-cyan-500 to-purple-600
                                   text-[9px] font-bold text-white flex items-center justify-center px-1
                                   shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                      >
                        {chatUnread > 9 ? '9+' : chatUnread}
                      </motion.span>
                    )}

                    {to === '/chat' && chatUnread === 0 && (
                      <span className={`ml-auto w-1.5 h-1.5 rounded-full ${partnerStats.isStudying ? 'bg-green-400 animate-pulse' : 'bg-slate-700'}`} />
                    )}

                    {to === '/leaderboard' && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
                    )}
                  </>
                );
              }}
            </NavLink>
          ))}
        </nav>

        {/* ── Active timer pill ── */}
        <AnimatePresence>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`
                mb-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20
                transition-all duration-[240ms]
                ${sidebarCollapsed ? 'mx-2 px-2 py-2.5 flex items-center justify-center' : 'mx-3 px-3 py-2.5'}
              `}
            >
              {sidebarCollapsed ? (
                <NavTooltip label={`${subject} · ${formatElapsed(elapsed)}`}>
                  <Timer size={14} className="text-cyan-400 animate-pulse" />
                </NavTooltip>
              ) : (
                <>
                  <div className="text-[10px] text-cyan-400/70 uppercase tracking-wider">Studying now</div>
                  <div className="text-sm font-semibold text-cyan-300">{subject}</div>
                  <div className="text-xl font-mono text-cyan-400 mt-0.5">{formatElapsed(elapsed)}</div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Logout ── */}
        <div className="p-3 border-t border-white/[0.06] shrink-0">
          {sidebarCollapsed ? (
            <NavTooltip label="Sign out">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-full py-2.5 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut size={16} />
              </button>
            </NavTooltip>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut size={15} />
              Sign out
            </button>
          )}
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
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
    '/checkin':     'Check-In Center',
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
  return <h1 className="text-sm font-semibold text-white/80">{titles[location.pathname] || 'Zyntra StudyVerse'}</h1>;
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
