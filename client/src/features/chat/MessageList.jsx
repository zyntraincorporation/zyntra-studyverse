import {
  useEffect, useRef, useState, useCallback, useMemo, memo,
} from 'react';
import {
  motion, AnimatePresence, useMotionValue, useTransform, animate,
} from 'framer-motion';
import { CornerUpLeft, ChevronDown, ArrowUp } from 'lucide-react';
import { useAuthStore } from '../../store';
import { subscribeToMessages, fetchOlderMessages } from '../../firebase/db';

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
  if (s < 60)  return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const dy = Math.floor(h / 24);
  if (dy < 7)  return `${dy}d ago`;
  return '';
}

function shouldShowDivider(prev, curr) {
  if (!prev || !curr) return false;
  const a = prev?.toDate ? prev.toDate() : new Date(prev);
  const b = curr?.toDate ? curr.toDate() : new Date(curr);
  return (b - a) > 5 * 60 * 1000;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const TimeDivider = memo(function TimeDivider({ ts }) {
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
});

const Avatar = memo(function Avatar({ name }) {
  const initials = name?.[0]?.toUpperCase() || '?';
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
      {initials}
    </div>
  );
});

const ReplyQuote = memo(function ReplyQuote({ replyTo, onJump }) {
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
});

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

const TimestampTooltip = memo(function TimestampTooltip({ ts, isMe, visible }) {
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
});

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

const SwipeableMessage = memo(function SwipeableMessage({ children, onReply }) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const scale   = useTransform(x, [0, SWIPE_THRESHOLD], [0.6, 1]);

  const handleDragEnd = useCallback((_, info) => {
    if (info.offset.x >= SWIPE_THRESHOLD) {
      onReply();
    }
    animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
  }, [onReply, x]);

  return (
    <div className="relative">
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
});

// ── Desktop Hover Wrapper ────────────────────────────────────────────────────

const DesktopMessageWrapper = memo(function DesktopMessageWrapper({
  children, isMe, onReply, onContextMenu,
}) {
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
});

// ── Main MessageList ──────────────────────────────────────────────────────────

export default function MessageList({ onReply, partnerLastReadAt, partnerLastSeen }) {
  const user    = useAuthStore(s => s.user);
  const partner = useAuthStore(s => s.partner);

  const [messages,    setMessages]    = useState([]);
  const [olderMsgs,   setOlderMsgs]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(true);
  const [tappedId,    setTappedId]    = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showNewBtn,  setShowNewBtn]  = useState(false);
  const [newCount,    setNewCount]    = useState(0);

  const scrollRef  = useRef(null);
  const bottomRef  = useRef(null);
  const msgRefs    = useRef({});
  const prevLenRef = useRef(0);

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

  // ── Main message subscription ──────────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribeToMessages(msgs => {
      setMessages(msgs);
      setLoading(false);
    }, 60);
    return unsub;
  }, []);

  // ── Auto-scroll + new-messages button logic ───────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const newMsgCount = messages.length - prevLenRef.current;
    const hasNewFromPartner = newMsgCount > 0 &&
      messages.slice(-newMsgCount).some(m => m.senderId !== user?.uid);

    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;

    if (nearBottom || messages.length <= 1 || !hasNewFromPartner) {
      // Smooth scroll to bottom
      bottomRef.current?.scrollIntoView({ behavior: prevLenRef.current === 0 ? 'instant' : 'smooth' });
      setShowNewBtn(false);
      setNewCount(0);
    } else {
      // User is scrolled up — show "new messages" button
      if (hasNewFromPartner) {
        setNewCount(c => c + newMsgCount);
        setShowNewBtn(true);
      }
    }

    prevLenRef.current = messages.length;
  }, [messages.length]); // eslint-disable-line

  // ── Load older messages (pagination) ──────────────────────────────────────
  const handleLoadMore = useCallback(async () => {
    const allMsgs = [...olderMsgs, ...messages];
    if (!allMsgs.length || loadingMore) return;
    const oldest = allMsgs[0];
    setLoadingMore(true);
    try {
      const older = await fetchOlderMessages(oldest.id, 30);
      if (older.length < 30) setHasMore(false);
      if (older.length > 0) {
        // Preserve scroll position after prepending
        const el = scrollRef.current;
        const prevHeight = el?.scrollHeight || 0;
        setOlderMsgs(prev => [...older, ...prev]);
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - prevHeight;
        });
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('[MessageList] fetchOlderMessages failed:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [olderMsgs, messages, loadingMore]);

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowNewBtn(false);
    setNewCount(0);
  }, []);

  // ── Jump to original message ───────────────────────────────────────────────
  const jumpToMessage = useCallback((id) => {
    const el = msgRefs.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-cyan-400/50', 'rounded-2xl');
    setTimeout(() => el.classList.remove('ring-2', 'ring-cyan-400/50', 'rounded-2xl'), 1200);
  }, []);

  const handleBubbleTap = useCallback((id) => {
    setContextMenu(null);
    setTappedId(prev => prev === id ? null : id);
  }, []);

  const handleContextMenu = useCallback((e, msg) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, msg });
  }, []);

  // ── Build message groups ───────────────────────────────────────────────────
  const allMessages = useMemo(() => [...olderMsgs, ...messages], [olderMsgs, messages]);

  const groups = useMemo(() => {
    const result = [];
    allMessages.forEach((msg, i) => {
      const prev = allMessages[i - 1];
      const sameUser  = prev && prev.senderId === msg.senderId;
      const sameGroup = sameUser && !shouldShowDivider(prev?.createdAt, msg.createdAt);
      if (sameGroup) {
        result[result.length - 1].msgs.push(msg);
      } else {
        result.push({
          msgs: [msg],
          showDivider: prev ? shouldShowDivider(prev?.createdAt, msg.createdAt) : false,
        });
      }
    });
    return result;
  }, [allMessages]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!allMessages.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-600">
        <span className="text-4xl">💬</span>
        <p className="text-sm">Chat is open! Say hi 👋</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* ── Scroll container ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scroll-smooth overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Load more button */}
        {hasMore && (
          <div className="flex justify-center mb-3">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs text-slate-400
                         bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-all
                         disabled:opacity-50"
            >
              {loadingMore ? (
                <span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowUp size={12} />
              )}
              {loadingMore ? 'Loading…' : 'Load earlier messages'}
            </button>
          </div>
        )}

        {groups.map((group, gi) => {
          const firstMsg = group.msgs[0];
          const lastMsg  = group.msgs[group.msgs.length - 1];
          const isMe     = firstMsg.senderId === user?.uid;
          const name     = isMe
            ? (user?.displayName || 'You')
            : (partner?.displayName || firstMsg.senderId?.slice(0, 6) || 'Partner');

          return (
            <div key={`${gi}-${firstMsg.id}`}>
              {group.showDivider && <TimeDivider ts={firstMsg.createdAt} />}

              <div className={`flex gap-2 items-end ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isMe && <Avatar name={name} />}

                <div className={`flex flex-col gap-0.5 max-w-[72%] sm:max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-[11px] text-slate-500 px-1">{name}</span>

                  {group.msgs.map((msg, mi) => {
                    const isFirst = mi === 0;

                    // Read receipt logic for my messages
                    let statusIcon = null;
                    if (isMe) {
                      const msgTime = msg.createdAt?.toDate ? msg.createdAt.toDate().getTime() : new Date(msg.createdAt).getTime();
                      const readTime = partnerLastReadAt ? partnerLastReadAt.getTime() : 0;
                      const seenTime = partnerLastSeen ? partnerLastSeen.getTime() : 0;

                      if (msgTime <= readTime) {
                        // Seen
                        statusIcon = <span className="text-cyan-300 drop-shadow-[0_0_2px_rgba(34,211,238,0.8)] ml-1">✓✓</span>;
                      } else if (seenTime >= msgTime) {
                        // Delivered (partner was online after message was sent)
                        statusIcon = <span className="text-white/60 ml-1">✓✓</span>;
                      } else {
                        // Sent
                        statusIcon = <span className="text-white/60 ml-1">✓</span>;
                      }
                    }

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
                        {msg.replyTo && (
                          <ReplyQuote replyTo={msg.replyTo} onJump={() => jumpToMessage(msg.replyTo.id)} />
                        )}

                        {msg.mediaUrl ? (
                          <div className="flex flex-col gap-1">
                            <MediaMessage url={msg.mediaUrl} type={msg.mediaType} />
                            {isMe && (
                              <div className="flex justify-end gap-1 text-[9px] items-center">
                                {formatTime(msg.createdAt)}
                                {statusIcon}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap flex items-end justify-between gap-3 min-w-[60px]">
                            <span>{msg.text}</span>
                            {isMe && (
                              <span className="text-[9px] translate-y-1 inline-flex items-center shrink-0">
                                {formatTime(msg.createdAt)}
                                {statusIcon}
                              </span>
                            )}
                          </p>
                        )}

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
                        layout="position"
                      >
                        {wrappedBubble}
                      </motion.div>
                    );
                  })}

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

      {/* ── New messages floating button ── */}
      <AnimatePresence>
        {showNewBtn && (
          <motion.button
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2
                       bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold
                       px-4 py-2 rounded-full shadow-[0_4px_20px_rgba(6,182,212,0.4)]
                       hover:shadow-[0_4px_24px_rgba(6,182,212,0.6)] transition-shadow z-20"
          >
            <ChevronDown size={14} />
            {newCount > 1 ? `${newCount} new messages` : '1 new message'}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Desktop context menu ── */}
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
    </div>
  );
}
