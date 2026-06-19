import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Bell, BellOff, Wifi } from 'lucide-react';
import { useAuthStore } from '../../store';
import {
  subscribeToChatRoom,
  updateLastRead,
  sendPushNotification,
} from '../../firebase/db';
import { isPushGranted, requestPushPermission } from '../../firebase/messaging';
import { usePartnerStats } from '../../hooks/usePartnerStats';
import { formatDistanceToNow } from 'date-fns';
import ChatUnlockGate from './ChatUnlockGate';
import MessageList    from './MessageList';
import ChatInput      from './ChatInput';

function useCountdown(expiresAt) {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    if (!expiresAt) { setRemaining(null); return; }
    const end = expiresAt?.toDate ? expiresAt.toDate() : new Date(expiresAt);
    const tick = () => {
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setRemaining(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return remaining;
}

function formatCountdown(secs) {
  if (secs === null) return '';
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function ChatPage() {
  const user    = useAuthStore(s => s.user);
  const partner = useAuthStore(s => s.partner);

  const [chatRoom, setChatRoom] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [replyTo,  setReplyTo]  = useState(null);
  const [pushGranted, setPushGranted] = useState(isPushGranted());
  const [pushRequesting, setPushRequesting] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(false);

  const partnerStats = usePartnerStats();
  const hasMarkedRead = useRef(false);

  // Subscribe to chat room state
  useEffect(() => {
    const unsub = subscribeToChatRoom(data => {
      setChatRoom(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Mark messages as read when chat opens
  useEffect(() => {
    if (!user?.uid || hasMarkedRead.current) return;
    hasMarkedRead.current = true;
    updateLastRead(user.uid).catch(() => {});
  }, [user?.uid]);

  // Re-mark on focus (user returns to tab)
  useEffect(() => {
    const onFocus = () => {
      if (user?.uid) updateLastRead(user.uid).catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.uid]);

  // Show push banner after 3s if not granted
  useEffect(() => {
    if (isPushGranted()) return;
    const id = setTimeout(() => setShowPushBanner(true), 3000);
    return () => clearTimeout(id);
  }, []);

  const handleRequestPush = useCallback(async () => {
    if (!user?.uid) return;
    setPushRequesting(true);
    try {
      const token = await requestPushPermission(user.uid);
      setPushGranted(!!token);
      setShowPushBanner(false);
    } catch (err) {
      console.error('[ChatPage] Push permission failed:', err);
    } finally {
      setPushRequesting(false);
    }
  }, [user?.uid]);

  // Called by ChatInput after a message is successfully sent
  const handleMessageSent = useCallback(async (text) => {
    // Mark own messages as read immediately
    if (user?.uid) updateLastRead(user.uid).catch(() => {});

    // Send push to partner
    if (partner?.uid) {
      sendPushNotification(partner.uid, {
        title: `${user?.displayName || 'Saiful'} 💬`,
        body:  text.length > 80 ? text.slice(0, 80) + '…' : text,
        type:  'chat_message',
        data:  { senderUid: user.uid, senderName: user?.displayName || '' },
      }).catch(() => {});
    }
  }, [user, partner?.uid]);

  const remaining  = useCountdown(chatRoom?.expiresAt);
  const isExpired  = chatRoom?.unlocked && remaining === 0;
  const isUnlocked = chatRoom?.unlocked && !isExpired;

  // Compute precise online status (active within last 2 mins)
  const isOnline = partnerStats?.lastSeen
    ? (Date.now() - partnerStats.lastSeen.getTime() < 120000)
    : false;
  
  const lastSeenText = isOnline
    ? 'online'
    : partnerStats?.lastSeen
      ? `last seen ${formatDistanceToNow(partnerStats.lastSeen)} ago`
      : 'offline';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080b14] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-57px)] bg-[#080b14]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0c1220] shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isUnlocked ? 'bg-cyan-500/20' : 'bg-slate-700/40'}`}>
            {isUnlocked ? <Unlock size={15} className="text-cyan-400" /> : <Lock size={15} className="text-slate-500" />}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">StudyVerse Chat 💬</h2>
            <div className="flex items-center gap-2">
              <p className={`text-xs ${isUnlocked ? 'text-green-400' : 'text-slate-500'}`}>
                {isUnlocked ? 'Chat is open!' : isExpired ? 'Session ended' : 'Locked — study 8h each to unlock'}
              </p>
              {/* Partner online status */}
              {isUnlocked && partnerStats && (
                <div className="flex items-center gap-1.5 ml-2 border-l border-white/10 pl-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-slate-600'}`} />
                  <span className={`text-[10px] ${isOnline ? 'text-green-400' : 'text-slate-500'}`}>
                    {lastSeenText}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Push notification toggle */}
          <button
            onClick={pushGranted ? undefined : handleRequestPush}
            disabled={pushRequesting}
            title={pushGranted ? 'Push notifications enabled' : 'Enable push notifications'}
            className={`p-1.5 rounded-lg transition-all ${
              pushGranted
                ? 'text-cyan-400 bg-cyan-500/10'
                : 'text-slate-500 hover:text-white hover:bg-white/5'
            }`}
          >
            {pushGranted ? <Bell size={15} /> : <BellOff size={15} />}
          </button>

          {/* Countdown timer */}
          {isUnlocked && remaining !== null && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-1.5">
              <span className="text-xs text-green-400">Closes in</span>
              <span className={`font-mono text-sm font-bold ${remaining < 300 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                {formatCountdown(remaining)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Push notification banner ── */}
      <AnimatePresence>
        {showPushBanner && !pushGranted && isUnlocked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden shrink-0"
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-cyan-500/10 border-b border-cyan-500/20">
              <div className="flex items-center gap-2">
                <Wifi size={14} className="text-cyan-400" />
                <p className="text-xs text-cyan-300">
                  Enable push notifications to get messages even when the app is closed
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <button
                  onClick={handleRequestPush}
                  disabled={pushRequesting}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                >
                  {pushRequesting ? 'Enabling…' : 'Enable'}
                </button>
                <button
                  onClick={() => setShowPushBanner(false)}
                  className="text-xs text-slate-500 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Body ── */}
      <AnimatePresence mode="wait">
        {isUnlocked ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <MessageList 
              onReply={setReplyTo} 
              partnerLastReadAt={partnerStats?.chatLastReadAt}
              partnerLastSeen={partnerStats?.lastSeen}
            />
            <ChatInput
              isLocked={false}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              onMessageSent={handleMessageSent}
            />
          </motion.div>
        ) : (
          <motion.div
            key="gate"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex-1 overflow-y-auto"
          >
            <ChatUnlockGate chatRoom={chatRoom} isExpired={isExpired} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
