// ─────────────────────────────────────────────────────────────────────────────
// BuetDailyChallenge — Premium Dashboard Card
// Completely separate from AI Mentor. Data from /api/challenge/* only.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Flame, CheckCircle2, Clock, Zap,
  BarChart2, BookOpen, Calculator, FlaskConical,
  ChevronRight, RotateCcw, Play, Trophy,
} from 'lucide-react';
import { challengeAPI } from '../../lib/api';
import { getBSTDateString } from '../../lib/bst';

// ── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  speed_math:         { icon: Calculator, label: 'Speed Math',          color: 'text-yellow-400', bg: 'from-yellow-500/10 to-amber-500/10',    border: 'border-yellow-500/20' },
  formula_recall:     { icon: BookOpen,   label: 'Formula Recall',       color: 'text-cyan-400',   bg: 'from-cyan-500/10 to-blue-500/10',       border: 'border-cyan-500/20'   },
  concept_drill:      { icon: Brain,      label: 'Concept Drill',        color: 'text-purple-400', bg: 'from-purple-500/10 to-violet-500/10',   border: 'border-purple-500/20' },
  mcq_sprint:         { icon: Zap,        label: 'MCQ Sprint',           color: 'text-emerald-400',bg: 'from-emerald-500/10 to-green-500/10',  border: 'border-emerald-500/20'},
  calculation_tricks: { icon: Calculator, label: 'Calculation Tricks',   color: 'text-orange-400', bg: 'from-orange-500/10 to-amber-600/10',   border: 'border-orange-500/20' },
  mixed:              { icon: Flame,      label: 'Mixed PCM Challenge',  color: 'text-rose-400',   bg: 'from-rose-500/10 to-pink-500/10',      border: 'border-rose-500/20'   },
};

const SUBJECT_CONFIG = {
  Physics:   { icon: Zap,          color: 'text-cyan-400',   dot: 'bg-cyan-400'   },
  Chemistry: { icon: FlaskConical, color: 'text-purple-400', dot: 'bg-purple-400' },
  Math:      { icon: Calculator,   color: 'text-yellow-400', dot: 'bg-yellow-400' },
  Mixed:     { icon: Flame,        color: 'text-rose-400',   dot: 'bg-rose-400'   },
};

function formatElapsed(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-40 rounded bg-white/10" />
        <div className="h-4 w-12 rounded bg-white/10" />
      </div>
      <div className="h-6 w-3/4 rounded bg-white/10 mb-2" />
      <div className="h-4 w-full rounded bg-white/8 mb-1" />
      <div className="h-4 w-5/6 rounded bg-white/8 mb-5" />
      <div className="flex gap-3">
        <div className="h-4 w-20 rounded bg-white/10" />
        <div className="h-4 w-20 rounded bg-white/10" />
      </div>
      <div className="mt-5 h-10 w-full rounded-xl bg-white/10" />
    </div>
  );
}

function CompletedCard({ challenge }) {
  const elapsed = challenge.elapsedSeconds;
  const sub     = SUBJECT_CONFIG[challenge.subject] || SUBJECT_CONFIG.Mixed;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-green-500/5 p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400 tracking-widest uppercase">BUET Daily Challenge</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">{challenge.date}</span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-300">✓ Challenge Completed!</p>
          <p className="text-xs text-slate-400">{challenge.title}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-3 border-t border-white/10">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-300">{elapsed ? formatElapsed(elapsed) : '—'} elapsed</span>
        </div>
        <div className={`flex items-center gap-1.5 ${sub.color}`}>
          <div className={`w-2 h-2 rounded-full ${sub.dot}`} />
          <span className="text-xs">{challenge.subject}</span>
        </div>
        <span className="text-xs text-slate-500 ml-auto">
          {challenge.durationMinutes} min challenge
        </span>
      </div>
    </motion.div>
  );
}

function MissedCard({ challenge }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-500 tracking-widest uppercase">BUET Daily Challenge</span>
        </div>
        <span className="text-[10px] font-mono text-slate-600">{challenge.date}</span>
      </div>
      <p className="text-sm text-slate-400 mb-1">— {challenge.title}</p>
      <p className="text-xs text-slate-600">Not Completed</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BuetDailyChallenge() {
  const [challenge,  setChallenge]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [elapsed,    setElapsed]    = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [completing, setCompleting] = useState(false);
  const timerRef = useRef(null);
  const today    = getBSTDateString();

  // ── Fetch today's challenge ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    challengeAPI.getToday()
      .then(res => {
        if (!cancelled) {
          setChallenge(res.data);
          // If challenge was already started, resume timer from startedAt
          if (res.data.status === 'started' && res.data.startedAt) {
            const startedAt = new Date(res.data.startedAt).getTime();
            const elapsedSoFar = Math.floor((Date.now() - startedAt) / 1000);
            setElapsed(Math.max(0, elapsedSoFar));
            setTimerActive(true);
          }
        }
      })
      .catch(err => {
        if (!cancelled) setError(err.response?.data?.error || err.message);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Timer tick ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerActive && challenge?.status !== 'completed') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive, challenge?.status]);

  // ── Start challenge ─────────────────────────────────────────────────────────
  const handleStart = async () => {
    try {
      const res = await challengeAPI.start(challenge.date);
      setChallenge(res.data);
      setTimerActive(true);
      setElapsed(0);
    } catch (err) {
      console.error('[BuetDailyChallenge] Start error:', err.message);
    }
  };

  // ── Complete challenge ──────────────────────────────────────────────────────
  const handleComplete = async () => {
    if (completing) return;
    setCompleting(true);
    clearInterval(timerRef.current);
    setTimerActive(false);
    try {
      const res = await challengeAPI.complete(challenge.date, elapsed);
      setChallenge(res.data);
    } catch (err) {
      console.error('[BuetDailyChallenge] Complete error:', err.message);
      setTimerActive(true); // resume timer if error
    } finally {
      setCompleting(false);
    }
  };

  // ── Render states ───────────────────────────────────────────────────────────
  if (loading) return <SkeletonCard />;

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-red-400" />
          <span className="text-xs font-semibold text-red-400 tracking-widest uppercase">BUET Daily Challenge</span>
        </div>
        <p className="text-xs text-red-400/80">{error}</p>
      </div>
    );
  }

  if (!challenge) return null;

  // Past date challenge — show missed/completed state
  if (challenge.date !== today) {
    if (challenge.status === 'completed') return <CompletedCard challenge={challenge} />;
    return <MissedCard challenge={challenge} />;
  }

  // Today's challenge — completed state
  if (challenge.status === 'completed') return <CompletedCard challenge={challenge} />;

  // Today — active (started) or pending
  const typeConf    = TYPE_CONFIG[challenge.challengeType] || TYPE_CONFIG.mixed;
  const subConf     = SUBJECT_CONFIG[challenge.subject]    || SUBJECT_CONFIG.Mixed;
  const TypeIcon    = typeConf.icon;
  const SubjectIcon = subConf.icon;
  const isStarted   = challenge.status === 'started' || timerActive;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${typeConf.border} bg-gradient-to-br ${typeConf.bg} p-5 relative overflow-hidden`}
    >
      {/* Subtle shimmer accent */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/[0.02] blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase">BUET Daily Challenge</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
          TODAY
        </span>
      </div>

      {/* Challenge type + subject badges */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 ${typeConf.color}`}>
          <TypeIcon className="w-3 h-3" />
          <span className="text-[10px] font-semibold">{typeConf.label}</span>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 ${subConf.color}`}>
          <SubjectIcon className="w-3 h-3" />
          <span className="text-[10px] font-semibold">{challenge.subject}</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-bold text-white mb-1.5 leading-snug">
        🔥 {challenge.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-slate-300 mb-4 leading-relaxed">
        {challenge.description}
      </p>

      {/* Chapter reference */}
      {challenge.chapterRef && (
        <p className="text-[11px] text-slate-500 mb-3 flex items-center gap-1.5">
          <BookOpen className="w-3 h-3" />
          {challenge.chapterRef}
        </p>
      )}

      {/* Meta: duration + target */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-medium">{challenge.durationMinutes} min</span>
        </div>
        {challenge.targetProblems && (
          <div className="flex items-center gap-1.5 text-slate-300">
            <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium">{challenge.targetProblems} problems</span>
          </div>
        )}
        {challenge.targetAccuracy && (
          <div className="flex items-center gap-1.5 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium">{challenge.targetAccuracy}% accuracy</span>
          </div>
        )}
      </div>

      {/* Timer display (when started) */}
      <AnimatePresence>
        {isStarted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="flex items-center justify-center gap-3 py-3 rounded-xl bg-white/5 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-2xl font-bold text-white tracking-widest">
                {formatElapsed(elapsed)}
              </span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      {!isStarted ? (
        <button
          onClick={handleStart}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 hover:border-white/25 text-white font-semibold text-sm transition-all duration-200 group"
        >
          <Play className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          Start Challenge
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      ) : (
        <button
          onClick={handleComplete}
          disabled={completing}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 hover:text-emerald-200 font-semibold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="w-4 h-4" />
          {completing ? 'Saving…' : '✓ Complete Challenge'}
        </button>
      )}
    </motion.div>
  );
}
