import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store';
import { subscribeToMessages } from '../../firebase/db';

function formatTime(ts) {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function Avatar({ name, size = 8 }) {
  return (
    <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

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

export default function MessageList() {
  const user     = useAuthStore(s => s.user);
  const partner  = useAuthStore(s => s.partner);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeToMessages(msgs => {
      setMessages(msgs);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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

  // Group consecutive messages from same sender
  const groups = [];
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    if (prev && prev.senderId === msg.senderId) {
      groups[groups.length - 1].push(msg);
    } else {
      groups.push([msg]);
    }
  });

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {groups.map((group, gi) => {
        const isMe   = group[0].senderId === user?.uid;
        const name   = isMe ? (user?.displayName || 'You') : (partner?.displayName || 'Partner');
        return (
          <div key={gi} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
            {!isMe && <Avatar name={name} />}
            <div className={`flex flex-col gap-1 max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-[11px] text-slate-500 px-1">{name}</span>
              {group.map((msg, mi) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.9, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className={`rounded-2xl px-4 py-2.5 max-w-full break-words ${
                    isMe
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-tr-sm'
                      : 'bg-white/[0.06] border border-white/10 text-white rounded-tl-sm'
                  } ${mi === 0 ? '' : isMe ? 'rounded-tr-2xl' : 'rounded-tl-2xl'}`}
                >
                  {msg.mediaUrl
                    ? <MediaMessage url={msg.mediaUrl} type={msg.mediaType} />
                    : <p className="text-sm leading-relaxed">{msg.text}</p>
                  }
                </motion.div>
              ))}
              <span className="text-[10px] text-slate-600 px-1">
                {formatTime(group[group.length - 1].createdAt)}
              </span>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
