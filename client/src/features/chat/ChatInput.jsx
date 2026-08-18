import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, X, CornerUpLeft } from 'lucide-react';
import { useAuthStore } from '../../store';
import { sendMessage } from '../../firebase/db';

// Detect mobile/tablet via touch capability & screen width
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(
      window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window
    );
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

// Truncate reply preview text
function truncate(str, n = 60) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

export default function ChatInput({ isLocked, replyTo, onCancelReply, onMessageSent }) {
  const user = useAuthStore(s => s.user);
  const isMobile = useIsMobile();
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Focus textarea when reply target is set
  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  const handleSend = useCallback(async () => {
    if (isLocked || !user?.uid) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    // Instant optimistic input reset without dimming/blinking
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }

    const replyPayload = replyTo
      ? { id: replyTo.id, text: truncate(replyTo.text, 80), senderName: replyTo.senderName }
      : null;
    onCancelReply?.();

    try {
      await sendMessage(user.uid, trimmed, null, null, replyPayload);
      onMessageSent?.(trimmed);
    } catch (err) {
      console.error('[ChatInput] Send failed:', err);
      // Restore on failure
      setText(trimmed);
    }
  }, [text, isLocked, user?.uid, replyTo, onCancelReply, onMessageSent]);

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      if (isMobile) {
        // Mobile: Enter = newline. Only Send button submits.
        return;
      }
      // Desktop: Enter = send, Shift+Enter = newline
      if (!e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const autoResize = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
  };

  if (isLocked) {
    return (
      <div className="px-4 py-3 border-t border-white/[0.06] bg-[#0c1220]">
        <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-4 py-3 opacity-50 cursor-not-allowed">
          <span className="text-slate-600 text-sm">Chat is locked 🔒</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-white/[0.06] bg-[#0c1220] shrink-0">
      {/* Reply preview bar */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 bg-white/[0.04] border border-cyan-500/20 rounded-xl px-3 py-2">
          <CornerUpLeft size={13} className="text-cyan-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-cyan-400 truncate">{replyTo.senderName}</p>
            <p className="text-xs text-slate-400 truncate">{truncate(replyTo.text, 55)}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="ml-auto p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          onInput={autoResize}
          placeholder={isMobile ? 'Type a message…' : 'Type a message… (Enter to send)'}
          className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm
                     placeholder-slate-600 focus:outline-none focus:border-cyan-500/40
                     max-h-32 overflow-y-auto"
          style={{ minHeight: '44px' }}
        />

        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 text-white
                     hover:from-cyan-400 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
