import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Bell, BellOff, Wifi, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../store';
import {
  updateLastRead,
  sendPushNotification,
  subscribeToEmergencyAccess,
} from '../../firebase/db';
import { isPushGranted, requestPushPermission } from '../../firebase/messaging';
import { usePartnerStats } from '../../hooks/usePartnerStats';
import { useMyUnlockProgress } from '../../hooks/useMyUnlockProgress';
import { formatDistanceToNow } from 'date-fns';
import ChatUnlockGate from './ChatUnlockGate';
import MessageList    from './MessageList';
import ChatInput      from './ChatInput';
import EmergencyChat  from './EmergencyChat';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatCountdown(remainingMs) {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function ChatPage() {
  const user    = useAuthStore(s => s.user);
  const partner = useAuthStore(s => s.partner);

  const [replyTo,         setReplyTo]         = useState(null);
  const [pushGranted,     setPushGranted]     = useState(isPushGranted());
  const [pushRequesting,  setPushRequesting]  = useState(false);
  const [showPushBanner,  setShowPushBanner]  = useState(false);
  const [showEmergency,   setShowEmergency]   = useState(false);

  // ── Emergency chat access state ────────────────────────────────────────────
  const [emergencyActive,    setEmergencyActive]    = useState(false);
  const [emergencyRemaining, setEmergencyRemaining] = useState(0);

  const partnerStats = usePartnerStats();
  const { isUnlocked } = useMyUnlockProgress();
  const hasMarkedRead = useRef(false);

  // ── Subscribe to emergency access (is there an active 1-hour session?) ────
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToEmergencyAccess(user.uid, ({ isActive, remainingMs }) => {
      setEmergencyActive(isActive);
      setEmergencyRemaining(remainingMs);
    });
    return unsub;
  }, [user?.uid]);

  // ── Mark messages as read when chat opens ─────────────────────────────────
  useEffect(() => {
    if (!user?.uid || hasMarkedRead.current) return;
    hasMarkedRead.current = true;
    updateLastRead(user.uid).catch(() => {});
  }, [user?.uid]);

  // ── Re-mark on focus (user returns to tab) ────────────────────────────────
  useEffect(() => {
    const onFocus = () => {
      if (user?.uid) updateLastRead(user.uid).catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.uid]);

  // ── Show push banner after 3 s if not granted ─────────────────────────────
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

  // ── Called by ChatInput after a message is successfully sent ──────────────
  const handleMessageSent = useCallback(async (text) => {
    if (user?.uid) updateLastRead(user.uid).catch(() => {});
    if (partner?.uid) {
      sendPushNotification(partner.uid, {
        title: `${user?.displayName || 'Saiful'} 💬`,
        body:  text.length > 80 ? text.slice(0, 80) + '…' : text,
        type:  'chat_message',
        data:  { senderUid: user.uid, senderName: user?.displayName || '' },
      }).catch(() => {});
    }
  }, [user, partner?.uid]);

  const isOnline = partnerStats?.lastSeen
    ? (Date.now() - partnerStats.lastSeen.getTime() < 120000)
    : false;

  const lastSeenText = isOnline
    ? 'online'
    : partnerStats?.lastSeen
      ? `last seen ${formatDistanceToNow(partnerStats.lastSeen)} ago`
      : 'offline';

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
                {isUnlocked ? 'Chat is open!' : 'Locked — complete daily goals to unlock'}
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

          {/* ── Emergency Chat button ── */}
          <button
            id="emergency-chat-btn"
            onClick={() => setShowEmergency(true)}
            title={emergencyActive
              ? `Emergency active — ${formatCountdown(emergencyRemaining)} remaining`
              : 'Emergency Chat — tap to get 1-hour access'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                        transition-all border ${
              emergencyActive
                ? 'border-orange-500/50 text-orange-400 bg-orange-500/15'
                : 'border-orange-500/30 text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 hover:border-orange-500/50'
            }`}
          >
            <ShieldAlert size={12} />
            <span className="hidden sm:inline">Emergency</span>
            {emergencyActive && (
              <span className="font-mono text-[10px] opacity-80">
                {formatCountdown(emergencyRemaining)}
              </span>
            )}
          </button>
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
            <ChatUnlockGate />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Emergency Chat overlay ── */}
      <AnimatePresence>
        {showEmergency && (
          <EmergencyChat onClose={() => setShowEmergency(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
