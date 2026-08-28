import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Lock, Sparkles, AlertCircle } from 'lucide-react';
import { QuestionLimitModal } from './QuestionLimitModal';
import { MarkdownContent } from './MarkdownContent';
import { setDailyLimit, sendChatMessage, buildChatContextSummary } from '../../lib/mentorApi';

const QUICK_SUGGESTIONS = [
  'আজ কোন chapter-টা সবচেয়ে জরুরি?',
  'Chemistry-তে কত chapter বাকি আছে?',
  'BUET-এর জন্য PCM balance কেমন হওয়া উচিত?',
  'আমার streak ভাঙছে কেন?',
  'HSC-এ Golden A+ পেতে কী করতে হবে?',
  'HigherMath-এ সবচেয়ে কঠিন topic কোনটা?',
];

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20
                        border border-cyan-500/20 flex items-center justify-center shrink-0 mb-0.5">
          <Bot size={14} className="text-cyan-400" />
        </div>
      )}

      <div className={`max-w-[84%] px-4 py-3 text-sm
        ${isUser
          ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/15 border border-cyan-500/25 text-cyan-50 rounded-2xl rounded-br-sm'
          : 'bg-white/[0.04] border border-white/[0.08] rounded-2xl rounded-bl-sm'}`}
      >
        {isUser ? (
          <p className="leading-relaxed whitespace-pre-wrap text-[13.5px]">{msg.content}</p>
        ) : (
          // AI messages rendered as markdown
          <MarkdownContent>{msg.content}</MarkdownContent>
        )}
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08]
                        flex items-center justify-center shrink-0 mb-0.5">
          <User size={14} className="text-slate-400" />
        </div>
      )}
    </motion.div>
  );
}

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

export function MentorChat({ userId, usage, onUsageUpdate, fullContext, todayAnalysisText, initialMessages = [], activeMemories = [], activeGuidelines = [] }) {
  const [messages,  setMessages]  = useState(initialMessages);
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error,     setError]     = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (initialMessages?.length > 0) setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (usage && !usage.limitSet && (usage.questionsUsed || 0) === 0) {
      setShowModal(true);
    }
  }, [usage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const questionsUsed = usage?.questionsUsed || 0;
  const dailyLimit    = usage?.dailyLimit;
  const isUnlimited   = dailyLimit === 'unlimited' || dailyLimit === null || dailyLimit === undefined;
  const isLimitSet    = usage?.limitSet;
  const limitReached  = !isUnlimited && isLimitSet && questionsUsed >= Number(dailyLimit);

  const handleLimitSelect = async (limitVal) => {
    if (!userId) return;
    try {
      await setDailyLimit(userId, limitVal);
      onUsageUpdate({ questionsUsed: 0, dailyLimit: limitVal, limitSet: true });
      setShowModal(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch {
      setError('Limit set করতে সমস্যা হয়েছে।');
    }
  };

  const handleSend = async (text = input.trim()) => {
    if (!userId || !text || sending || limitReached) return;
    setInput('');
    setError('');
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const contextSummary = buildChatContextSummary(fullContext, todayAnalysisText);
      const data = await sendChatMessage(userId, text, messages, contextSummary, activeMemories, activeGuidelines);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response, timestamp: data.timestamp }]);

      onUsageUpdate({ ...usage, questionsUsed: data.questionsUsed, dailyLimit: data.dailyLimit, limitSet: true });
    } catch (e) {
      if (e.status === 429 || e.message?.includes('limit')) {
        setError('আজকের question limit শেষ। কাল আবার চেষ্টা করো।');
      } else {
        setError(e.message || 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করো।');
      }
      setMessages(prev => prev.filter(m => m !== userMsg));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const LimitPill = () => {
    if (!isLimitSet) return null;
    const pct = isUnlimited ? 0 : (questionsUsed / Number(dailyLimit)) * 100;
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border
        ${limitReached ? 'bg-red-500/15 border-red-500/30 text-red-400'
          : pct >= 80 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          : 'bg-white/[0.04] border-white/[0.08] text-slate-400'}`}
      >
        {limitReached ? <Lock size={10} /> : <Sparkles size={10} />}
        {isUnlimited ? '∞ Questions' : `${questionsUsed} / ${dailyLimit}`}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <AnimatePresence>
        {showModal && (
          <QuestionLimitModal
            onSelect={handleLimitSelect}
            onSkip={() => handleLimitSelect('unlimited')}
          />
        )}
      </AnimatePresence>

      {/* Header */}
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
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
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl rounded-bl-sm px-4 py-3 max-w-[84%]">
              <p className="text-slate-200 text-[13.5px] leading-relaxed">
                তোমার সব data দেখলাম। Physics, Chemistry, Math — কোনটায় সমস্যা হচ্ছে? সরাসরি জিজ্ঞেস করো, আমি data দেখে বলব।
              </p>
            </div>
          </motion.div>
        )}

        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        {sending && <TypingIndicator />}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10
                         border border-red-500/20 rounded-xl px-3 py-2.5"
            >
              <AlertCircle size={12} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Quick suggestions */}
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

      {/* Input */}
      <div className="px-4 pb-4 shrink-0">
        {limitReached ? (
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-500
                          bg-white/[0.02] border border-white/[0.05] rounded-xl">
            <Lock size={12} />
            আজকের limit শেষ — {dailyLimit}টি প্রশ্ন হয়েছে। কাল আবার শুরু হবে।
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
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
                         flex items-center justify-center transition-all shrink-0"
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
        )}
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
