import { motion } from 'framer-motion';
import { MessageSquare, ChevronRight, Calendar, Clock } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// ChatHistoryPanel
// Sidebar list of past chat dates. Click a date to view that session read-only.
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00+06:00');
    return d.toLocaleDateString('en-BD', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function DayEntry({ entry, isSelected, onClick }) {
  return (
    <motion.button
      whileHover={{ x: 2 }}
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-150
        ${isSelected
          ? 'bg-cyan-500/10 border-cyan-500/30 text-white'
          : 'bg-white/[0.025] border-white/[0.06] text-slate-400 hover:border-white/15 hover:text-white hover:bg-white/[0.04]'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{formatDate(entry.date)}</p>
          {entry.topicSummary && (
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">{entry.topicSummary}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 text-[10px] text-slate-600">
            <MessageSquare size={9} />
            {entry.questionCount || 0}
          </span>
          <ChevronRight size={13} className={isSelected ? 'text-cyan-400' : 'text-slate-600'} />
        </div>
      </div>
    </motion.button>
  );
}

export function ChatHistoryPanel({ dates = [], selectedDate, onSelectDate, loading }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!dates.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-3">
          <Calendar size={18} className="text-slate-500" />
        </div>
        <p className="text-slate-500 text-sm">No past chats yet.</p>
        <p className="text-slate-600 text-xs mt-1">Mentor-এর সাথে chat শুরু করলে এখানে history দেখাবে।</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-slate-600 px-1 mb-3 uppercase tracking-wide font-medium">
        Past Sessions ({dates.length})
      </p>
      {dates.map((entry, i) => (
        <motion.div
          key={entry.date}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0  }}
          transition={{ delay: i * 0.04 }}
        >
          <DayEntry
            entry={entry}
            isSelected={selectedDate === entry.date}
            onClick={() => onSelectDate(entry.date)}
          />
        </motion.div>
      ))}
    </div>
  );
}

// ── Read-only chat view for history ──────────────────────────────────────────
export function HistoryChatView({ messages = [], date, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
            <div className="h-12 w-48 rounded-xl bg-white/[0.03] animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-slate-500 text-sm">No messages found for {date}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
        <Clock size={12} className="text-slate-500" />
        <span className="text-xs text-slate-500">{formatDate(date)} — read only</span>
      </div>

      {messages.map((msg, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ delay: i * 0.04 }}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed
            ${msg.role === 'user'
              ? 'bg-cyan-500/15 border border-cyan-500/20 text-cyan-100 rounded-br-sm'
              : 'bg-white/[0.04] border border-white/[0.07] text-slate-300 rounded-bl-sm'}`}
          >
            {msg.content}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
