import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Lock, Sparkles, AlertCircle } from 'lucide-react';
import { QuestionLimitModal } from './QuestionLimitModal';
import { setDailyLimit, sendChatMessage, buildChatContextSummary } from '../../lib/mentorApi';

// ─────────────────────────────────────────────────────────────────────────────
// MentorChat
// Full interactive chat interface with:
//   - Daily question limit enforcement (server-side)
//   - Limit setup modal on first open
//   - Typing indicator
//   - Quick suggestion chips
//   - Message history in current session
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_SUGGESTIONS = [
  'আজ কোন chapter-টা সবচেয়ে জরুরি?',
  'Chemistry-তে কত chapter বাকি আছে?',
  'Physics-এর সবচেয়ে কঠিন chapter কোনটা?',
  'আমার streak ভাঙছে কেন?',
  'BUET-এর জন্য কোথায় focus করব?',
  'Math কতটা পিছিয়ে আছি?',
];

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, idx }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Avatar — mentor side */}
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20
                        border border-cyan-500/20 flex items-center justify-center shrink-0 mb-0.5">
          <Bot size={14} className="text-cyan-400" />
        </div>
      )}

      {/* Bubble */}
      <div className={`max-w-[82%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
        ${isUser
          ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/15 border border-cyan-500/25 text-cyan-50 rounded-2xl rounded-br-sm'
          : 'bg-white/[0.04] border border-white/[0.08] text-slate-200 rounded-2xl rounded-bl-sm'}`}
      >
        {msg.content}
      </div>

      {/* Avatar — user side */}
      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08]
                        flex items-center justify-center shrink-0 mb-0.5">
          <User size={14} className="text-slate-400" />
        </div>
      )}
    </motion.div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5 justify-start">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20
                      border border-cyan-500/20 flex items-center justify-center shrink-0">
        <Bot size={14} className="text-cyan-400" />
      </div>
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1.5 items-center h-4">
          {[0, 0.15, 0.3].map((delay, i) => (
            <motion.span
              key={i}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 rounded-full bg-slate-500"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function MentorChat({ usage, onUsageUpdate, fullContext, todayAnalysisText, initialMessages = [] }) {
  const [messages,     setMessages]     = useState(initialMessages);
  const [input,        setInput]        = useState('');
  const [sending,      setSending]      = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [error,        setError]        = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Show limit modal if limit not yet set for today
  useEffect(() => {
    if (usage && !usage.limitSet && usage.questionsUsed === 0) {
      setShowModal(true);
    }
  }, [usage]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const questionsUsed = usage?.questionsUsed || 0;
  const dailyLimit    = usage?.dailyLimit;
  const isUnlimited   = dailyLimit === 'unlimited' || dailyLimit === null;
  const isLimitSet    = usage?.limitSet;
  const limitReached  = !isUnlimited && isLimitSet && questionsUsed >= Number(dailyLimit);

  // Handle limit selection from modal
  const handleLimitSelect = async (limit) => {
    try {
      await setDailyLimit(limit);
      onUsageUpdate({ questionsUsed: 0, dailyLimit: limit, limitSet: true });
      setShowModal(false);
      inputRef.current?.focus();
    } catch (e) {
      setError('Limit set করতে সমস্যা হয়েছে। আবার চেষ্টা করো।');
    }
  };

  // Send message
  const handleSend = async (text = input.trim()) => {
    if (!text || sending || limitReached) return;
    setInput('');
    setError('');

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);

    try {
      // Build lightweight context for the chat API
      const contextSummary = buildChatContextSummary(fullContext, todayAnalysisText);

      const data = await sendChatMessage(text, messages, contextSummary);

      const assistantMsg = { role: 'assistant', content: data.response, timestamp: data.timestamp };
      setMessages(prev => [...prev, assistantMsg]);

      // Update usage counter
      onUsageUpdate({
        ...usage,
        questionsUsed: data.questionsUsed,
        dailyLimit:    data.dailyLimit,
        limitSet:      true,
      });
    } catch (e) {
      if (e.status === 429) {
        setError('আজকের question limit শেষ। কাল আবার চেষ্টা করো।');
      } else {
        setError('কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করো।');
      }
      // Remove optimistic user message on failure
      setMessages(prev => prev.filter(m => m !== userMsg));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Limit counter pill
  const LimitPill = () => {
    if (!isLimitSet) return null;
    const pct = isUnlimited ? 0 : (questionsUsed / Number(dailyLimit)) * 100;
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border
        ${limitReached
          ? 'bg-red-500/15 border-red-500/30 text-red-400'
          : pct >= 80
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            : 'bg-white/[0.04] border-white/[0.08] text-slate-400'}`}
      >
        {limitReached ? <Lock size={10} /> : <Sparkles size={10} />}
        {isUnlimited ? '∞' : `${questionsUsed} / ${dailyLimit}`}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Limit modal ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <QuestionLimitModal
            onSelect={handleLimitSelect}
            onSkip={() => { handleLimitSelect('unlimited'); }}
          />
        )}
      </AnimatePresence>

      {/* ── Chat header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-cyan-500/20 border border-cyan-500/20 flex items-center justify-center">
            <Bot size={13} className="text-cyan-400" />
          </div>
          <span className="text-sm font-medium text-white">AI Mentor</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <LimitPill />
      </div>

      {/* ── Messages area ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">

        {/* Welcome message if no history */}
        {messages.length === 0 && !sending && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end gap-2.5 justify-start"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20
                            border border-cyan-500/20 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-cyan-400" />
            </div>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl rounded-bl-sm px-4 py-3 max-w-[82%]">
              <p className="text-slate-200 text-sm leading-relaxed">
                আমি তোমার সব progress দেখছি। কী জানতে চাও? BUET preparation, specific chapter, বা আজকের plan — যেকোনো কিছু জিজ্ঞেস করো।
              </p>
            </div>
          </motion.div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} idx={i} />)}

        {/* Typing indicator */}
        {sending && <TypingIndicator />}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10
                         border border-red-500/20 rounded-xl px-3 py-2.5"
            >
              <AlertCircle size={12} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Quick suggestions (only when no messages) ─────────────────────── */}
      {messages.length === 0 && (
        <div className="px-4 pb-3 shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                disabled={sending || limitReached}
                className="text-[11px] px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07]
                           text-slate-400 hover:border-cyan-500/30 hover:text-cyan-300 hover:bg-cyan-500/5
                           transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input area ────────────────────────────────────────────────────── */}
      <div className="px-4 pb-4 shrink-0">
        {limitReached ? (
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-500
                          bg-white/[0.02] border border-white/[0.05] rounded-xl">
            <Lock size={12} />
            আজকের limit শেষ — {dailyLimit}টি প্রশ্ন করা হয়েছে। কাল আবার শুরু হবে।
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  // Auto-resize
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={handleKeyDown}
                placeholder={sending ? 'Mentor ভাবছে…' : 'Mentor-কে কিছু জিজ্ঞেস করো…'}
                disabled={sending}
                className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-3 text-sm text-white
                           placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:bg-white/[0.06]
                           transition-all resize-none leading-relaxed disabled:opacity-50"
                style={{ minHeight: '46px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || sending}
              className="h-[46px] w-[46px] rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600
                         hover:from-cyan-400 hover:to-blue-500 disabled:opacity-35 disabled:cursor-not-allowed
                         flex items-center justify-center transition-all shrink-0
                         shadow-[0_0_16px_rgba(6,182,212,0.2)]"
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
        )}

        {/* Set limit button (if not yet set) */}
        {!isLimitSet && (
          <button
            onClick={() => setShowModal(true)}
            className="mt-2 w-full text-[11px] text-slate-600 hover:text-cyan-400
                       transition-colors flex items-center justify-center gap-1.5"
          >
            <Sparkles size={10} />
            Set daily question limit
          </button>
        )}
      </div>
    </div>
  );
}
