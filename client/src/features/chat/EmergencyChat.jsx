// ─────────────────────────────────────────────────────────────────────────────
// EmergencyChat.jsx — ZYNTRA StudyVerse
//
// Emergency Chat = Temporary 1-hour access bypass
//
// • Opens at any time — no study requirement
// • Activating writes emergencyActivatedAt to the user doc
// • Access window: 1 hour from activation
// • Messages stored in the SAME main chat — nothing is separate
// • isEmergency:true flag → excluded from partner's unread count
// • NO push / popup / unread notifications sent to partner
// • Countdown shows "Emergency Access Remaining: XXm XXs"
// • Auto-closes 3 s after the hour expires
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X, Clock, Send, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store';
import {
  activateEmergencyChat,
  subscribeToEmergencyAccess,
  EMERGENCY_CHAT_DURATION_MS,
  sendMessage,
  subscribeToMessages,
  updateLastRead,
} from '../../firebase/db';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min      = Math.floor(totalSec / 60);
  const sec      = totalSec % 60;
  return `${String(min).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
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
          {msg.isEmergency && !isMe && (
            <span className="text-[9px] text-orange-400/70 block mb-0.5 font-mono">
              🚨 emergency
            </span>
          )}
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

  // ── Activation state ──────────────────────────────────────────────────────
  const [activating,   setActivating]   = useState(true);
  const [activateErr,  setActivateErr]  = useState(false);

  // ── Countdown state ───────────────────────────────────────────────────────
  const [remainingMs,  setRemainingMs]  = useState(EMERGENCY_CHAT_DURATION_MS);
  const [expired,      setExpired]      = useState(false);
  const activatedAtRef = useRef(null);   // wall-clock Date of activation

  // ── Messages ──────────────────────────────────────────────────────────────
  const [messages,    setMessages]    = useState([]);
  const [text,        setText]        = useState('');
  const [sending,     setSending]     = useState(false);
  const [msgLoading,  setMsgLoading]  = useState(true);

  const bottomRef = useRef(null);
  const scrollRef = useRef(null);

  // ── 1. Activate emergency session on mount ────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    activateEmergencyChat(user.uid)
      .catch(() => setActivateErr(true))
      .finally(() => setActivating(false));
  }, [user?.uid]);

  // ── 2. Subscribe to access state from Firestore ───────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToEmergencyAccess(user.uid, ({ activatedAt, remainingMs: rm }) => {
      if (activatedAt) activatedAtRef.current = activatedAt;
      setRemainingMs(rm);
    });
    return unsub;
  }, [user?.uid]);

  // ── 3. Client-side 1-second tick (smooth countdown) ──────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      if (!activatedAtRef.current) return;
      const elapsed = Date.now() - activatedAtRef.current.getTime();
      const rm      = Math.max(0, EMERGENCY_CHAT_DURATION_MS - elapsed);
      setRemainingMs(rm);
      if (rm === 0 && !expired) setExpired(true);
    }, 1000);
    return () => clearInterval(tick);
  }, [expired]);

  // ── 4. Auto-close 3 s after expiry ───────────────────────────────────────
  useEffect(() => {
    if (!expired) return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [expired, onClose]);

  // ── 5. Subscribe to messages (main chat room) ─────────────────────────────
  useEffect(() => {
    const unsub = subscribeToMessages(msgs => {
      setMessages(msgs);
      setMsgLoading(false);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
    }, 60);
    return unsub;
  }, []);

  // ── 6. Mark main chat as read ─────────────────────────────────────────────
  useEffect(() => {
    if (user?.uid) updateLastRead(user.uid).catch(() => {});
  }, [user?.uid]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !user?.uid || expired || activating) return;
    setSending(true);
    try {
      // isEmergency = true  →  stored in main chat, NOT push-notified, NOT counted for unread
      await sendMessage(user.uid, trimmed, null, null, null, true);
      setText('');
      updateLastRead(user.uid).catch(() => {});
    } catch (err) {
      console.error('[EmergencyChat] send failed:', err);
    } finally {
      setSending(false);
    }
  }, [text, user, expired, activating]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Derived colors ────────────────────────────────────────────────────────
  const isUrgent    = remainingMs < 10 * 60 * 1000; // < 10 min
  const timerColor  = isUrgent ? 'text-red-400' : 'text-orange-400';
  const barColor    = isUrgent
    ? 'bg-red-500'
    : 'bg-gradient-to-r from-orange-500 to-red-500';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1,    y: 0  }}
      exit={{    opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                 p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md h-[88vh] sm:h-[620px]
                      bg-[#0c1220] border border-orange-500/30
                      rounded-t-3xl sm:rounded-3xl flex flex-col
                      shadow-[0_0_70px_rgba(249,115,22,0.18)] overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0
                        border-b border-orange-500/20
                        bg-gradient-to-r from-orange-500/10 to-red-500/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30
                            flex items-center justify-center">
              <ShieldAlert size={16} className="text-orange-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Emergency Chat 🚨</h3>
              <p className="text-[10px] text-orange-400/70">Temporary 1-hour access bypass</p>
            </div>
          </div>

          {/* Live countdown clock */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
              <Clock size={11} className={timerColor} />
              <span className={`text-xs font-mono font-bold ${timerColor}`}>
                {formatCountdown(remainingMs)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Access Remaining bar ── */}
        <div className="px-4 pt-3 pb-2 shrink-0 border-b border-white/[0.05]">
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="text-slate-500 font-medium tracking-wide uppercase">
              Emergency Access Remaining
            </span>
            <span className={`font-mono font-bold ${timerColor}`}>
              {formatCountdown(remainingMs)}
            </span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${Math.max(0, (remainingMs / EMERGENCY_CHAT_DURATION_MS) * 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${barColor}`}
            />
          </div>
        </div>

        {/* ── Info strip ── */}
        <div className="px-4 py-2 shrink-0 bg-orange-500/5 border-b border-orange-500/10">
          <p className="text-[10px] text-orange-400/60 text-center leading-relaxed">
            💾 Messages are saved permanently in the main chat — nothing disappears.
          </p>
        </div>

        {/* ── Activating spinner ── */}
        <AnimatePresence>
          {activating && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden shrink-0"
            >
              <div className="flex items-center justify-center gap-2 px-4 py-2.5
                              bg-orange-500/5 border-b border-orange-500/10">
                <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] text-orange-400/80">Activating emergency access…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Activation error ── */}
        <AnimatePresence>
          {activateErr && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden shrink-0"
            >
              <div className="px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 text-center">
                <p className="text-xs text-red-400">⚠️ Could not activate — check your connection.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Expired banner ── */}
        <AnimatePresence>
          {expired && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden shrink-0"
            >
              <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20 text-center">
                <p className="text-sm font-semibold text-red-400">⏱️ Emergency access expired</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Messages are saved. Closing in 3 seconds…
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Messages ── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {msgLoading ? (
            <div className="flex justify-center mt-10">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20
                              flex items-center justify-center">
                <AlertCircle size={24} className="text-orange-500/40" />
              </div>
              <p className="text-xs text-center leading-relaxed max-w-[200px]">
                No messages yet. Send one — it'll be saved permanently.
              </p>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.senderId === user?.uid;
              const name = isMe
                ? (user?.displayName  || 'You')
                : (partner?.displayName || 'Partner');
              return <EmergencyBubble key={msg.id} msg={msg} isMe={isMe} name={name} />;
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div className="px-3 py-3 border-t border-white/[0.06] bg-[#0c1220] shrink-0">
          {expired ? (
            <div className="flex items-center justify-center py-2">
              <span className="text-slate-600 text-xs opacity-70">
                Access expired — close &amp; reopen to get another hour
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
                placeholder="Send a message…"
                disabled={sending || expired || activating}
                className="flex-1 resize-none bg-white/5 border border-orange-500/20 rounded-xl
                           px-3 py-2.5 text-white text-sm placeholder-slate-600
                           focus:outline-none focus:border-orange-500/40 disabled:opacity-50
                           max-h-24 overflow-y-auto transition-all"
                style={{ minHeight: '40px' }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !text.trim() || expired || activating}
                className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white
                           hover:from-orange-400 hover:to-red-500 disabled:opacity-40
                           disabled:cursor-not-allowed transition-all shrink-0
                           shadow-[0_0_14px_rgba(249,115,22,0.35)]"
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
