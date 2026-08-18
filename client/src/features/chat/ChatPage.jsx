// ─────────────────────────────────────────────────────────────────────────────
// ChatPage.jsx — ZYNTRA StudyVerse
//
// Shared 45-minute chat session system:
//  • Firestore chat room doc is source of truth for session state
//  • enterChatSession() called on mount  → adds user to activeUsers, resumes timer
//  • leaveChatSession() called on unmount → removes user, pauses if no one left
//  • Timer running when activeUsers.length > 0, paused when empty
//  • Client computes remainingMs from server timestamps (no drift)
//  • Session resets each BST day; expired sessions cannot be reset by refresh
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Bell, BellOff, Wifi, Timer, Users } from 'lucide-react';
import { useAuthStore } from '../../store';
import {
  updateLastRead,
  sendPushNotification,
  subscribeToChatSession,
  enterChatSession,
  leaveChatSession,
  expireChatSession,
} from '../../firebase/db';
import { isPushGranted, requestPushPermission } from '../../firebase/messaging';
import { usePartnerStats } from '../../hooks/usePartnerStats';
import { useMyUnlockProgress } from '../../hooks/useMyUnlockProgress';
import { formatDistanceToNow } from 'date-fns';
import { COUPLE_CONFIG } from '../../lib/constants';
import ChatUnlockGate from './ChatUnlockGate';
import MessageList    from './MessageList';
import ChatInput      from './ChatInput';

// ── Constants ─────────────────────────────────────────────────────────────────

const SESSION_DURATION_MS = COUPLE_CONFIG.chatWindowMinutes * 60 * 1000; // 45 min

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * Computes remaining milliseconds from the Firestore session snapshot.
 * This is the client-side calculation from server-authoritative timestamps.
 */
function computeRemainingMs(session) {
  if (!session) return SESSION_DURATION_MS;

  const { sessionExpiredAt, sessionStartedAt, sessionPausedAt, sessionAccumulatedMs = 0 } = session;

  // Session expired
  if (sessionExpiredAt) return 0;

  let elapsedMs = sessionAccumulatedMs;

  if (sessionStartedAt && !sessionPausedAt) {
    // Timer is currently RUNNING
    const startMs = sessionStartedAt.toDate
      ? sessionStartedAt.toDate().getTime()
      : (sessionStartedAt.seconds * 1000);
    elapsedMs += Math.max(0, Date.now() - startMs);
  }
  // If paused: elapsedMs = accumulated only (no additional time)

  return Math.max(0, SESSION_DURATION_MS - elapsedMs);
}

function getSessionStatus(session, isUnlocked) {
  if (!isUnlocked) return 'locked';
  if (!session || !session.sessionDate) return 'no-session';
  if (session.sessionExpiredAt) return 'expired';
  return 'active'; // running or paused — both render the same chat UI
}

// ── Session Timer Display ─────────────────────────────────────────────────────

function SessionTimer({ remainingMs, isPaused, activeCount }) {
  const pct = Math.max(0, Math.min(100, (remainingMs / SESSION_DURATION_MS) * 100));
  const isLow = remainingMs < 5 * 60 * 1000; // < 5 min

  return (
    <div className="px-4 py-2 border-b border-white/[0.06] bg-[#0c1220]/80 shrink-0">
      <div className="flex items-center justify-between gap-3 max-w-full">
        <div className="flex items-center gap-2 min-w-0">
          <Timer size={13} className={isLow ? 'text-red-400' : 'text-cyan-400'} />
          <span className={`text-xs font-medium ${isLow ? 'text-red-300' : 'text-cyan-300'}`}>
            {isPaused ? 'Paused' : 'Session'}
          </span>
          {activeCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <Users size={10} />
              {activeCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Progress bar */}
          <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: 'linear' }}
              className={`h-full rounded-full ${
                isLow ? 'bg-red-500' : isPaused ? 'bg-slate-500' : 'bg-cyan-500'
              }`}
            />
          </div>

          {/* Countdown */}
          <span className={`text-xs font-mono font-semibold tabular-nums ${
            isLow ? 'text-red-400' : isPaused ? 'text-slate-400' : 'text-white'
          }`}>
            {isPaused && <span className="text-slate-500 mr-1">⏸</span>}
            {formatCountdown(remainingMs)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Expired Overlay ───────────────────────────────────────────────────────────

function SessionExpiredBanner() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-5xl"
      >⏰</motion.div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-white mb-2">Session Ended</h3>
        <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
          Today's 45-minute shared chat session has ended.
          <br />
          Complete your vocabulary tomorrow to unlock a new session.
        </p>
      </div>
      <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-center">
        <p className="text-xs text-slate-500">Session available again tomorrow 🌙</p>
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

  // ── Shared session state (from Firestore) ─────────────────────────────────
  const [session,      setSession]      = useState(null);
  const [remainingMs,  setRemainingMs]  = useState(SESSION_DURATION_MS);
  const [sessionReady, setSessionReady] = useState(false);

  const hasEnteredRef   = useRef(false);
  const expiredFiredRef = useRef(false);
  const tickRef         = useRef(null);
  const hasMarkedRead   = useRef(false);

  const partnerStats = usePartnerStats();
  const { isUnlocked } = useMyUnlockProgress();

  // ── Subscribe to shared session from Firestore ────────────────────────────
  useEffect(() => {
    const unsub = subscribeToChatSession((sess) => {
      setSession(sess);
      setSessionReady(true);
    });
    return unsub;
  }, []);

  // ── Enter session when chat opens (only if unlocked) ─────────────────────
  useEffect(() => {
    if (!user?.uid || !isUnlocked || !sessionReady || hasEnteredRef.current) return;
    hasEnteredRef.current = true;
    enterChatSession(user.uid).catch(err =>
      console.error('[ChatPage] enterChatSession failed:', err)
    );
  }, [user?.uid, isUnlocked, sessionReady]);

  // ── Leave session on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (user?.uid && hasEnteredRef.current) {
        leaveChatSession(user.uid).catch(() => {});
        hasEnteredRef.current = false;
      }
    };
  }, [user?.uid]);

  // ── Client-side tick: recompute remainingMs from server state ─────────────
  // The server timestamps are authoritative. We just recalculate every second.
  useEffect(() => {
    if (!session) return;

    const tick = () => {
      const ms = computeRemainingMs(session);
      setRemainingMs(ms);

      // If timer hits 0 and not already expired — fire expireChatSession()
      if (ms <= 0 && !session.sessionExpiredAt && !expiredFiredRef.current) {
        expiredFiredRef.current = true;
        expireChatSession().catch(() => {});
      }
    };

    tick(); // immediate
    tickRef.current = setInterval(tick, 1000);
    return () => clearInterval(tickRef.current);
  }, [session]);

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
  const isOnline = partnerStats?.lastSeen
    ? (Date.now() - partnerStats.lastSeen.getTime() < 120000)
    : false;

  const lastSeenText = isOnline
    ? 'online'
    : partnerStats?.lastSeen
      ? `last seen ${formatDistanceToNow(partnerStats.lastSeen)} ago`
      : 'offline';

  const sessionStatus = getSessionStatus(session, isUnlocked);
  // Timer is PAUSED when sessionPausedAt exists and session is not expired.
  // When resumed, enterChatSession sets sessionStartedAt = now() and clears sessionPausedAt.
  const isPaused    = !!session?.sessionPausedAt && !session?.sessionExpiredAt;
  const activeCount = session?.activeUsers?.length || 0;

  // Show chat UI when unlocked and not expired
  const showChat = isUnlocked && sessionStatus !== 'expired';

  return (
    <div className="flex flex-col h-[calc(100vh-57px)] bg-[#080b14]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0c1220] shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            isUnlocked ? 'bg-cyan-500/20' : 'bg-slate-700/40'
          }`}>
            {isUnlocked
              ? <Unlock size={15} className="text-cyan-400" />
              : <Lock   size={15} className="text-slate-500" />
            }
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Couple Chat 💬</h2>
            <div className="flex items-center gap-2">
              <p className={`text-xs ${isUnlocked ? 'text-green-400' : 'text-slate-500'}`}>
                {isUnlocked ? 'Chat is open!' : 'Locked — complete daily vocabulary'}
              </p>
              {/* Partner online status */}
              {isUnlocked && partnerStats && (
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

      {/* ── Session timer bar (only when unlocked and not expired) ── */}
      {showChat && session?.sessionDate && (
        <SessionTimer
          remainingMs={remainingMs}
          isPaused={isPaused}
          activeCount={activeCount}
        />
      )}

      {/* ── Body ── */}
      <AnimatePresence mode="wait">
        {!isUnlocked ? (
          /* Locked gate */
          <motion.div
            key="gate"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex-1 overflow-y-auto"
          >
            <ChatUnlockGate />
          </motion.div>

        ) : sessionStatus === 'expired' ? (
          /* Session expired */
          <motion.div
            key="expired"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <SessionExpiredBanner />
          </motion.div>

        ) : (
          /* Active / Paused chat */
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
        )}
      </AnimatePresence>
    </div>
  );
}
