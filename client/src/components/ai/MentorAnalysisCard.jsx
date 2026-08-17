import { motion } from 'framer-motion';
import { RefreshCw, AlertTriangle, BookOpen, RotateCcw, Trophy, Target, Clock, Zap } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// MentorAnalysisCard
// Renders the AI Mentor's daily analysis text with structured, styled sections.
// Parses the markdown sections from the AI response and renders them as cards.
// ─────────────────────────────────────────────────────────────────────────────

// Section definitions: emoji + label + icon + color
const SECTION_MAP = [
  { key: '🎯',  label: 'আজকের Priority',           Icon: Target,       color: 'cyan'   },
  { key: '⚠️',  label: 'সবচেয়ে বড় Risk',          Icon: AlertTriangle, color: 'amber'  },
  { key: '📚',  label: 'আজ কী পড়বে',               Icon: BookOpen,      color: 'blue'   },
  { key: '🔁',  label: 'Revision',                  Icon: RotateCcw,    color: 'violet' },
  { key: '🏆',  label: 'যা ভালো যাচ্ছে',            Icon: Trophy,       color: 'green'  },
  { key: '🎓',  label: 'BUET Strategy',             Icon: Zap,          color: 'purple' },
  { key: '⏱',   label: 'Suggested Time',            Icon: Clock,        color: 'slate'  },
];

const COLOR_MAP = {
  cyan:   { badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',   body: 'bg-cyan-500/5   border-l-2 border-cyan-500/30'   },
  amber:  { badge: 'bg-amber-500/15 text-amber-300 border-amber-500/20', body: 'bg-amber-500/5  border-l-2 border-amber-500/30'  },
  blue:   { badge: 'bg-blue-500/15 text-blue-300 border-blue-500/20',   body: 'bg-blue-500/5   border-l-2 border-blue-500/30'   },
  violet: { badge: 'bg-violet-500/15 text-violet-300 border-violet-500/20', body: 'bg-violet-500/5 border-l-2 border-violet-500/30' },
  green:  { badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20', body: 'bg-emerald-500/5 border-l-2 border-emerald-500/30' },
  purple: { badge: 'bg-purple-500/15 text-purple-300 border-purple-500/20',  body: 'bg-purple-500/5  border-l-2 border-purple-500/30'  },
  slate:  { badge: 'bg-slate-500/15 text-slate-300 border-slate-500/20', body: 'bg-slate-500/5  border-l-2 border-slate-500/30'  },
};

// Parse the AI response into sections
function parseAnalysisSections(text) {
  if (!text) return [];

  const sections  = [];
  const lines     = text.split('\n');
  let currentSection = null;
  let bodyLines    = [];

  const flush = () => {
    if (currentSection) {
      sections.push({ ...currentSection, body: bodyLines.join('\n').trim() });
      bodyLines = [];
      currentSection = null;
    }
  };

  for (const line of lines) {
    // Detect section header (line starting with one of our emojis + ** text **)
    const matchedDef = SECTION_MAP.find(s => line.trim().startsWith(s.key));
    if (matchedDef) {
      flush();
      // Strip markdown bold markers from the header
      const headerText = line.replace(/\*\*/g, '').trim();
      currentSection = { ...matchedDef, header: headerText };
    } else if (currentSection) {
      bodyLines.push(line);
    }
  }
  flush();

  return sections;
}

// Render a single line of body text with light markdown support
function renderLine(line, idx) {
  if (!line.trim()) return <div key={idx} className="h-1" />;

  // Bold text: **text**
  const parts = line.split(/\*\*([^*]+)\*\*/g);
  return (
    <p key={idx} className="text-slate-300 text-sm leading-relaxed">
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part
      )}
    </p>
  );
}

export function MentorAnalysisCard({ analysis, loading, onRefresh, isRefreshing }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-4 animate-pulse">
            <div className="h-3 w-28 bg-white/10 rounded mb-3" />
            <div className="space-y-2">
              <div className="h-2.5 bg-white/[0.07] rounded w-full" />
              <div className="h-2.5 bg-white/[0.07] rounded w-4/5" />
              <div className="h-2.5 bg-white/[0.07] rounded w-3/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
          <Zap size={24} className="text-cyan-400" />
        </div>
        <h3 className="text-white font-semibold mb-2">No Analysis Yet</h3>
        <p className="text-slate-500 text-sm max-w-xs mb-5">
          আজকের mentor analysis এখনো generate হয়নি। Generate করো।
        </p>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600
                     hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm
                     transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isRefreshing
            ? <><RefreshCw size={14} className="animate-spin" /> Generating…</>
            : <><Zap size={14} /> Generate Analysis</>}
        </button>
      </div>
    );
  }

  const sections = parseAnalysisSections(analysis.text);

  // If parsing failed (no sections found), show raw text
  if (sections.length === 0) {
    return (
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
        <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
          {analysis.text}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((sec, i) => {
        const colors  = COLOR_MAP[sec.color] || COLOR_MAP.slate;
        const bodyLines = sec.body.split('\n');

        return (
          <motion.div
            key={sec.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className="rounded-xl bg-white/[0.025] border border-white/[0.06] overflow-hidden"
          >
            {/* Section header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.05]">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${colors.badge}`}>
                <sec.Icon size={11} />
                {sec.label}
              </span>
            </div>

            {/* Section body */}
            <div className={`px-4 py-3 ${colors.body} space-y-1`}>
              {bodyLines.map((line, j) => renderLine(line, j))}
            </div>
          </motion.div>
        );
      })}

      {/* Footer: generated time + refresh */}
      <div className="flex items-center justify-between px-1 pt-1">
        <p className="text-[11px] text-slate-600">
          Generated: {analysis.generatedAt
            ? new Date(analysis.generatedAt).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })
            : '—'}
          {analysis.cached !== false ? ' (cached)' : ''}
        </p>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-cyan-400
                     transition-colors disabled:opacity-40"
        >
          <RefreshCw size={11} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}
