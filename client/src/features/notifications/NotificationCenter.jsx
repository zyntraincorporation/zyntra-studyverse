import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store';
import { subscribeToNotifications, markAllNotificationsRead } from '../../firebase/db';
import NotificationDrawer from './NotificationDrawer';

export default function NotificationCenter() {
  const user  = useAuthStore(s => s.user);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToNotifications(user.uid, setNotifications);
    return unsub;
  }, [user?.uid]);

  const unread = notifications.filter(n => !n.read).length;

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
      >
        <Bell size={18} />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 text-[9px] font-bold text-white flex items-center justify-center"
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
