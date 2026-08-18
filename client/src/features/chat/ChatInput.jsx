import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, X, CornerUpLeft, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store';
import { sendMessage } from '../../firebase/db';
import { countGraphemes } from '../../lib/grapheme';
import { COUPLE_CONFIG } from '../../lib/constants';

const DAILY_LIMIT = COUPLE_CONFIG.dailyCharLimit; // 25 000
const WARN_THRESHOLD = 500; // show warning when < 500 remaining

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

/**
 * Props:
 *   isLocked       — vocab gate still locked (bool)
 *   usedChars      — current shared daily usage (number)
 *   replyTo        — reply target { id, text, senderName } | null
 *   onCancelReply  — clear reply target
 *   onMessageSent  — called with text string after successful send
 */
export default function ChatInput({ isLocked, usedChars = 0, replyTo, onCancelReply, onMessageSent }) {
  const user = useAuthStore(s => s.user);
  const isMobile = useIsMobile();
  const [text, setText] = useState('');
  const [sendError, setSendError] = useState(null); // null | string
  const textareaRef = useRef(null);

  // Focus textarea when reply target is set
  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  // ── Derived limits ────────────────────────────────────────────────────────
  const remaining   = Math.max(0, DAILY_LIMIT - usedChars);
  const msgGraphemes = countGraphemes(text);
  const wouldExceed  = msgGraphemes > remaining;
  const isNearLimit  = remaining < WARN_THRESHOLD && remaining > 0;

  // Can we send?
  const canSend = !isLocked && !!user?.uid && text.trim().length > 0 && !wouldExceed && remaining > 0;

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    setSendError(null);

    // Optimistic input reset — no flicker
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
      if (err?.code === 'DAILY_LIMIT_EXCEEDED') {
        setSendError(
          `⚠️ Daily Chat Limit Reached\n` +
          `You have only ${err.remaining.toLocaleString('en-US')} characters remaining today.`
        );
      } else {
        setSendError('Failed to send. Please try again.');
      }
      // Restore on failure
      setText(trimmed);
    }
  }, [canSend, text, isLocked, user?.uid, replyTo, onCancelReply, onMessageSent]);

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      if (isMobile) return; // Mobile: Enter = newline only
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
      {/* Server-side DAILY_LIMIT_EXCEEDED error banner */}
      {sendError && (
        <div className="flex items-start gap-2 mb-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
          <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            {sendError.split('\n').map((line, i) => (
              <p key={i} className={`${i === 0 ? 'text-xs font-semibold text-red-300' : 'text-[11px] text-red-400/80'}`}>
                {line}
              </p>
            ))}
          </div>
          <button onClick={() => setSendError(null)} className="text-red-400/60 hover:text-red-300 shrink-0">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Client-side "would exceed" warning */}
      {wouldExceed && !sendError && (
        <div className="flex items-center gap-2 mb-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          <AlertTriangle size={13} className="text-red-400 shrink-0" />
          <p className="text-[11px] text-red-300">
            This message ({msgGraphemes.toLocaleString()} chars) exceeds your remaining{' '}
            {remaining.toLocaleString()} characters.
          </p>
        </div>
      )}

      {/* Near-limit warning */}
      {isNearLimit && !wouldExceed && !sendError && (
        <div className="flex items-center gap-2 mb-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2">
          <AlertTriangle size={13} className="text-orange-400 shrink-0" />
          <p className="text-[11px] text-orange-300">
            Only {remaining.toLocaleString()} characters remaining today.
          </p>
        </div>
      )}

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
          onChange={e => { setText(e.target.value); setSendError(null); }}
          onKeyDown={handleKey}
          onInput={autoResize}
          placeholder={
            remaining <= 0
              ? 'Daily limit reached 🔒'
              : isMobile
              ? 'Type a message…'
              : 'Type a message… (Enter to send)'
          }
          disabled={remaining <= 0}
          className={`flex-1 resize-none bg-white/5 border rounded-xl px-4 py-3 text-white text-sm
                     placeholder-slate-600 focus:outline-none max-h-32 overflow-y-auto
                     disabled:opacity-50 disabled:cursor-not-allowed
                     ${wouldExceed
                       ? 'border-red-500/40 focus:border-red-500/60'
                       : 'border-white/10 focus:border-cyan-500/40'
                     }`}
          style={{ minHeight: '44px' }}
        />

        {/* Character count badge when typing */}
        {text.length > 0 && (
          <div className={`text-[10px] tabular-nums shrink-0 mb-1 ${wouldExceed ? 'text-red-400' : 'text-slate-600'}`}>
            {msgGraphemes.toLocaleString()}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={!canSend}
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
