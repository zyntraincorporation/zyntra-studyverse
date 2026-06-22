import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import {
  subscribeToNotifications,
  subscribeToMessages,
  createNotification,
  updateLastRead,
} from '../../firebase/db';
import NotificationDrawer from './NotificationDrawer';

export default function NotificationCenter() {
  const user     = useAuthStore(s => s.user);
  const partner  = useAuthStore(s => s.partner);
  const location = useLocation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  // Track if we've already notified for a given message id — persists across re-renders
  const notifiedMsgIds   = useRef(new Set());
  // Track first load — don't notify for messages already in history
  const initialLoadDone  = useRef(false);
  // Keep a stable ref to location so the message listener doesn't need to re-subscribe on route changes
  const locationRef = useRef(location.pathname);
  // Keep partner name current without re-subscribing the listener
  const partnerRef  = useRef(partner?.displayName || 'Partner');

  // Keep locationRef and partnerRef in sync without triggering re-subscriptions
  useEffect(() => {
    locationRef.current = location.pathname;
    partnerRef.current  = partner?.displayName || 'Partner';

    // When user navigates TO /chat, mark messages as read
    if (location.pathname === '/chat' && user?.uid) {
      updateLastRead(user.uid).catch(() => {});
    }
  }, [location.pathname, user?.uid, partner?.displayName]);

  // ── Subscribe to in-app notifications ──────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToNotifications(user.uid, setNotifications);
    return unsub;
  }, [user?.uid]);

  // ── Stable message listener (does NOT re-subscribe on route changes) ────────
  // Uses locationRef to read the current path without re-subscribing.
  useEffect(() => {
    if (!user?.uid) return;

    // Reset on user change
    notifiedMsgIds.current  = new Set();
    initialLoadDone.current = false;

    const unsub = subscribeToMessages(msgs => {
      if (!initialLoadDone.current) {
        // Seed the set with all existing message ids — don't notify for history
        msgs.forEach(m => notifiedMsgIds.current.add(m.id));
        initialLoadDone.current = true;
        return;
      }

      msgs.forEach(async (msg) => {
        if (notifiedMsgIds.current.has(msg.id)) return;
        notifiedMsgIds.current.add(msg.id);

        // Only notify for messages from partner
        if (msg.senderId === user.uid) return;

        // Use ref so we always get the latest partner name (loads async)
        const senderName = partnerRef.current || 'Partner';
        const preview    = msg.text
          ? (msg.text.length > 60 ? msg.text.slice(0, 60) + '…' : msg.text)
          : '📎 Media message';

        // ── Browser notification ────────────────────────────────────────────
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            const n = new Notification(`New message from ${senderName} 💬`, {
              body:  preview,
              icon:  '/android-chrome-192x192.png',
              badge: '/favicon-32x32.png',
              tag:   `chat-msg-${msg.id}`,
              renotify: true,
            });
            // Clicking the browser notification opens the chat tab
            n.onclick = () => {
              window.focus();
              navigate('/chat');
              n.close();
            };
          } catch (_) {}
        }

        // ── In-app notification (only when NOT already on /chat) ────────────
        if (locationRef.current === '/chat') return;

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
  }, [user?.uid]); // ← deliberately exclude location/partner to avoid re-subscribing

  const unread = notifications.filter(n => !n.read).length;

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        id="notification-bell-btn"
        onClick={handleOpen}
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
        onClose={handleClose}
        notifications={notifications}
        userId={user?.uid}
      />
    </>
  );
}
