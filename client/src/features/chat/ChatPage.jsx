// ─────────────────────────────────────────────────────────────────────────────
// ChatPage.jsx — ZYNTRA StudyVerse
//
// Shared 25,000-character daily chat system:
//  • Both users must complete 20 vocabulary → Chat Unlocked
//  • Shared 25,000 grapheme characters per BST day
//  • Atomic server-side enforcement — no partial sends, no race conditions
//  • When limit reached: full lockout (no messages sent OR viewed)
//  • Real-time shared counter: both screens update instantly
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Bell, BellOff, Wifi, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../../store';
import {
  updateLastRead,
  sendPushNotification,
  subscribeToDailyCharUsage,
} from '../../firebase/db';
import { isPushGranted, requestPushPermission } from '../../firebase/messaging';
import { usePartnerStats } from '../../hooks/usePartnerStats';
import { useMyUnlockProgress } from '../../hooks/useMyUnlockProgress';
import { COUPLE_CONFIG } from '../../lib/constants';
import ChatUnlockGate      from './ChatUnlockGate';
import DailyCharLimitGate  from './DailyCharLimitGate';
import MessageList         from './MessageList';
import ChatInput           from './ChatInput';

const DAILY_LIMIT = COUPLE_CONFIG.dailyCharLimit; // 25 000

function formatNum(n) {
  return n.toLocaleString('en-US');
}

// ── Daily character usage bar ─────────────────────────────────────────────────
function DailyCharBar({ usedChars }) {
  const remaining = Math.max(0, DAILY_LIMIT - usedChars);
  const pct       = Math.min(100, Math.round((usedChars / DAILY_LIMIT) * 100));
  const isLow     = remaining < 2000;
  const isCritical = remaining < 500;

  return (
    <div className="px-4 py-2 border-b border-white/[0.06] bg-[#0c1220]/80 shrink-0">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-1.5">
          <MessageSquare
            size={12}
            className={isCritical ? 'text-red-400' : isLow ? 'text-orange-400' : 'text-cyan-400'}
          />
          <span className={`text-[11px] font-medium ${isCritical ? 'text-red-300' : isLow ? 'text-orange-300' : 'text-cyan-300'}`}>
            Daily Chat
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] tabular-nums">
          <span className={isCritical ? 'text-red-400' : isLow ? 'text-orange-400' : 'text-slate-400'}>
            {formatNum(usedChars)} / {formatNum(DAILY_LIMIT)} used
          </span>
          <span className="text-slate-600">·</span>
          <span className={isCritical ? 'text-red-400 font-semibold' : isLow ? 'text-orange-400' : 'text-slate-500'}>
            {formatNum(remaining)} left
          </span>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${
            isCritical
              ? 'bg-gradient-to-r from-red-500 to-rose-400'
              : isLow
              ? 'bg-gradient-to-r from-orange-500 to-amber-400'
              : 'bg-gradient-to-r from-cyan-500 to-blue-500'
          }`}
        />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ChatPage() {
  const user    = useAuthStore(s => s.user);
  const partner = useAuthStore(s => s.partner);

  const [replyTo,        setReplyTo]        = useState(null);
  const [pushGranted,    setPushGranted]    = useState(isPushGranted());
  const [pushRequesting, setPushRequesting] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(false);

  // ── Daily char usage (real-time from Firestore) ───────────────────────────
  const [usedChars, setUsedChars] = useState(0);

  const hasMarkedRead = useRef(false);

  const partnerStats = usePartnerStats();
  const { isUnlocked } = useMyUnlockProgress();

  // ── Subscribe to real-time daily char usage ───────────────────────────────
  useEffect(() => {
    const unsub = subscribeToDailyCharUsage(({ usedChars: u }) => {
      setUsedChars(u);
    });
    return unsub;
  }, []);

  // ── Mark messages as read on enter ───────────────────────────────────────
  useEffect(() => {
    if (!user?.uid || hasMarkedRead.current) return;
    hasMarkedRead.current = true;
    updateLastRead(user.uid).catch(() => {});
  }, [user?.uid]);

  // ── Re-mark on tab focus ──────────────────────────────────────────────────
  useEffect(() => {
    const onFocus = () => {
      if (user?.uid) updateLastRead(user.uid).catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.uid]);

  // ── Push banner ───────────────────────────────────────────────────────────
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

  // ── After message sent: mark read + push to partner ──────────────────────
  const handleMessageSent = useCallback(async (text) => {
    if (user?.uid) updateLastRead(user.uid).catch(() => {});
    const partnerUid = partner?.uid || partner?.id;
    if (partnerUid) {
      sendPushNotification(partnerUid, {
        title: `${user?.displayName || 'Saiful'} 💬`,
        body:  text.length > 80 ? text.slice(0, 80) + '…' : text,
        type:  'chat_message',
        data:  { senderUid: user.uid, senderName: user?.displayName || '' },
      }).catch(() => {});
    }
  }, [user, partner]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const partnerUid = partner?.uid || partner?.id;
  const lastSeenDate = partnerStats?.lastSeen instanceof Date
    ? partnerStats.lastSeen
    : (partnerStats?.lastSeen ? new Date(partnerStats.lastSeen) : null);
  const lastSeenMs = lastSeenDate && !isNaN(lastSeenDate.getTime()) ? lastSeenDate.getTime() : 0;
  const nowMs = Date.now();

  const isOnline = lastSeenMs > 0 && (nowMs - lastSeenMs < 150000);

  let lastSeenText = 'offline';
  if (isOnline) {
    lastSeenText = 'online';
  } else if (lastSeenMs > 0) {
    const diffSec = Math.floor((nowMs - lastSeenMs) / 1000);
    if (diffSec < 60)           lastSeenText = 'last seen just now';
    else if (diffSec < 3600)    lastSeenText = `last seen ${Math.floor(diffSec / 60)}m ago`;
    else if (diffSec < 86400)   lastSeenText = `last seen ${Math.floor(diffSec / 3600)}h ago`;
    else if (diffSec < 604800)  lastSeenText = `last seen ${Math.floor(diffSec / 86400)}d ago`;
    else lastSeenText = `last seen ${lastSeenDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
  }

  // ── Render logic ──────────────────────────────────────────────────────────
  const isLimitReached = usedChars >= DAILY_LIMIT;

  return (
    <div className="flex flex-col h-[calc(100vh-57px)] bg-[#080b14]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0c1220] shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            isUnlocked && !isLimitReached ? 'bg-cyan-500/20' : 'bg-slate-700/40'
          }`}>
            {isUnlocked && !isLimitReached
              ? <Unlock size={15} className="text-cyan-400" />
              : <Lock   size={15} className="text-slate-500" />
            }
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Couple Chat 💬</h2>
            <div className="flex items-center gap-2">
              <p className={`text-xs ${isUnlocked && !isLimitReached ? 'text-green-400' : 'text-slate-500'}`}>
                {!isUnlocked
                  ? 'Locked — complete daily vocabulary'
                  : isLimitReached
                  ? 'Daily limit reached 🔒'
                  : 'Chat is open!'}
              </p>
              {/* Partner online status */}
              {isUnlocked && !isLimitReached && partnerStats && (
                <div className="flex items-center gap-1.5 ml-2 border-l border-white/10 pl-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isOnline
                      ? 'bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]'
                      : 'bg-slate-600'
                  }`} />
                  <span className={`text-[10px] ${isOnline ? 'text-green-400' : 'text-slate-500'}`}>
                    {lastSeenText}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

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
      </div>

      {/* ── Push notification banner ── */}
      <AnimatePresence>
        {showPushBanner && !pushGranted && isUnlocked && !isLimitReached && (
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
                  Enable push notifications to get messages when the app is closed
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

      {/* ── Daily char usage bar (only when unlocked and not limit-reached) ── */}
      {isUnlocked && !isLimitReached && (
        <DailyCharBar usedChars={usedChars} />
      )}

      {/* ── Body ── */}
      <AnimatePresence mode="wait">
        {!isUnlocked ? (
          /* Vocabulary not complete — show unlock gate */
          <motion.div
            key="gate"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex-1 overflow-y-auto"
          >
            <ChatUnlockGate />
          </motion.div>

        ) : isLimitReached ? (
          /* 25K limit reached — full lockout (no messages viewable per spec) */
          <motion.div
            key="limit"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <DailyCharLimitGate usedChars={usedChars} />
          </motion.div>

        ) : (
          /* Active chat */
          <motion.div
            key="chat"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <MessageList
              onReply={setReplyTo}
              partnerLastReadAt={partnerStats?.chatLastReadAt}
              partnerLastSeen={partnerStats?.lastSeen}
              partnerIsActiveInChat={false}
            />
            <ChatInput
              isLocked={false}
              usedChars={usedChars}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              onMessageSent={handleMessageSent}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
