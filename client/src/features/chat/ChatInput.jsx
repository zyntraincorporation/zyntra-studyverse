import { useState, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { useAuthStore } from '../../store';
import { sendMessage } from '../../firebase/db';

// NOTE: Media upload (📎) is disabled — Firebase Storage requires the Blaze (paid) plan.
// Text chat works fully on the free Spark plan.
// To re-enable uploads: upgrade to Blaze, restore storage.js, and uncomment the media section.

export default function ChatInput({ isLocked }) {
  const user = useAuthStore(s => s.user);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (isLocked || !user?.uid) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await sendMessage(user.uid, trimmed);
      setText('');
    } catch (err) {
      console.error('Send failed:', err);
    } finally {
      setSending(false);
    }
  }, [text, isLocked, user?.uid]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
      <div className="flex items-end gap-2">
        <textarea
          rows={1}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message… (Enter to send)"
          disabled={sending}
          className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm
                     placeholder-slate-600 focus:outline-none focus:border-cyan-500/40
                     disabled:opacity-50 max-h-32 overflow-y-auto transition-all"
          style={{ minHeight: '44px' }}
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
          }}
        />

        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 text-white
                     hover:from-cyan-400 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0"
        >
          <Send size={18} />
        </button>
      </div>

      {/* Free plan notice */}
      <p className="text-[10px] text-slate-700 mt-1.5 text-center">
        📝 Text only · Photo/video sharing requires Firebase Blaze plan
      </p>
    </div>
  );
}
