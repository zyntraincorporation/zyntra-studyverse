import { motion } from 'framer-motion';
import { RefreshCw, AlertTriangle, BookOpen, RotateCcw, Trophy, Target, Clock, Zap, Flame } from 'lucide-react';
import { MarkdownContent } from './MarkdownContent';

// ─────────────────────────────────────────────────────────────────────────────
// MentorAnalysisCard
// Parses AI mentor analysis into visual section cards with proper markdown.
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_MAP = [
  { key: '🎯',  label: 'আজকের Priority',      Icon: Target,       color: 'cyan'   },
  { key: '⚠️',  label: 'সবচেয়ে বড় Risk',     Icon: AlertTriangle, color: 'amber'  },
  { key: '📚',  label: 'আজ কী পড়বে',          Icon: BookOpen,      color: 'blue'   },
  { key: '🔁',  label: 'Revision',             Icon: RotateCcw,    color: 'violet' },
  { key: '🏆',  label: 'যা ভালো যাচ্ছে',      Icon: Trophy,       color: 'green'  },
  { key: '🎓',  label: 'BUET Strategy',        Icon: Zap,          color: 'purple' },
  { key: '⏱',  label: 'Suggested Time',        Icon: Clock,        color: 'slate'  },
  { key: '🔥',  label: 'Reality Check',        Icon: Flame,        color: 'red'    },
];

const COLOR_MAP = {
  cyan:   { badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',     bar: 'bg-cyan-500/40'   },
  amber:  { badge: 'bg-amber-500/15 text-amber-300 border-amber-500/25',  bar: 'bg-amber-500/40'  },
  blue:   { badge: 'bg-blue-500/15 text-blue-300 border-blue-500/25',     bar: 'bg-blue-500/40'   },
  violet: { badge: 'bg-violet-500/15 text-violet-300 border-violet-500/25',bar: 'bg-violet-500/40' },
  green:  { badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',bar: 'bg-emerald-500/40'},
  purple: { badge: 'bg-purple-500/15 text-purple-300 border-purple-500/25', bar: 'bg-purple-500/40'},
  slate:  { badge: 'bg-slate-500/15 text-slate-300 border-slate-500/25',  bar: 'bg-slate-500/30'  },
  red:    { badge: 'bg-red-500/15 text-red-300 border-red-500/25',        bar: 'bg-red-500/40'    },
};

function parseAnalysisSections(text) {
  if (!text) return null;
  const lines    = text.split('\n');
  const sections = [];
  let current    = null;
  let bodyLines  = [];

  const flush = () => {
    if (current) {
      sections.push({ ...current, body: bodyLines.join('\n').trim() });
      bodyLines  = [];
      current    = null;
    }
  };

  for (const line of lines) {
    const matched = SECTION_MAP.find(s => line.trim().startsWith(s.key));
    if (matched) {
      flush();
      current = { ...matched, header: line.replace(/\*\*/g, '').trim() };
    } else if (current) {
      bodyLines.push(line);
    }
  }
  flush();

  // If no sections detected, return null (will fall back to full render)
  return sections.length >= 2 ? sections : null;
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────
function AnalysisSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-4 animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-5 w-24 bg-white/10 rounded-lg" />
          </div>
          <div className="space-y-2">
            <div className="h-2.5 bg-white/[0.07] rounded w-full" />
            <div className="h-2.5 bg-white/[0.07] rounded w-5/6" />
            <div className="h-2.5 bg-white/[0.07] rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onRefresh, isRefreshing }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
        <Zap size={24} className="text-cyan-400" />
      </div>
      <h3 className="text-white font-semibold mb-2">কোনো Analysis নেই</h3>
      <p className="text-slate-500 text-sm max-w-xs mb-5 leading-relaxed">
        Generate করলে Mentor তোমার সব data দেখে আজকের জন্য specific plan দেবে।
      </p>
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600
                   hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm
                   transition-all disabled:opacity-50 flex items-center gap-2"
      >
        {isRefreshing
          ? <><RefreshCw size={14} className="animate-spin" /> Analyzing…</>
          : <><Zap size={14} /> Generate Analysis</>}
      </button>
    </div>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({ sec, idx }) {
  const colors = COLOR_MAP[sec.color] || COLOR_MAP.slate;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0  }}
      transition={{ delay: idx * 0.055, duration: 0.28 }}
      className="rounded-xl bg-white/[0.025] border border-white/[0.06] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.05]">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold
                          px-2.5 py-1 rounded-lg border ${colors.badge}`}>
          <sec.Icon size={11} />
          {sec.label}
        </span>
      </div>

      {/* Body — rendered as markdown */}
      <div className={`px-4 py-3.5 border-l-2 ${colors.bar}`}>
        <MarkdownContent>{sec.body}</MarkdownContent>
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function MentorAnalysisCard({ analysis, loading, onRefresh, isRefreshing }) {
  if (loading) return <AnalysisSkeleton />;
  if (!analysis) return <EmptyState onRefresh={onRefresh} isRefreshing={isRefreshing} />;

  const sections = parseAnalysisSections(analysis.text);

  return (
    <div className="space-y-3">

      {/* Section cards (if parseable) or full markdown fallback */}
      {sections ? (
        sections.map((sec, i) => <SectionCard key={sec.key} sec={sec} idx={i} />)
      ) : (
        // Full markdown fallback — render entire response
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-white/[0.025] border border-white/[0.06] px-5 py-4"
        >
          <MarkdownContent>{analysis.text}</MarkdownContent>
        </motion.div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-1 pt-1">
        <p className="text-[11px] text-slate-600">
          {analysis.generatedAt
            ? new Date(analysis.generatedAt).toLocaleString('en-BD', {
                hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
              })
            : '—'}
          {' '}
          {analysis.cached !== false && '(cached)'}
        </p>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-cyan-400
                     transition-colors disabled:opacity-40"
        >
          <RefreshCw size={11} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Analyzing…' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}
