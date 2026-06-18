import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock } from 'lucide-react';
import { useAuthStore } from '../../store';
import { subscribeToChatRoom } from '../../firebase/db';
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
  const user      = useAuthStore(s => s.user);
  const [chatRoom, setChatRoom] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const unsub = subscribeToChatRoom(data => {
      setChatRoom(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const remaining = useCountdown(chatRoom?.expiresAt);

  // Auto-detect expiry client-side
  const isExpired = chatRoom?.unlocked && remaining === 0;
  const isUnlocked = chatRoom?.unlocked && !isExpired;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080b14] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-57px)] bg-[#080b14]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0c1220] shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isUnlocked ? 'bg-cyan-500/20' : 'bg-slate-700/40'}`}>
            {isUnlocked ? <Unlock size={15} className="text-cyan-400" /> : <Lock size={15} className="text-slate-500" />}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">StudyVerse Chat 💬</h2>
            <p className={`text-xs ${isUnlocked ? 'text-green-400' : 'text-slate-500'}`}>
              {isUnlocked ? 'Chat is open!' : isExpired ? 'Session ended' : 'Locked — study 8h each to unlock'}
            </p>
          </div>
        </div>
        {isUnlocked && remaining !== null && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-1.5">
            <span className="text-xs text-green-400">Closes in</span>
            <span className={`font-mono text-sm font-bold ${remaining < 300 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
              {formatCountdown(remaining)}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <AnimatePresence mode="wait">
        {isUnlocked ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <MessageList />
            <ChatInput isLocked={false} />
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
