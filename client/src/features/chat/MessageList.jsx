import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { CornerUpLeft } from 'lucide-react';
import { useAuthStore } from '../../store';
import { subscribeToMessages } from '../../firebase/db';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(ts) {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatFullTimestamp(ts) {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const time = d.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', hour12: true });
  const relative = getRelative(d);
  return `${date} • ${time}${relative ? ` (${relative})` : ''}`;
}

function getRelative(d) {
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)     return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60)     return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)     return `${h}h ago`;
  const dy = Math.floor(h / 24);
  if (dy < 7)     return `${dy}d ago`;
  return '';
}

// Show a divider if the gap between two messages is > 5 minutes
function shouldShowDivider(prev, curr) {
  if (!prev || !curr) return false;
  const a = prev?.toDate ? prev.toDate() : new Date(prev);
  const b = curr?.toDate ? curr.toDate() : new Date(curr);
  return (b - a) > 5 * 60 * 1000;
}

function TimeDivider({ ts }) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    + ' ' + d.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', hour12: true });
  return (
    <div className="flex items-center gap-3 my-2 px-2">
      <div className="flex-1 h-px bg-white/[0.06]" />
      <span className="text-[10px] text-slate-600 whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-white/[0.06]" />
    </div>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({ name }) {
  const initials = name?.[0]?.toUpperCase() || '?';
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
      {initials}
    </div>
  );
}

// ── Reply Quote (shown inside message that has a replyTo) ──────────────────────

function ReplyQuote({ replyTo, onJump }) {
  if (!replyTo) return null;
  return (
    <button
      onClick={onJump}
      className="flex items-start gap-1.5 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 mb-1.5 text-left w-full hover:bg-white/10 transition-colors cursor-pointer"
    >
      <CornerUpLeft size={11} className="text-cyan-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-cyan-400 truncate">{replyTo.senderName}</p>
        <p className="text-xs text-slate-400 truncate leading-relaxed">{replyTo.text}</p>
      </div>
    </button>
  );
}

// ── Media Message ─────────────────────────────────────────────────────────────

function MediaMessage({ url, type }) {
  const [fullscreen, setFullscreen] = useState(false);
  if (type === 'video') {
    return <video src={url} controls className="max-w-[220px] rounded-xl" />;
  }
  return (
    <>
      <img
        src={url} alt="media"
        onClick={() => setFullscreen(true)}
        className="max-w-[220px] rounded-xl cursor-zoom-in hover:opacity-90 transition-opacity"
      />
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setFullscreen(false)}
          >
            <img src={url} alt="full" className="max-w-full max-h-full rounded-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Timestamp Tooltip ─────────────────────────────────────────────────────────

function TimestampTooltip({ ts, isMe, visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: -4 }}
          transition={{ duration: 0.15 }}
          className={`absolute ${isMe ? 'right-0' : 'left-0'} bottom-full mb-1.5 z-30 pointer-events-none`}
        >
          <div className="bg-[#1a2235] border border-white/10 rounded-xl px-3 py-1.5 shadow-xl whitespace-nowrap">
            <p className="text-[11px] text-slate-300">{formatFullTimestamp(ts)}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Context Menu ──────────────────────────────────────────────────────────────

function ContextMenu({ x, y, onReply, onClose }) {
  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener('click', handler);
    window.addEventListener('contextmenu', handler);
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('contextmenu', handler);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{ position: 'fixed', left: x, top: y, zIndex: 9999 }}
      className="bg-[#1a2235] border border-white/10 rounded-xl shadow-2xl py-1.5 min-w-[120px]"
      onClick={e => e.stopPropagation()}
    >
      <button
        onClick={() => { onReply(); onClose(); }}
        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
      >
        <CornerUpLeft size={13} className="text-cyan-400" /> Reply
      </button>
    </motion.div>
  );
}

// ── Swipeable Message (mobile) ────────────────────────────────────────────────

const SWIPE_THRESHOLD = 60;

function SwipeableMessage({ children, onReply, isMobile }) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const scale   = useTransform(x, [0, SWIPE_THRESHOLD], [0.6, 1]);

  const handleDragEnd = useCallback((_, info) => {
    if (info.offset.x >= SWIPE_THRESHOLD) {
      onReply();
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }, [onReply, x]);

  if (!isMobile) return children;

  return (
    <div className="relative">
      {/* Reply icon that peeks out on swipe */}
      <motion.div
        style={{ opacity, scale }}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center pointer-events-none"
      >
        <CornerUpLeft size={12} className="text-cyan-400" />
      </motion.div>
      <motion.div
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: SWIPE_THRESHOLD + 20 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        whileDrag={{ cursor: 'grabbing' }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ── Hover Reply Button (desktop) ──────────────────────────────────────────────

function DesktopMessageWrapper({ children, isMe, onReply, onContextMenu }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={onContextMenu}
    >
      {children}
      <AnimatePresence>
        {hovered && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.1 }}
            onClick={onReply}
            className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-9' : '-right-9'}
              w-7 h-7 rounded-full bg-[#1a2235] border border-white/15 flex items-center justify-center
              hover:bg-cyan-500/20 hover:border-cyan-500/40 transition-colors z-10`}
          >
            <CornerUpLeft size={12} className="text-cyan-400" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main MessageList ──────────────────────────────────────────────────────────

export default function MessageList({ onReply }) {
  const user     = useAuthStore(s => s.user);
  const partner  = useAuthStore(s => s.partner);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tappedId, setTappedId] = useState(null); // timestamp tooltip
  const [contextMenu, setContextMenu] = useState(null); // { x, y, msg }
  const bottomRef  = useRef(null);
  const msgRefs    = useRef({});   // id → DOM ref for jump-to

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(
      window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window
    );
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const unsub = subscribeToMessages(msgs => {
      setMessages(msgs);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Auto-scroll on new messages (only if already near bottom)
  useEffect(() => {
    const el = bottomRef.current?.parentElement;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom || messages.length <= 1) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Jump to original message when reply quote is tapped
  const jumpToMessage = useCallback((id) => {
    const el = msgRefs.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Brief flash highlight
    el.classList.add('ring-2', 'ring-cyan-400/50', 'rounded-2xl');
    setTimeout(() => el.classList.remove('ring-2', 'ring-cyan-400/50', 'rounded-2xl'), 1200);
  }, []);

  // Toggle timestamp tooltip on tap/click
  const handleBubbleTap = useCallback((id) => {
    setContextMenu(null);
    setTappedId(prev => prev === id ? null : id);
  }, []);

  // Context menu on right-click (desktop)
  const handleContextMenu = useCallback((e, msg) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, msg });
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-600">
        <span className="text-4xl">💬</span>
        <p className="text-sm">Chat is open! Say hi 👋</p>
      </div>
    );
  }

  // Build groups: consecutive messages from same sender, break if > 5 min gap
  const groups = [];
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    const sameUser = prev && prev.senderId === msg.senderId;
    const sameGroup = sameUser && !shouldShowDivider(prev?.createdAt, msg.createdAt);
    if (sameGroup) {
      groups[groups.length - 1].msgs.push(msg);
    } else {
      groups.push({ msgs: [msg], showDivider: prev ? shouldShowDivider(prev?.createdAt, msg.createdAt) : false });
    }
  });

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scroll-smooth">
        {groups.map((group, gi) => {
          const firstMsg  = group.msgs[0];
          const lastMsg   = group.msgs[group.msgs.length - 1];
          const isMe      = firstMsg.senderId === user?.uid;
          const name      = isMe
            ? (user?.displayName || 'You')
            : (partner?.displayName || 'Shahinur');

          return (
            <div key={gi}>
              {group.showDivider && <TimeDivider ts={firstMsg.createdAt} />}

              <div className={`flex gap-2 items-end ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isMe && <Avatar name={name} />}

                <div className={`flex flex-col gap-0.5 max-w-[72%] sm:max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender name (only first in group) */}
                  <span className="text-[11px] text-slate-500 px-1">{name}</span>

                  {group.msgs.map((msg, mi) => {
                    const isFirst = mi === 0;
                    const isLast  = mi === group.msgs.length - 1;

                    const bubbleContent = (
                      <div
                        ref={el => { if (el) msgRefs.current[msg.id] = el; }}
                        className={`relative rounded-2xl px-4 py-2.5 max-w-full break-words transition-all ${
                          isMe
                            ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-tr-sm'
                            : 'bg-white/[0.06] border border-white/10 text-white rounded-tl-sm'
                        } ${!isFirst && isMe  ? 'rounded-tr-2xl' : ''}
                          ${!isFirst && !isMe ? 'rounded-tl-2xl' : ''}`}
                        onClick={() => handleBubbleTap(msg.id)}
                      >
                        {/* Quoted reply */}
                        {msg.replyTo && (
                          <ReplyQuote replyTo={msg.replyTo} onJump={() => jumpToMessage(msg.replyTo.id)} />
                        )}

                        {msg.mediaUrl
                          ? <MediaMessage url={msg.mediaUrl} type={msg.mediaType} />
                          : <p className="text-sm leading-relaxed">{msg.text}</p>
                        }

                        {/* Timestamp tooltip (tap on bubble) */}
                        <TimestampTooltip
                          ts={msg.createdAt}
                          isMe={isMe}
                          visible={tappedId === msg.id}
                        />
                      </div>
                    );

                    const wrappedBubble = isMobile ? (
                      <SwipeableMessage
                        key={msg.id}
                        onReply={() => onReply?.({ id: msg.id, text: msg.text || '', senderName: name })}
                        isMobile={true}
                      >
                        {bubbleContent}
                      </SwipeableMessage>
                    ) : (
                      <DesktopMessageWrapper
                        key={msg.id}
                        isMe={isMe}
                        onReply={() => onReply?.({ id: msg.id, text: msg.text || '', senderName: name })}
                        onContextMenu={(e) => handleContextMenu(e, { ...msg, _name: name })}
                      >
                        {bubbleContent}
                      </DesktopMessageWrapper>
                    );

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, scale: 0.92, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                      >
                        {wrappedBubble}
                      </motion.div>
                    );
                  })}

                  {/* Time shown below last message in group */}
                  <span className="text-[10px] text-slate-600 px-1 mt-0.5">
                    {formatTime(lastMsg.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Desktop right-click context menu */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onReply={() => onReply?.({
              id: contextMenu.msg.id,
              text: contextMenu.msg.text || '',
              senderName: contextMenu.msg._name,
            })}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
