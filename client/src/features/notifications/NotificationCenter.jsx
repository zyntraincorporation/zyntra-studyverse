import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store';
import {
  subscribeToNotifications,
  subscribeToMessages,
  createNotification,
} from '../../firebase/db';
import NotificationDrawer from './NotificationDrawer';

export default function NotificationCenter() {
  const user     = useAuthStore(s => s.user);
  const partner  = useAuthStore(s => s.partner);
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  // Track if we've already notified for a given message id
  const notifiedMsgIds = useRef(new Set());
  // Track first load — don't notify for messages already in history
  const initialLoadDone = useRef(false);

  // ── Subscribe to in-app notifications ──────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToNotifications(user.uid, setNotifications);
    return unsub;
  }, [user?.uid]);

  // ── Auto-create in-app notification on new chat messages ───────────────────
  // Only fires when user is NOT already on the /chat page
  useEffect(() => {
    if (!user?.uid) return;

    const unsub = subscribeToMessages(msgs => {
      if (!initialLoadDone.current) {
        // Seed the set with all current message ids (don't notify for history)
        msgs.forEach(m => notifiedMsgIds.current.add(m.id));
        initialLoadDone.current = true;
        return;
      }

      // Check for new messages from partner
      msgs.forEach(async (msg) => {
        if (notifiedMsgIds.current.has(msg.id)) return;
        notifiedMsgIds.current.add(msg.id);

        // Only notify if message is from partner (not own messages)
        if (msg.senderId === user.uid) return;

        // Don't create in-app notification if user is already on chat page
        if (location.pathname === '/chat') return;

        const senderName = partner?.displayName || 'Partner';
        const preview    = msg.text
          ? (msg.text.length > 60 ? msg.text.slice(0, 60) + '…' : msg.text)
          : '📎 Media message';

        try {
          await createNotification(user.uid, {
            type:     'chat_message',
            title:    `${senderName} sent a message 💬`,
            body:     preview,
            metadata: { messageId: msg.id, senderId: msg.senderId },
          });
        } catch (err) {
          console.warn('[NotificationCenter] Failed to create notification:', err);
        }
      });
    }, 60);

    return unsub;
  }, [user?.uid, location.pathname]); // eslint-disable-line

  const unread = notifications.filter(n => !n.read).length;

  return (
    <>
      <button
        id="notification-bell-btn"
        onClick={() => setOpen(true)}
        className="relative p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        <Bell size={18} />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full
                         bg-gradient-to-br from-cyan-500 to-purple-600
                         text-[9px] font-bold text-white flex items-center justify-center px-1"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <NotificationDrawer
        open={open}
        onClose={() => setOpen(false)}
        notifications={notifications}
        userId={user?.uid}
      />
    </>
  );
}
