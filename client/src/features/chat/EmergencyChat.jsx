// ─────────────────────────────────────────────────────────────────────────────
// EmergencyChat.jsx — ZYNTRA StudyVerse
//
// • Opens at any time — no study requirement, no vocab requirement
// • Maximum 10 minutes per day per user (stored in Firestore, resets daily)
// • Realtime countdown in the chat header
// • Auto-closes when 10 minutes are used
// • Firebase Spark Plan friendly (Firestore only, no Cloud Functions)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, Clock, Send } from 'lucide-react';
import { useAuthStore } from '../../store';
import {
  subscribeToEmergencyUsage,
  addEmergencyUsage,
  EMERGENCY_CHAT_MAX_MS,
  sendMessage,
  subscribeToMessages,
  updateLastRead,
  sendPushNotification,
} from '../../firebase/db';
import { getBSTDateString } from '../../lib/bst';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCountdown(remainingMs) {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatTime(ts) {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function EmergencyBubble({ msg, isMe, name }) {
  return (
    <div className={`flex gap-2 items-end ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMe && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-red-500
                        flex items-center justify-center text-white font-bold text-xs shrink-0">
          {name?.[0]?.toUpperCase() || '?'}
        </div>
      )}
      <div className={`flex flex-col gap-0.5 max-w-[72%] ${isMe ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-3.5 py-2 text-sm break-words ${
          isMe
            ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-tr-sm'
            : 'bg-white/[0.07] border border-white/10 text-white rounded-tl-sm'
        }`}>
          {msg.text}
          {isMe && (
            <span className="text-[9px] opacity-70 ml-2 inline-block translate-y-0.5">
              {formatTime(msg.createdAt)}
            </span>
          )}
        </div>
        {!isMe && (
          <span className="text-[9px] text-slate-600 px-1">{formatTime(msg.createdAt)}</span>
        )}
      </div>
    </div>
  );
}

// ── Main Emergency Chat Panel ─────────────────────────────────────────────────

export default function EmergencyChat({ onClose }) {
  const user    = useAuthStore(s => s.user);
  const partner = useAuthStore(s => s.partner);

  const today = getBSTDateString();

  // ── Usage state ───────────────────────────────────────────────────────────
  const [usedMs,        setUsedMs]        = useState(0);
  const [limitReached,  setLimitReached]  = useState(false);
  const [isActive,      setIsActive]      = useState(false);

  // ── Display countdown (client-side tick, separate from Firestore) ─────────
  const [displayRemainingMs, setDisplayRemainingMs] = useState(EMERGENCY_CHAT_MAX_MS);

  // ── Messages ──────────────────────────────────────────────────────────────
  const [messages,    setMessages]    = useState([]);
  const [text,        setText]        = useState('');
  const [sending,     setSending]     = useState(false);
  const [msgLoading,  setMsgLoading]  = useState(true);

  // ── Refs (avoid stale closures in timers and cleanup) ─────────────────────
  const intervalRef     = useRef(null);   // setInterval id for periodic Firestore writes
  const sessionStartRef = useRef(null);   // wall-clock ms when current session window started
  const usedAtStartRef  = useRef(0);      // usedMs value at start of current session window
  const isActiveRef     = useRef(false);  // mirrors isActive state — safe to read in cleanup
  const userRef         = useRef(user);   // always-current user object
  const bottomRef       = useRef(null);
  const scrollRef       = useRef(null);

  // Keep refs current
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const remainingMs = Math.max(0, EMERGENCY_CHAT_MAX_MS - usedMs);

  // ── Subscribe to today's Firestore usage ──────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToEmergencyUsage(user.uid, today, ({ usedMs: used }) => {
      setUsedMs(used);
      setDisplayRemainingMs(Math.max(0, EMERGENCY_CHAT_MAX_MS - used));
      if (used >= EMERGENCY_CHAT_MAX_MS) {
        setLimitReached(true);
        // Stop the session timer without calling stopSession (avoids circular deps)
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsActive(false);
        isActiveRef.current = false;
        sessionStartRef.current = null;
      }
    });
    return unsub;
  }, [user?.uid, today]); // eslint-disable-line

  // ── Subscribe to messages (shared chat room) ──────────────────────────────
  useEffect(() => {
    const unsub = subscribeToMessages(msgs => {
      setMessages(msgs);
      setMsgLoading(false);
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }, 60);
    return unsub;
  }, []);

  // ── Mark as read when opened ──────────────────────────────────────────────
  useEffect(() => {
    if (user?.uid) updateLastRead(user.uid).catch(() => {});
  }, [user?.uid]);

  // ── Client-side countdown tick ────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const tick = setInterval(() => {
      setDisplayRemainingMs(prev => {
        const next = Math.max(0, prev - 1000);
        if (next === 0) setLimitReached(true);
        return next;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [isActive]);

  // ── Flush usage to Firestore on unmount ───────────────────────────────────
  useEffect(() => {
    return () => {
      // Clear the periodic interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Flush any un-synced elapsed time (isActiveRef avoids stale closure)
      if (isActiveRef.current && sessionStartRef.current && userRef.current?.uid) {
        const elapsed = Math.min(
          Date.now() - sessionStartRef.current,
          EMERGENCY_CHAT_MAX_MS - usedAtStartRef.current
        );
        if (elapsed > 0) {
          addEmergencyUsage(userRef.current.uid, getBSTDateString(), elapsed).catch(() => {});
        }
      }
    };
  }, []); // intentionally empty — uses refs to avoid stale values

  // ── Start session (called on first send) ──────────────────────────────────
  const startSession = useCallback(() => {
    if (isActiveRef.current || limitReached) return;

    setIsActive(true);
    isActiveRef.current   = true;
    sessionStartRef.current = Date.now();
    usedAtStartRef.current  = usedMs;

    // Write to Firestore every 5 s so usage is recorded even on tab close
    intervalRef.current = setInterval(async () => {
      if (!isActiveRef.current || !sessionStartRef.current) return;
      const elapsed = Date.now() - sessionStartRef.current;
      const totalUsed = usedAtStartRef.current + elapsed;

      if (totalUsed >= EMERGENCY_CHAT_MAX_MS) {
        // Let the Firestore subscription handle the limit-reached state
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        const remaining = Math.max(0, EMERGENCY_CHAT_MAX_MS - usedAtStartRef.current);
        if (remaining > 0 && userRef.current?.uid) {
          await addEmergencyUsage(userRef.current.uid, getBSTDateString(), remaining).catch(() => {});
        }
        return;
      }

      // Write 5 s increment and reset the session window
      if (userRef.current?.uid) {
        await addEmergencyUsage(userRef.current.uid, getBSTDateString(), 5000).catch(() => {});
        usedAtStartRef.current  += 5000;
        sessionStartRef.current  = Date.now();
      }
    }, 5000);
  }, [limitReached, usedMs]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !user?.uid || limitReached) return;

    // Auto-start session on first message
    if (!isActiveRef.current) startSession();

    setSending(true);
    try {
      await sendMessage(user.uid, trimmed, null, null, null);
      setText('');
      if (partner?.uid) {
        sendPushNotification(partner.uid, {
          title: `${user.displayName || 'Someone'} 🚨`,
          body:  trimmed.length > 80 ? trimmed.slice(0, 80) + '…' : trimmed,
          type:  'emergency_chat',
          data:  { senderUid: user.uid },
        }).catch(() => {});
      }
    } catch (err) {
      console.error('[EmergencyChat] send failed:', err);
    } finally {
      setSending(false);
    }
  }, [text, user, partner?.uid, limitReached, startSession]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Close handler — flush session on close ────────────────────────────────
  const handleClose = useCallback(() => {
    if (isActiveRef.current && sessionStartRef.current && user?.uid) {
      const elapsed = Math.min(
        Date.now() - sessionStartRef.current,
        EMERGENCY_CHAT_MAX_MS - usedAtStartRef.current
      );
      if (elapsed > 0) {
        addEmergencyUsage(user.uid, today, elapsed).catch(() => {});
      }
    }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setIsActive(false);
    isActiveRef.current = false;
    sessionStartRef.current = null;
    onClose();
  }, [user?.uid, today, onClose]);

  const urgentColor = displayRemainingMs < 2 * 60 * 1000 ? 'text-red-400' : 'text-orange-400';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="w-full sm:max-w-md h-[85vh] sm:h-[600px] bg-[#0c1220] border border-orange-500/30
                      rounded-t-3xl sm:rounded-3xl flex flex-col shadow-[0_0_60px_rgba(249,115,22,0.15)]
                      overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-orange-500/20
                        bg-gradient-to-r from-orange-500/10 to-red-500/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30
                            flex items-center justify-center">
              <AlertCircle size={15} className="text-orange-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Emergency Chat 🚨</h3>
              <p className="text-[10px] text-orange-400/70">No study requirement needed</p>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10
                            rounded-xl px-3 py-1.5">
              <Clock size={11} className={urgentColor} />
              <span className={`text-xs font-mono font-bold ${urgentColor}`}>
                {formatCountdown(displayRemainingMs)}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Usage progress bar ── */}
        <div className="px-4 py-2 shrink-0 border-b border-white/[0.05]">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>Emergency Chat Remaining</span>
            <span className={urgentColor}>{formatCountdown(displayRemainingMs)}</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${Math.max(0, (remainingMs / EMERGENCY_CHAT_MAX_MS) * 100)}%` }}
              transition={{ duration: 0.5 }}
              className={`h-full rounded-full transition-colors ${
                displayRemainingMs < 2 * 60 * 1000
                  ? 'bg-red-500'
                  : 'bg-gradient-to-r from-orange-500 to-red-500'
              }`}
            />
          </div>
        </div>

        {/* ── Limit reached banner ── */}
        <AnimatePresence>
          {limitReached && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden shrink-0"
            >
              <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20 text-center">
                <p className="text-sm font-semibold text-red-400">
                  🚫 Emergency chat limit reached for today
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Resets at midnight BST. Complete your study goals to unlock regular chat.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Start prompt (before session begins) ── */}
        {!isActive && !limitReached && (
          <div className="px-4 py-2.5 bg-orange-500/5 border-b border-orange-500/10 shrink-0">
            <p className="text-[11px] text-orange-400/80 text-center">
              ⚡ Send a message to start your 10-minute emergency session
            </p>
          </div>
        )}

        {/* ── Messages ── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {msgLoading ? (
            <div className="flex justify-center mt-8">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-600">
              <AlertCircle size={28} className="text-orange-500/30" />
              <p className="text-xs">No messages yet — send one to start</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.senderId === user?.uid;
              const name = isMe
                ? (user?.displayName || 'You')
                : (partner?.displayName || 'Partner');
              return <EmergencyBubble key={msg.id} msg={msg} isMe={isMe} name={name} />;
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div className="px-3 py-3 border-t border-white/[0.06] bg-[#0c1220] shrink-0">
          {limitReached ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <span className="text-slate-600 text-sm opacity-60">
                Emergency chat limit reached 🚫
              </span>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKey}
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                }}
                placeholder="Emergency message… (10 min limit)"
                disabled={sending || limitReached}
                className="flex-1 resize-none bg-white/5 border border-orange-500/20 rounded-xl
                           px-3 py-2.5 text-white text-sm placeholder-slate-600
                           focus:outline-none focus:border-orange-500/40 disabled:opacity-50
                           max-h-24 overflow-y-auto transition-all"
                style={{ minHeight: '40px' }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !text.trim() || limitReached}
                className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white
                           hover:from-orange-400 hover:to-red-500 disabled:opacity-40
                           disabled:cursor-not-allowed transition-all
                           shadow-[0_0_12px_rgba(249,115,22,0.3)] shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
