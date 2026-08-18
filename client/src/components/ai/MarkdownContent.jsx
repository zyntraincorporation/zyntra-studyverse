import ReactMarkdown from 'react-markdown';

// ─────────────────────────────────────────────────────────────────────────────
// MarkdownContent — Shared markdown renderer for AI Mentor output
// Renders markdown from AI responses with proper dark-theme styling.
// Uses react-markdown (already in dependencies) for robust parsing.
// ─────────────────────────────────────────────────────────────────────────────

const components = {
  p: ({ children }) => (
    <p className="text-[13.5px] text-slate-300 leading-relaxed mb-2 last:mb-0">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="text-white font-semibold">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="text-cyan-300 not-italic font-medium">{children}</em>
  ),
  ul: ({ children }) => (
    <ul className="space-y-1.5 mb-2 mt-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="space-y-1.5 mb-2 mt-1 list-none">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="flex gap-2 text-[13.5px] text-slate-300 leading-relaxed">
      <span className="text-cyan-400 mt-[3px] shrink-0 text-xs">▸</span>
      <span>{children}</span>
    </li>
  ),
  h1: ({ children }) => (
    <h1 className="text-base font-bold text-white mb-2 mt-3 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-bold text-white/90 mb-1.5 mt-2.5 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[13px] font-semibold text-slate-200 mb-1 mt-2 first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-[12px] font-semibold text-slate-300 mb-1 mt-1.5">{children}</h4>
  ),
  code: ({ inline, children }) =>
    inline ? (
      <code className="bg-white/10 text-cyan-300 px-1.5 py-0.5 rounded text-[12px] font-mono">
        {children}
      </code>
    ) : (
      <pre className="bg-white/[0.04] border border-white/[0.07] rounded-lg p-3 text-xs text-slate-300 overflow-x-auto mb-2 mt-1">
        <code>{children}</code>
      </pre>
    ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-cyan-500/40 pl-3 text-slate-400 mb-2 mt-1">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-white/[0.08] my-3" />,
  a: ({ href, children }) => (
    <a href={href} className="text-cyan-400 underline hover:text-cyan-300 transition-colors">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-white/10 bg-white/[0.04] px-2 py-1.5 text-left text-slate-300 font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-white/[0.07] px-2 py-1.5 text-slate-400">{children}</td>
  ),
};

export function MarkdownContent({ children, className = '' }) {
  if (!children) return null;
  return (
    <div className={className}>
      <ReactMarkdown components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
