import { useMemo } from 'react';
import { motion } from 'framer-motion';

const BUET_DATE = new Date('2027-04-01T00:00:00+06:00');

function getRemainingDays() {
  const now  = new Date();
  const diff = BUET_DATE - now;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default function BuetCountdownWidget() {
  const days  = useMemo(getRemainingDays, []);
  const pct   = Math.max(0, Math.min(100, 100 - (days / 730) * 100));
  const r     = 40, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="h-full bg-gradient-to-br from-cyan-950/60 to-blue-950/60 border border-cyan-500/20 rounded-2xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] text-cyan-400/60 uppercase tracking-widest">BUET Countdown</p>
          <p className="text-xs text-slate-500 mt-0.5">April 2027</p>
        </div>
        <span className="text-xl">🏛️</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          <svg width={100} height={100} viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(6,182,212,0.1)" strokeWidth="6" />
            <motion.circle
              cx="48" cy="48" r={r} fill="none"
              stroke="url(#buetGrad)" strokeWidth="6"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 48 48)"
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
            <defs>
              <linearGradient id="buetGrad" x1="0%" y1="0%" x2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white leading-none">{days}</span>
            <span className="text-[10px] text-cyan-400/70">days</span>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-slate-500 mt-2">
        {days > 365 ? `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}m remaining` : `${Math.floor(days / 30)}m ${days % 30}d remaining`}
      </p>
    </div>
  );
}
