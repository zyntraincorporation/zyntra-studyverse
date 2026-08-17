import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// QuestionLimitModal
// Shows on first chat open of the day so the student can pick how many
// questions they want to ask their AI Mentor today.
// ─────────────────────────────────────────────────────────────────────────────

const PRESET_OPTIONS = [
  { value: 1,           label: '1',   sub: 'Focused' },
  { value: 5,           label: '5',   sub: 'Standard' },
  { value: 10,          label: '10',  sub: 'Active' },
  { value: 20,          label: '20',  sub: 'Deep' },
  { value: 'unlimited', label: '∞',   sub: 'No limit' },
];

export function QuestionLimitModal({ onSelect, onSkip }) {
  const [selected,   setSelected]   = useState(null);
  const [customVal,  setCustomVal]  = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [loading,    setLoading]    = useState(false);

  const isReady = showCustom
    ? !!customVal && parseInt(customVal, 10) >= 1
    : selected !== null;

  const handleConfirm = async () => {
    let limit = selected;
    if (showCustom) {
      const n = parseInt(customVal, 10);
      if (!n || n < 1 || n > 200) return;
      limit = n;
    }
    if (limit === null) return;
    setLoading(true);
    try { await onSelect(limit); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onSkip}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{   opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        className="relative w-full max-w-sm bg-[#0d1220] border border-white/10 rounded-2xl p-6 shadow-2xl z-10"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-white">আজকের Chat Limit</h3>
            <p className="text-xs text-slate-500 mt-0.5">Mentor-কে আজ কতটি প্রশ্ন করবে?</p>
          </div>
          {onSkip && (
            <button onClick={onSkip} className="text-slate-600 hover:text-slate-400 transition-colors p-1 -mt-1 -mr-1">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Preset grid */}
        <div className="grid grid-cols-5 gap-2 mb-3">
          {PRESET_OPTIONS.map(opt => {
            const active = !showCustom && selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => { setSelected(opt.value); setShowCustom(false); }}
                className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-all duration-150 text-center select-none
                  ${active
                    ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300'
                    : 'bg-white/[0.03] border-white/[0.07] text-slate-400 hover:border-white/20 hover:text-white hover:bg-white/[0.05]'}`}
              >
                <span className="text-[15px] font-bold leading-none">{opt.label}</span>
                <span className="text-[9px] mt-1 opacity-55 leading-tight">{opt.sub}</span>
              </button>
            );
          })}
        </div>

        {/* Custom */}
        <button
          onClick={() => { setShowCustom(v => !v); setSelected(null); }}
          className={`w-full text-xs py-2.5 px-3 rounded-xl border transition-all flex items-center gap-2 mb-3
            ${showCustom
              ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
              : 'border-white/[0.07] bg-white/[0.02] text-slate-500 hover:text-slate-300 hover:border-white/15'}`}
        >
          <Zap size={11} />
          Custom number
        </button>

        <AnimatePresence>
          {showCustom && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <input
                type="number" min={1} max={200}
                value={customVal}
                onChange={e => setCustomVal(e.target.value)}
                placeholder="Enter a number…"
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm
                           placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors mb-3"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Note */}
        <p className="text-[11px] text-slate-600 mb-4 leading-relaxed">
          Limit শেষ হলে আজ আর নতুন প্রশ্ন করা যাবে না। পুরোনো chat পড়া যাবে।<br />
          পরের দিন সকালে automatically reset হবে।
        </p>

        {/* Confirm */}
        <button
          onClick={handleConfirm}
          disabled={!isReady || loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600
                     hover:from-cyan-400 hover:to-blue-500 disabled:opacity-35 disabled:cursor-not-allowed
                     text-white font-semibold text-sm transition-all"
        >
          {loading ? 'Setting…' : 'Set Limit & Start →'}
        </button>

        {onSkip && (
          <button onClick={onSkip} className="w-full mt-2 py-1.5 text-[11px] text-slate-600 hover:text-slate-400 transition-colors">
            Skip — no limit for today
          </button>
        )}
      </motion.div>
    </div>
  );
}
