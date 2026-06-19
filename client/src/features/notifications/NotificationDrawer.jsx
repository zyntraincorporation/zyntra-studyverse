import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { markNotificationRead, markAllNotificationsRead } from '../../firebase/db';


const TYPE_ICON = {
  partner_studying:  '💪',
  chat_message:      '💬',
  chat_unlocked:     '💬',
  chat_locked:       '🔒',
  streak:            '🔥',
  vocab_milestone:   '📚',
  leaderboard:       '🏆',
  study_reminder:    '⏰',
  default:           '🔔',
};

const TYPE_ROUTE = {
  chat_message:  '/chat',
  chat_unlocked: '/chat',
  leaderboard:   '/leaderboard',
  vocab_milestone: '/vocabulary',
  streak:        '/',
};


function timeAgo(ts) {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationDrawer({ open, onClose, notifications, userId }) {
  const navigate = useNavigate();

  const handleRead = async (n) => {
    if (!userId) return;
    await markNotificationRead(userId, n.id).catch(() => {});
    // Navigate to relevant page
    const route = TYPE_ROUTE[n.type];
    if (route) {
      onClose();
      navigate(route);
    }
  };

  const handleReadAll = async () => {
    if (!userId) return;
    await markAllNotificationsRead(userId).catch(() => {});
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-80 z-50 bg-[#0c1220] border-l border-white/10 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div>
                <h2 className="text-sm font-semibold text-white">Notifications</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {notifications.filter(n => !n.read).length} unread
                </p>
              </div>
              <div className="flex items-center gap-2">
                {notifications.some(n => !n.read) && (
                  <button
                    onClick={handleReadAll}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <CheckCheck size={13} /> All read
                  </button>
                )}
                <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
              {notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
                  <span className="text-4xl">✅</span>
                  <p className="text-sm">All caught up!</p>
                </div>
              )}
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleRead(n)}
                  className={`w-full text-left px-5 py-3.5 flex items-start gap-3 transition-colors hover:bg-white/[0.03]
                    ${!n.read ? 'bg-cyan-500/[0.03]' : ''}`}
                >
                  <span className="text-xl mt-0.5 shrink-0">
                    {TYPE_ICON[n.type] || TYPE_ICON.default}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium leading-snug ${n.read ? 'text-slate-400' : 'text-white'}`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                    <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
