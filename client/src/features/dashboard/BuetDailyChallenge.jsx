// ─────────────────────────────────────────────────────────────────────────────
// BuetDailyChallenge — Premium Dashboard Card
// Completely separate from AI Mentor. Data from /api/challenge/* only.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Flame, CheckCircle2, Clock, Zap,
  BarChart2, BookOpen, Calculator, FlaskConical,
  ChevronRight, Play, Trophy, Sparkles, RefreshCw, AlertCircle
} from 'lucide-react';
import { challengeAPI } from '../../lib/api';
import { getChallengeCycleDate } from '../../lib/bst';

// ── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  speed_math:         { icon: Calculator,   label: 'Speed Math',          color: 'text-yellow-400', bg: 'from-yellow-500/10 to-amber-500/10',   border: 'border-yellow-500/20' },
  formula_recall:     { icon: BookOpen,     label: 'Formula Drill',       color: 'text-cyan-400',   bg: 'from-cyan-500/10 to-blue-500/10',      border: 'border-cyan-500/20'   },
  concept_drill:      { icon: Brain,        label: 'Concept Recall',      color: 'text-purple-400', bg: 'from-purple-500/10 to-violet-500/10',  border: 'border-purple-500/20' },
  mcq_sprint:         { icon: Zap,          label: 'MCQ Sprint',          color: 'text-emerald-400',bg: 'from-emerald-500/10 to-green-500/10', border: 'border-emerald-500/20'},
  calculation_tricks: { icon: Calculator,   label: 'Calculator Tricks',   color: 'text-orange-400', bg: 'from-orange-500/10 to-amber-600/10',  border: 'border-orange-500/20' },
  mixed:              { icon: Flame,        label: 'Mixed PCM Challenge', color: 'text-rose-400',   bg: 'from-rose-500/10 to-pink-500/10',     border: 'border-rose-500/20'   },
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
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3.5 w-36 rounded bg-white/10" />
        <div className="h-3.5 w-14 rounded bg-white/10" />
      </div>
      <div className="h-5 w-3/4 rounded bg-white/10 mb-2" />
      <div className="h-3.5 w-full rounded bg-white/5 mb-1" />
      <div className="h-3.5 w-2/3 rounded bg-white/5 mb-3" />
      <div className="h-9 w-full rounded-xl bg-white/10" />
    </div>
  );
}

function CompletedCard({ challenge }) {
  const elapsed = challenge.elapsedSeconds;
  const sub     = SUBJECT_CONFIG[challenge.subject] || SUBJECT_CONFIG.Mixed;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-slate-900/60 p-4"
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase">BUET Daily Challenge</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          COMPLETED
        </span>
      </div>

      <div className="flex items-center gap-3 my-2.5">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-emerald-300 truncate">✓ {challenge.title}</p>
          <p className="text-xs text-slate-400 line-clamp-1">{challenge.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2.5 border-t border-white/10 text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{elapsed ? formatElapsed(elapsed) : '—'} elapsed</span>
        </div>
        <div className={`flex items-center gap-1.5 ${sub.color}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${sub.dot}`} />
          <span>{challenge.subject}</span>
        </div>
        <span className="text-slate-500 ml-auto text-[11px]">
          {challenge.durationMinutes} min target
        </span>
      </div>
    </motion.div>
  );
}

function MissedCard({ challenge }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-slate-500" />
          <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">BUET Daily Challenge</span>
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
  const [challenge,    setChallenge]    = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [generating,   setGenerating]   = useState(false);
  const [error,        setError]        = useState(null);
  const [elapsed,      setElapsed]      = useState(0);
  const [timerActive,  setTimerActive]  = useState(false);
  const [completing,   setCompleting]   = useState(false);
  const timerRef  = useRef(null);
  const cycleDate = getChallengeCycleDate();

  // ── Fetch today's challenge ─────────────────────────────────────────────────
  const fetchChallenge = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await challengeAPI.getToday();
      if (res.data) {
        setChallenge(res.data);
        if (res.data.status === 'started' && res.data.startedAt) {
          const startedAt = new Date(res.data.startedAt).getTime();
          const elapsedSoFar = Math.floor((Date.now() - startedAt) / 1000);
          setElapsed(Math.max(0, elapsedSoFar));
          setTimerActive(true);
        }
      }
    } catch (err) {
      console.warn('[BuetDailyChallenge] Fetch warning:', err.response?.data?.error || err.message);
      setError(err.response?.data?.error || err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenge();
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

  // ── Manual Generate Trigger ─────────────────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await challengeAPI.generateNow();
      if (res.data?.challenge) {
        setChallenge(res.data.challenge);
      } else {
        await fetchChallenge(true);
      }
    } catch (err) {
      console.error('[BuetDailyChallenge] Generate error:', err.message);
      setError(err.response?.data?.error || err.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── Start challenge ─────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!challenge) return;
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
    if (completing || !challenge) return;
    setCompleting(true);
    clearInterval(timerRef.current);
    setTimerActive(false);
    try {
      const res = await challengeAPI.complete(challenge.date, elapsed);
      setChallenge(res.data);
    } catch (err) {
      console.error('[BuetDailyChallenge] Complete error:', err.message);
      setTimerActive(true);
    } finally {
      setCompleting(false);
    }
  };

  // ── Render: Loading ─────────────────────────────────────────────────────────
  if (loading) return <SkeletonCard />;

  // ── Render: No Challenge or Error / Generate Prompt ──────────────────────────
  if (!challenge || error) {
    return (
      <div className="rounded-xl border border-red-500/25 bg-gradient-to-br from-red-950/40 to-slate-900/70 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-red-400" />
            <span className="text-[11px] font-bold text-red-400 tracking-wider uppercase">BUET Daily Challenge</span>
          </div>
          <span className="text-[9px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
            06:00 AM BST
          </span>
        </div>

        <p className="text-xs text-slate-300 mb-3 leading-relaxed">
          {error 
            ? 'সার্ভারের সাথে সংযোগ মেলেনি বা আজকের চ্যালেঞ্জ তৈরি হয়নি।'
            : 'আজকের জন্য এখনো কোনো BUET চ্যালেঞ্জ তৈরি করা হয়নি (প্রতিদিন ১টি চ্যালেঞ্জ)।'}
        </p>

        {error && (
          <div className="flex items-center gap-1.5 text-[11px] text-red-400/90 mb-3 bg-red-500/10 px-2.5 py-1.5 rounded-lg border border-red-500/20">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600/30 hover:bg-red-600/40 border border-red-500/40 hover:border-red-500/60 text-white font-semibold text-xs transition-all duration-200 shadow-md group disabled:opacity-50"
        >
          {generating ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-red-300 animate-spin" />
              <span>Generating AI Challenge...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-300 group-hover:scale-110 transition-transform" />
              <span>Generate Today's Challenge</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // ── Render: Past Date ───────────────────────────────────────────────────────
  if (challenge.date !== cycleDate) {
    if (challenge.status === 'completed') return <CompletedCard challenge={challenge} />;
    return <MissedCard challenge={challenge} />;
  }

  // ── Render: Completed Today ─────────────────────────────────────────────────
  if (challenge.status === 'completed') return <CompletedCard challenge={challenge} />;

  // ── Render: Active or Pending Challenge ─────────────────────────────────────
  const typeConf    = TYPE_CONFIG[challenge.challengeType] || TYPE_CONFIG.mixed;
  const subConf     = SUBJECT_CONFIG[challenge.subject]    || SUBJECT_CONFIG.Mixed;
  const TypeIcon    = typeConf.icon;
  const SubjectIcon = subConf.icon;
  const isStarted   = challenge.status === 'started' || timerActive;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${typeConf.border} bg-gradient-to-br ${typeConf.bg} p-4 relative overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-[11px] font-bold text-slate-300 tracking-wider uppercase">BUET Daily Challenge</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
            TODAY
          </span>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 ${typeConf.color}`}>
          <TypeIcon className="w-3 h-3" />
          <span className="text-[10px] font-semibold">{typeConf.label}</span>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 ${subConf.color}`}>
          <SubjectIcon className="w-3 h-3" />
          <span className="text-[10px] font-semibold">{challenge.subject}</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold text-white mb-1 leading-snug">
        🔥 {challenge.title}
      </h3>

      {/* Description */}
      <p className="text-xs text-slate-300 mb-3 leading-relaxed">
        {challenge.description}
      </p>

      {/* Chapter reference */}
      {challenge.chapterRef && (
        <p className="text-[11px] text-slate-400 mb-2.5 flex items-center gap-1.5">
          <BookOpen className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="truncate">{challenge.chapterRef}</span>
        </p>
      )}

      {/* Meta: duration + target */}
      <div className="flex items-center gap-3 mb-3 text-[11px] text-slate-300">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{challenge.durationMinutes} min</span>
        </div>
        {challenge.targetProblems && (
          <div className="flex items-center gap-1">
            <BarChart2 className="w-3 h-3 text-slate-400" />
            <span>{challenge.targetProblems} problems</span>
          </div>
        )}
        {challenge.targetAccuracy && (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-slate-400" />
            <span>{challenge.targetAccuracy}% accuracy</span>
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
            className="mb-3 overflow-hidden"
          >
            <div className="flex items-center justify-center gap-2.5 py-2 rounded-lg bg-black/40 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xl font-bold text-white tracking-widest">
                {formatElapsed(elapsed)}
              </span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      {!isStarted ? (
        <button
          onClick={handleStart}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 hover:border-white/25 text-white font-semibold text-xs transition-all duration-200 group shadow-sm"
        >
          <Play className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
          Start Challenge
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      ) : (
        <button
          onClick={handleComplete}
          disabled={completing}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 hover:border-emerald-500/60 text-emerald-300 hover:text-emerald-200 font-semibold text-xs transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {completing ? 'Saving…' : '✓ Complete Challenge'}
        </button>
      )}
    </motion.div>
  );
}
