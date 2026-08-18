// ─────────────────────────────────────────────────────────────────────────────
// ZYNTRA StudyVerse — Premium HSC + BUET Preparation Command Center
// Fixed layout — no widget customization
// All data from existing Firebase / API sources — nothing hardcoded
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Award, Flame, Target, Calendar,
  CheckCircle2, Circle, Clock, BarChart2,
  Lock, Unlock, Heart, ChevronRight, AlertTriangle, X,
  GraduationCap, Sparkles, Timer, CheckSquare, Zap,
} from 'lucide-react';
import { useAuthStore, useUIStore } from '../../store';
import {
  getChapters, getWeeklyStats,
  getTargets, saveTargets,
} from '../../firebase/db';
import {
  getBSTDateString, getBSTDayName, getBSTTime, getBSTYearMonth,
  WEEKLY_SCHEDULE, SESSION_SLOTS,
} from '../../lib/bst';
import {
  HSC_SUBJECTS, BUET_SUBJECTS,
  SUBJECT_DISPLAY_NAMES, SUBJECT_SHORT_NAMES, SUBJECT_COLORS,
  normalizeLegacyStatus,
} from '../../lib/chapters-data';
import { useMyUnlockProgress } from '../../hooks/useMyUnlockProgress';
import { usePartnerStats } from '../../hooks/usePartnerStats';
import LiveStudyBanner from '../presence/LiveStudyBanner';
import PendingSessionModal from '../../components/checkin/PendingSessionModal';
import MorningCheckinModal from '../../components/checkin/MorningCheckinModal';
import BuetDailyChallenge from './BuetDailyChallenge';
import { checkinAPI } from '../../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// CENTRALIZED DEADLINE CONFIG — change dates here only
// ─────────────────────────────────────────────────────────────────────────────
const DEADLINES = {
  hscPrepComplete : new Date('2026-12-31T23:59:59+06:00'),   // HSC full prep done
  hscExam         : new Date('2027-03-15T00:00:00+06:00'),   // HSC Board Exam
  buetAdmission   : new Date('2027-10-01T00:00:00+06:00'),   // BUET Admission Test
};
const APP_START = new Date('2026-03-22T00:00:00+06:00'); // Study start date

// Target status cycling order (Routine page targets)
const TARGET_STATUS_ORDER = ['pending', 'in_progress', 'completed', 'delayed'];

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function getCountdown(target) {
  const now    = Date.now();
  const diff   = target.getTime() - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, pct: 100 };
  const totalMs  = target.getTime() - APP_START.getTime();
  const passedMs = Math.max(0, now - APP_START.getTime());
  const pct      = Math.min(100, Math.max(0, Math.round((passedMs / totalMs) * 100)));
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    pct,
  };
}

function countCompleted(chapters) {
  return chapters.filter(ch => {
    const s = normalizeLegacyStatus(ch.status);
    return s !== 'not_started' && s !== 'in_progress';
  }).length;
}

function getGreeting() {
  const { hour } = getBSTTime();
  if (hour < 5)  return ['Still up? 🌙', 'Late night warrior mode'];
  if (hour < 12) return ['সুপ্রভাত ☀️', 'Rise and conquer the syllabus'];
  if (hour < 17) return ['শুভ বিকেল 🌤️', 'Afternoon grind — stay focused'];
  if (hour < 21) return ['শুভ সন্ধ্যা 🌆', 'Evening session time — let\'s go'];
  return ['শুভ রাত্রি 🌙', 'Night grind activated'];
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVE UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Single countdown digit block */
function DigitBox({ value, label, color, bg, border, size = 'md' }) {
  const sizes = {
    xl:  { box: 'w-20 h-16', text: 'text-4xl' },
    lg:  { box: 'w-[68px] h-[56px]', text: 'text-3xl' },
    md:  { box: 'w-14 h-12', text: 'text-2xl' },
    sm:  { box: 'w-11 h-9',  text: 'text-xl'  },
  };
  const s = sizes[size] || sizes.md;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`${s.box} rounded-xl ${bg} border ${border} flex items-center justify-center shadow-lg relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />
        <span className={`${s.text} font-black tabular-nums ${color} leading-none tracking-tight`}>
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] text-white/25 font-medium tracking-widest uppercase">{label}</span>
    </div>
  );
}

/** SVG arc / semi-circle progress gauge */
function ArcGauge({ pct, color, size = 110, label, sublabel }) {
  const r     = size * 0.38;
  const circ  = Math.PI * r;
  const dash  = (pct / 100) * circ;
  const sw    = size * 0.075;
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`}>
        <path
          d={`M ${size * 0.12} ${size * 0.58} A ${r} ${r} 0 0 1 ${size * 0.88} ${size * 0.58}`}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} strokeLinecap="round"
        />
        <motion.path
          d={`M ${size * 0.12} ${size * 0.58} A ${r} ${r} 0 0 1 ${size * 0.88} ${size * 0.58}`}
          fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${dash} ${circ}` }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 5px ${color}55)` }}
        />
        <text
          x={size / 2} y={size * 0.5} textAnchor="middle"
          fill={color} fontSize={size * 0.2} fontWeight="800" fontFamily="Inter,sans-serif"
        >{pct}%</text>
      </svg>
      {label    && <p className="text-xs font-bold text-white/70 -mt-1">{label}</p>}
      {sublabel && <p className="text-[10px] text-white/30 mt-0.5">{sublabel}</p>}
    </div>
  );
}

/** Animated progress bar */
function ProgressBar({ pct, color, height = 'h-2' }) {
  return (
    <div className={`${height} rounded-full bg-white/[0.06] overflow-hidden`}>
      <motion.div
        className="h-full rounded-full relative overflow-hidden"
        style={{ background: typeof color === 'string' && color.startsWith('linear') ? color : color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1.0, ease: 'easeOut' }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)',
            animation: 'shimmer 2.5s infinite',
          }}
        />
      </motion.div>
    </div>
  );
}

/** Section header label */
function SectionLabel({ icon: Icon, title, iconColor = 'text-white/30', action }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={13} className={iconColor} />
      <span className="text-[11px] font-bold uppercase tracking-widest text-white/25">{title}</span>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

/** Subject chapter drawer (slide-up modal) */
function SubjectDrawer({ subject, chapters, colors, onClose }) {
  const done  = countCompleted(chapters);
  const total = chapters.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  const safeColors = colors || {
    hex: '#10b981',
    bg: 'from-emerald-500/10 to-transparent',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
  };
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-sm max-h-[72vh] flex flex-col rounded-2xl border overflow-hidden bg-[#0c1220] ${safeColors.border}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3.5 bg-gradient-to-r ${safeColors.bg} border-b ${safeColors.border}`}>
          <div>
            <p className={`font-bold bangla text-sm ${safeColors.text}`}>{SUBJECT_DISPLAY_NAMES?.[subject] || subject}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{done}/{total} অধ্যায় · {pct}% সম্পূর্ণ</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>
        {/* Progress bar */}
        <div className="px-4 pt-3 pb-2">
          <ProgressBar pct={pct} color={safeColors.hex} height="h-1.5" />
        </div>
        {/* Chapter list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 scrollbar-none">
          {chapters.map(ch => {
            const s      = normalizeLegacyStatus(ch.status);
            const isDone = s !== 'not_started' && s !== 'in_progress';
            return (
              <div
                key={ch.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all
                  ${isDone
                    ? `bg-gradient-to-r ${safeColors.bg} border ${safeColors.border}`
                    : 'bg-white/[0.02] border border-white/5'}`}
              >
                <span className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: isDone ? safeColors.hex : 'rgba(255,255,255,0.1)' }} />
                <span className={`flex-1 bangla text-xs leading-relaxed ${isDone ? safeColors.text : 'text-slate-500'}`}>
                  {ch.chapterNumber}. {ch.chapterName}
                </span>
                {isDone && (
                  <span className="text-[9px] text-slate-600 shrink-0">
                    {s.startsWith('revised_') ? `×${s.replace('revised_', '')} Rev` : '✓'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const user      = useAuthStore(s => s.user);
  const partner   = useAuthStore(s => s.partner);
  const openModal = useUIStore(s => s.openModal);
  const toast     = useUIStore(s => s.toast);
  const navigate  = useNavigate();

  // ── Real-time tick ────────────────────────────────────────────────────────
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Current BST time
  const day       = getBSTDayName();
  const today     = getBSTDateString();
  const yearMonth = getBSTYearMonth();
  const { hour, minute } = getBSTTime();
  const [greeting, tagline] = getGreeting();

  // ── Countdown values (re-calc on every tick) ──────────────────────────────
  const prepCD = getCountdown(DEADLINES.hscPrepComplete);
  const hscCD  = getCountdown(DEADLINES.hscExam);
  const buetCD = getCountdown(DEADLINES.buetAdmission);

  // ── Chapters → HSC + BUET progress ───────────────────────────────────────
  const [chapters,    setChapters]    = useState([]);
  const [chapLoading, setChapLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    getChapters(user.uid)
      .then(all => { setChapters(all); setChapLoading(false); })
      .catch(() => setChapLoading(false));
  }, [user?.uid]);

  // HSC subject breakdown
  const hscBySubject = HSC_SUBJECTS.map(subj => {
    const chs   = chapters.filter(ch => ch.subject === subj);
    const done  = countCompleted(chs);
    const total = chs.length;
    const pct   = total ? Math.round((done / total) * 100) : 0;
    return { subj, chs, done, total, pct, colors: SUBJECT_COLORS?.[subj] };
  });
  const hscTotal   = hscBySubject.reduce((a, b) => a + b.total, 0);
  const hscDone    = hscBySubject.reduce((a, b) => a + b.done,  0);
  const hscOverall = hscTotal ? Math.round((hscDone / hscTotal) * 100) : 0;

  // BUET PCM breakdown
  const buetBySubject = BUET_SUBJECTS.map(subj => {
    const chs   = chapters.filter(ch => ch.subject === subj);
    const done  = countCompleted(chs);
    const total = chs.length;
    const pct   = total ? Math.round((done / total) * 100) : 0;
    return { subj, chs, done, total, pct, colors: SUBJECT_COLORS?.[subj] };
  });
  const buetTotal   = buetBySubject.reduce((a, b) => a + b.total, 0);
  const buetDone    = buetBySubject.reduce((a, b) => a + b.done,  0);
  const buetOverall = buetTotal ? Math.round((buetDone / buetTotal) * 100) : 0;

  // ── Streak + Analytics ────────────────────────────────────────────────────
  const [streak,     setStreak]     = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [analytics,  setAnalytics]  = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    getWeeklyStats(user.uid, 30)
      .then(d => { setStreak(d.streak || 0); setBestStreak(d.bestStreak || d.streak || 0); })
      .catch(() => {});
    getWeeklyStats(user.uid, 7)
      .then(d => setAnalytics(d))
      .catch(() => {});
  }, [user?.uid]);

  // ── Monthly Targets (from Routine, source of truth) ───────────────────────
  const [targets,       setTargets]       = useState([]);
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [targetsSaving,  setTargetsSaving]  = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    setTargetsLoading(true);
    getTargets(user.uid, yearMonth)
      .then(data => { setTargets(data.chapters || []); setTargetsLoading(false); })
      .catch(() => setTargetsLoading(false));
  }, [user?.uid, yearMonth]);

  const cycleTargetStatus = async (index) => {
    const cur  = targets[index]?.status || 'pending';
    const next = TARGET_STATUS_ORDER[(TARGET_STATUS_ORDER.indexOf(cur) + 1) % TARGET_STATUS_ORDER.length];
    const updated = targets.map((t, i) => i === index ? { ...t, status: next } : t);
    setTargets(updated);
    setTargetsSaving(true);
    try {
      await saveTargets(user.uid, yearMonth, updated);
    } catch {
      toast('Failed to save target', 'error');
    }
    setTargetsSaving(false);
  };

  // ── Today's Schedule (API) ────────────────────────────────────────────────
  const [schedule,    setSchedule]    = useState([]);
  const [schedLoading, setSchedLoading] = useState(true);
  const [pending,     setPending]     = useState([]);
  const [morningData, setMorningData] = useState(null);

  useEffect(() => {
    // Load schedule
    checkinAPI.getSessionsToday()
      .then(r => { setSchedule(r.data?.schedule || []); setSchedLoading(false); })
      .catch(() => setSchedLoading(false));

    // Load pending + morning
    checkinAPI.getPendingSessions()
      .then(r => setPending(r.data?.pending || []))
      .catch(() => {});
    checkinAPI.getMorningToday()
      .then(r => {
        const d = r.data;
        setMorningData(d);
        if (d && !d.checkin) {
          const key = `morning_prompted_${d.date}`;
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1');
            openModal('morning');
          }
        }
      })
      .catch(() => {});

    // Refresh schedule every minute
    const id = setInterval(() => {
      checkinAPI.getSessionsToday()
        .then(r => setSchedule(r.data?.schedule || []))
        .catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Couple Zone (real-time hooks) ─────────────────────────────────────────
  const {
    isUnlocked,
    vocabCount, partnerVocabCount,
    vocabThreshold,
    vocabPct, partnerVocabPct,
  } = useMyUnlockProgress();
  const partnerStats = usePartnerStats();

  // ── Subject drawer ────────────────────────────────────────────────────────
  const [drawerSubject, setDrawerSubject] = useState(null);
  const drawerData = drawerSubject ? hscBySubject.find(b => b.subj === drawerSubject) : null;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080b14] pb-28">
      <LiveStudyBanner />

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <div className="px-4 lg:px-6 pt-5 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight leading-tight">
            {greeting}{' '}
            <span className="text-white/50 font-semibold">{user?.displayName || ''}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{tagline} · {day}, {today}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-white/20 uppercase tracking-widest">BST</p>
          <p className="text-lg font-black tabular-nums text-white/60 leading-tight">
            {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-6 space-y-5">

        {/* ── PENDING SESSION ALERT ────────────────────────────────────── */}
        <AnimatePresence>
          {pending.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="rounded-2xl border border-yellow-500/30 bg-yellow-500/[0.06] p-4 flex items-start gap-3 cursor-pointer hover:border-yellow-500/50 transition-colors overflow-hidden"
              onClick={() => openModal('pending-session')}
            >
              <AlertTriangle size={17} className="text-yellow-400 mt-0.5 shrink-0 animate-pulse" />
              <div>
                <p className="text-sm font-bold text-yellow-300">{pending.length}টা session লগ করা বাকি</p>
                <p className="text-xs text-yellow-400/50 mt-0.5">
                  {pending.map(s => `S${s.sessionNumber} (${s.subjects.join('/')})`).join(', ')} — ট্যাপ করো
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 1 — HSC PREPARATION COUNTDOWN (HERO)                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-emerald-500/20 p-5 lg:p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(2,44,24,0.65) 0%, rgba(8,11,20,0.97) 55%, rgba(1,22,12,0.45) 100%)',
          }}
        >
          {/* Ambient glows */}
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-12 left-4 w-48 h-48 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.05) 0%, transparent 70%)' }} />

          <div className="relative">
            {/* Card header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/12 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <BookOpen size={16} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-base font-black text-white leading-tight">HSC Preparation Complete</p>
                  <p className="text-[11px] text-emerald-400/55 mt-0.5">৩১ ডিসেম্বর ২০২৬ · সকল বিষয়ের সম্পূর্ণ প্রস্তুতি</p>
                </div>
              </div>
              <span className="shrink-0 text-[10px] bg-emerald-500/12 text-emerald-300 border border-emerald-500/20 rounded-full px-2.5 py-1 font-bold">
                🎯 GOAL 1
              </span>
            </div>

            {/* Countdown */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6">
              {[
                { val: prepCD.days,    label: 'Days'    },
                { val: prepCD.hours,   label: 'Hours'   },
                { val: prepCD.minutes, label: 'Minutes' },
                { val: prepCD.seconds, label: 'Seconds' },
              ].map(({ val, label }, i) => (
                <div key={label} className="flex items-center gap-2 sm:gap-4">
                  <DigitBox
                    value={val} label={label} size="lg"
                    color="text-emerald-200"
                    bg="bg-emerald-950/60"
                    border="border-emerald-500/20"
                  />
                  {i < 3 && (
                    <span className="text-emerald-600/60 text-2xl font-black pb-5 select-none">:</span>
                  )}
                </div>
              ))}
            </div>

            {/* Time elapsed bar */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] text-white/25">Time elapsed since March 2026</span>
                <span className="text-[11px] text-emerald-400/60 font-medium">{prepCD.pct}%</span>
              </div>
              <ProgressBar pct={prepCD.pct} color="linear-gradient(90deg, #065f46, #10b981)" height="h-2" />
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 2 — HSC PROGRESS  +  BUET COUNTDOWN + PCM            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── LEFT: HSC Overall + All Subjects ──────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl border border-emerald-500/12 p-5"
            style={{ background: 'linear-gradient(145deg, rgba(5,30,15,0.7) 0%, rgba(10,14,26,0.95) 100%)' }}
          >
            <SectionLabel icon={BookOpen} iconColor="text-emerald-400" title="HSC Preparation"
              action={
                <span className="text-[10px] text-white/20">{hscDone}/{hscTotal} chapters</span>
              }
            />

            {/* Overall gauge + summary */}
            <div className="flex items-center gap-4 mb-5">
              <div className="shrink-0">
                <ArcGauge pct={hscOverall} color="#10b981" size={100} label="Overall" sublabel="all subjects" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-xs text-white/30 leading-relaxed">Complete all 10 HSC subjects to be exam-ready by December 2026.</p>
                <div className="flex gap-3">
                  <div className="text-center">
                    <p className="text-sm font-black text-emerald-400">{hscDone}</p>
                    <p className="text-[9px] text-white/25">Done</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-white/40">{hscTotal - hscDone}</p>
                    <p className="text-[9px] text-white/25">Left</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Subject bars */}
            {chapLoading ? (
              <div className="space-y-2.5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-8 rounded-xl bg-white/[0.04] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {hscBySubject.map(({ subj, done, total, pct, colors }) => (
                  <button
                    key={subj}
                    onClick={() => setDrawerSubject(subj)}
                    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-white/[0.04] transition-all group text-left"
                  >
                    <div
                      className="w-1.5 h-7 rounded-full shrink-0 transition-all group-hover:h-8"
                      style={{ backgroundColor: colors?.hex || '#10b981' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold bangla text-white/60 group-hover:text-white/80 transition-colors truncate">
                          {SUBJECT_SHORT_NAMES?.[subj] || subj}
                        </span>
                        <span className="text-[9px] text-white/25 shrink-0 ml-2">{done}/{total}</span>
                      </div>
                      <ProgressBar pct={pct} color={colors?.hex || '#10b981'} height="h-1" />
                    </div>
                    <span
                      className="text-[11px] font-black shrink-0 w-9 text-right"
                      style={{ color: colors?.hex || '#10b981' }}
                    >{pct}%</span>
                  </button>
                ))}
              </div>
            )}
            {!chapLoading && (
              <p className="text-[9px] text-white/15 text-center mt-3">Tap any subject for chapter details</p>
            )}
          </motion.div>

          {/* ── RIGHT: BUET Countdown + PCM Progress ──────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-red-500/18 p-5"
            style={{ background: 'linear-gradient(145deg, rgba(40,4,4,0.65) 0%, rgba(10,14,26,0.97) 60%)' }}
          >
            <SectionLabel icon={Award} iconColor="text-red-400" title="BUET Admission"
              action={<span className="text-[10px] text-white/20">October 2027</span>}
            />

            {/* BUET countdown */}
            <div className="flex items-center justify-center gap-2 mb-5">
              {[
                { val: buetCD.days,    label: 'Days'  },
                { val: buetCD.hours,   label: 'Hours' },
                { val: buetCD.minutes, label: 'Min'   },
                { val: buetCD.seconds, label: 'Sec'   },
              ].map(({ val, label }, i) => (
                <div key={label} className="flex items-center gap-2">
                  <DigitBox
                    value={val} label={label} size="sm"
                    color="text-red-200"
                    bg="bg-red-950/60"
                    border="border-red-500/20"
                  />
                  {i < 3 && <span className="text-red-700/50 text-lg font-black pb-4 select-none">:</span>}
                </div>
              ))}
            </div>

            {/* PCM overall + subject bars */}
            <div className="flex items-start gap-4 mb-4">
              <div className="shrink-0">
                <ArcGauge pct={buetOverall} color="#ef4444" size={90}
                  label="PCM" sublabel={`${buetDone}/${buetTotal}`} />
              </div>
              <div className="flex-1 space-y-3">
                {chapLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-8 rounded-xl bg-white/[0.04] animate-pulse" />)}
                  </div>
                ) : (
                  buetBySubject.map(({ subj, done, total, pct, colors }) => (
                    <div key={subj}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold bangla text-white/50">
                          {SUBJECT_SHORT_NAMES?.[subj] || subj}
                        </span>
                        <span className="text-[10px] font-bold" style={{ color: colors?.hex || '#ef4444' }}>{pct}%</span>
                      </div>
                      <ProgressBar pct={pct} color={colors?.hex || '#ef4444'} height="h-1.5" />
                      <p className="text-[9px] text-white/20 mt-0.5">{done}/{total} chapters</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* BUET progress bar */}
            <div>
              <div className="flex justify-between text-[11px] mb-1.5">
                <span className="text-white/25">PCM syllabus progress</span>
                <span className="text-red-400/60">{buetOverall}% done</span>
              </div>
              <ProgressBar pct={buetOverall} color="linear-gradient(90deg, #7f1d1d, #ef4444)" height="h-2" />
            </div>
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* BUET DAILY CHALLENGE — Separate AI System                      */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <BuetDailyChallenge />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 3 — HSC EXAM COUNTDOWN (COMPACT)                      */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl border border-sky-500/15 p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6"
          style={{ background: 'linear-gradient(135deg, rgba(3,22,50,0.55) 0%, rgba(8,11,20,0.97) 60%)' }}
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/18 flex items-center justify-center shrink-0">
              <GraduationCap size={18} className="text-sky-400" />
            </div>
            <div>
              <p className="text-base font-black text-white">HSC Exam 2027</p>
              <p className="text-xs text-sky-400/55 mt-0.5">১৫ মার্চ ২০২৭ · Board Examination</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[
              { val: hscCD.days,    label: 'Days'  },
              { val: hscCD.hours,   label: 'Hours' },
              { val: hscCD.minutes, label: 'Min'   },
              { val: hscCD.seconds, label: 'Sec'   },
            ].map(({ val, label }, i) => (
              <div key={label} className="flex items-center gap-2">
                <DigitBox value={val} label={label} size="sm"
                  color="text-sky-200" bg="bg-sky-950/60" border="border-sky-500/18" />
                {i < 3 && <span className="text-sky-700/50 text-lg font-black pb-4 select-none">:</span>}
              </div>
            ))}
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 4 — STREAK  +  VOCABULARY                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Streak */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.14 }}
            className="rounded-2xl border border-orange-500/18 p-5"
            style={{ background: 'linear-gradient(145deg, rgba(50,16,2,0.65) 0%, rgba(10,14,26,0.97) 60%)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame size={14} className="text-orange-400" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-white/25">Daily Streak</span>
              </div>
              {streak >= 7 && (
                <span className="text-[10px] bg-orange-500/12 text-orange-300 border border-orange-500/18 rounded-full px-2 py-0.5 font-bold">
                  🏆 Week Champion
                </span>
              )}
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-5xl font-black text-orange-400 tabular-nums leading-none">{streak}</span>
                  <span className="text-base text-orange-600/60 font-bold mb-0.5">days</span>
                </div>
                <p className="text-xs text-white/25 mt-1.5">
                  {streak === 0 ? 'Start your streak today!' : streak === 1 ? 'First day — keep it up! 🔥' : 'Consecutive study days 💪'}
                </p>
                {bestStreak > streak && (
                  <p className="text-[10px] text-white/20 mt-1">Best ever: {bestStreak} days</p>
                )}
              </div>
              <div className="flex gap-0.5 items-end pb-1">
                {[...Array(Math.min(Math.max(streak, 0), 7))].map((_, i) => (
                  <span
                    key={i}
                    className="text-xl leading-none"
                    style={{ opacity: 0.3 + (i / Math.max(Math.min(streak, 7), 1)) * 0.7 }}
                  >🔥</span>
                ))}
                {streak === 0 && <span className="text-2xl opacity-20">🔥</span>}
              </div>
            </div>
          </motion.div>

          {/* Vocabulary */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.16 }}
            className="rounded-2xl border border-violet-500/18 p-5 cursor-pointer hover:border-violet-500/35 transition-all"
            style={{ background: 'linear-gradient(145deg, rgba(24,6,50,0.60) 0%, rgba(10,14,26,0.97) 60%)' }}
            onClick={() => navigate('/vocabulary')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-violet-400" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-white/25">Today's Vocabulary</span>
              </div>
              {vocabCount >= vocabThreshold && (
                <span className="text-[10px] bg-green-500/12 text-green-300 border border-green-500/18 rounded-full px-2 py-0.5 font-bold">
                  ✓ Done
                </span>
              )}
            </div>

            <div className="flex items-end gap-2 mb-4">
              <span className="text-5xl font-black text-violet-300 tabular-nums leading-none">{vocabCount}</span>
              <span className="text-xl text-violet-600/50 font-bold mb-0.5">/ {vocabThreshold}</span>
            </div>

            <ProgressBar pct={vocabPct} color="linear-gradient(90deg, #5b21b6, #8b5cf6, #a78bfa)" height="h-2.5" />

            <p className="text-[10px] text-white/20 mt-2">
              {vocabCount >= vocabThreshold
                ? '🎉 All done for today — chat may be unlocked!'
                : `${vocabThreshold - vocabCount} words remaining · Tap to study`}
            </p>
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 5 — TODAY'S TARGETS (from Routine — source of truth)  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-5"
        >
          <SectionLabel icon={Target} iconColor="text-cyan-400" title="Today's Targets"
            action={
              <div className="flex items-center gap-3">
                {targetsSaving && <span className="text-[10px] text-white/20 animate-pulse">Saving…</span>}
                <Link to="/routine" className="flex items-center gap-1 text-[10px] text-cyan-400/55 hover:text-cyan-400 transition-colors">
                  Manage <ChevronRight size={10} />
                </Link>
              </div>
            }
          />

          {targetsLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : targets.length === 0 ? (
            <div className="text-center py-8">
              <Target size={30} className="mx-auto mb-3 text-white/10" />
              <p className="text-sm text-white/25">No targets for {yearMonth}</p>
              <Link to="/routine" className="text-xs text-cyan-400/55 hover:text-cyan-400 mt-1.5 inline-block transition-colors">
                Add targets in Routine page →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {targets.map((target, i) => {
                const STATUS_UI = {
                  completed:   { Icon: CheckCircle2, color: 'text-green-400',  bg: 'bg-green-500/6 border-green-500/12',   label: 'Done'       },
                  in_progress: { Icon: Zap,          color: 'text-yellow-400', bg: 'bg-yellow-500/6 border-yellow-500/12', label: 'In Progress'},
                  delayed:     { Icon: AlertTriangle, color: 'text-red-400',   bg: 'bg-red-500/6 border-red-500/12',       label: 'Delayed'    },
                  pending:     { Icon: Circle,        color: 'text-white/25',  bg: 'bg-white/[0.02] border-white/[0.06]',  label: 'Pending'    },
                };
                const cfg = STATUS_UI[target.status || 'pending'] || STATUS_UI.pending;
                const { Icon: StatusIcon } = cfg;
                return (
                  <motion.button
                    key={i}
                    onClick={() => cycleTargetStatus(i)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:brightness-110 active:scale-[0.99] ${cfg.bg}`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <StatusIcon size={15} className={`shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate transition-colors ${
                        target.status === 'completed' ? 'text-white/30 line-through' : 'text-white/75'
                      }`}>
                        {target.chapterName || target.description}
                      </p>
                      {target.subject && (
                        <p className="text-[10px] text-white/22 mt-0.5">{target.subject}</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold shrink-0 ${cfg.color}`}>{cfg.label}</span>
                  </motion.button>
                );
              })}

              <p className="text-[9px] text-white/15 text-center mt-2 pt-1">
                Tap to cycle status · Synced with Routine page
              </p>
            </div>
          )}
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 6 — TODAY'S SCHEDULE                                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-5"
        >
          <SectionLabel icon={Calendar} iconColor="text-blue-400" title="Today's Schedule"
            action={<span className="text-[10px] text-white/20">{day}</span>}
          />

          {schedLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/[0.04] animate-pulse" />)}
            </div>
          ) : schedule.length === 0 ? (
            <div className="text-center py-6">
              <Calendar size={26} className="mx-auto mb-2.5 text-white/10" />
              <p className="text-sm text-white/25">
                {!WEEKLY_SCHEDULE[day]
                  ? `${day} — Practice / Rest Day 🌴`
                  : 'No sessions found for today'}
              </p>
              {!WEEKLY_SCHEDULE[day] && (
                <p className="text-xs text-white/15 mt-1">
                  {day === 'Friday' ? 'QB solving + non-academic reading' : 'Admission QB solving'}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {schedule.map(s => {
                const slot   = SESSION_SLOTS[s.sessionNumber];
                if (!slot) return null;
                const nowM   = hour * 60 + minute;
                const startM = slot.startHour * 60 + slot.startMin;
                let   endM   = slot.endHour   * 60 + slot.endMin;
                if (slot.endHour < slot.startHour) endM += 1440;

                const status = s.log
                  ? (s.log.completed ? 'done' : 'missed')
                  : nowM < startM ? 'upcoming'
                  : nowM < endM   ? 'active'
                  : 'pending';

                const STATUS_UI = {
                  done:     { badge: '✓ Done',      badgeCls: 'text-green-400 bg-green-500/10 border-green-500/18',    cardCls: 'border-green-500/10'   },
                  missed:   { badge: '✗ Missed',    badgeCls: 'text-red-400   bg-red-500/10   border-red-500/18',      cardCls: 'border-red-500/10'     },
                  active:   { badge: '● Live now',  badgeCls: 'text-cyan-400  bg-cyan-500/10  border-cyan-500/18 animate-pulse', cardCls: 'border-cyan-500/20' },
                  upcoming: { badge: 'Upcoming',    badgeCls: 'text-white/30  bg-white/5      border-white/10',        cardCls: 'border-white/[0.06]'   },
                  pending:  { badge: '! Log করো',   badgeCls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/18 cursor-pointer', cardCls: 'border-yellow-500/12' },
                };
                const ui = STATUS_UI[status] || STATUS_UI.upcoming;

                const SUBJ_COLORS = {
                  Physics:   'bg-sky-500/12     text-sky-400     border-sky-500/18',
                  Chemistry: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/18',
                  Math:      'bg-violet-500/12  text-violet-400  border-violet-500/18',
                  HigherMath:'bg-violet-500/12  text-violet-400  border-violet-500/18',
                  Botany:    'bg-lime-500/12    text-lime-400    border-lime-500/18',
                  Zoology:   'bg-amber-500/12   text-amber-400   border-amber-500/18',
                };

                return (
                  <div
                    key={s.sessionNumber}
                    className={`flex items-center gap-3 sm:gap-4 p-3.5 rounded-xl border bg-white/[0.01] ${ui.cardCls}`}
                  >
                    <div className="shrink-0 w-20 text-right">
                      <p className="text-[10px] font-mono font-bold text-white/35">{slot.label}</p>
                      <p className="text-[9px] text-white/20 mt-0.5">{slot.time}</p>
                    </div>
                    <div className="flex-1 flex flex-wrap gap-1.5">
                      {s.subjects.map(sub => (
                        <span key={sub}
                          className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold ${SUBJ_COLORS[sub] || 'bg-white/5 text-white/35 border-white/10'}`}>
                          {sub}
                        </span>
                      ))}
                    </div>
                    <button
                      className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold shrink-0 transition-all ${ui.badgeCls}`}
                      onClick={status === 'pending' ? () => openModal('pending-session') : undefined}
                    >
                      {ui.badge}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 7 — 7-DAY ANALYTICS                                   */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="rounded-2xl border border-indigo-500/12 p-5"
          style={{ background: 'linear-gradient(145deg, rgba(8,6,30,0.65) 0%, rgba(10,14,26,0.97) 60%)' }}
        >
          <SectionLabel icon={BarChart2} iconColor="text-indigo-400" title="7-Day Analytics" />

          {!analytics ? (
            <div className="h-28 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-indigo-500/50 border-t-indigo-400 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Bar chart */}
              <div className="flex items-end gap-1.5 sm:gap-2 mb-5" style={{ height: 80 }}>
                {(analytics.byDay || []).map((d, i) => {
                  const maxScore = Math.max(...(analytics.byDay || []).map(x => x.productivityScore || 0), 1);
                  const h = Math.max(4, Math.round(((d.productivityScore || 0) / maxScore) * 100));
                  const score = d.productivityScore || 0;
                  const barColor = score >= 70 ? { from: '#4f46e5', to: '#818cf8' }
                                 : score >= 40 ? { from: '#b45309', to: '#fbbf24' }
                                 : { from: '#991b1b', to: '#f87171' };
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-1"
                      title={`${d.day}: ${score}%`}
                    >
                      <div className="w-full flex items-end justify-center" style={{ height: 64 }}>
                        <motion.div
                          className="w-full rounded-t-lg"
                          style={{
                            height: `${h}%`,
                            background: `linear-gradient(to top, ${barColor.from}, ${barColor.to})`,
                            minHeight: 2,
                          }}
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ duration: 0.5, delay: i * 0.06, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-[9px] text-white/25">{(d.day || '').slice(0, 2)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Summary grid */}
              <div className="grid grid-cols-3 gap-3 border-t border-white/[0.05] pt-4">
                {[
                  { label: 'Sessions Done',  value: analytics.summary?.totalCompleted || 0, color: 'text-green-400'   },
                  { label: 'Sessions Missed', value: analytics.summary?.totalMissed    || 0, color: 'text-red-400'    },
                  { label: 'Avg Score',       value: `${analytics.summary?.avgScore   || 0}%`, color: 'text-indigo-400'},
                ].map(item => (
                  <div key={item.label} className="text-center">
                    <p className={`text-xl font-black ${item.color}`}>{item.value}</p>
                    <p className="text-[9px] text-white/22 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* QUICK ACTIONS                                                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Log Session', sub: 'Check-In',  Icon: CheckSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/18', path: '/checkin'  },
            { label: 'Study Timer', sub: 'Focus mode', Icon: Timer,       color: 'text-cyan-400',    bg: 'bg-cyan-500/10    border-cyan-500/18',     path: '/timer'    },
            { label: 'AI Analysis', sub: 'Mentor AI',  Icon: Sparkles,    color: 'text-purple-400',  bg: 'bg-purple-500/10  border-purple-500/18',   path: '/ai'       },
          ].map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all group active:scale-95"
            >
              <div className={`w-10 h-10 rounded-xl border ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <item.Icon size={17} className={item.color} />
              </div>
              <div className="text-center">
                <p className="text-[11px] font-bold text-white/65">{item.label}</p>
                <p className="text-[9px] text-white/25">{item.sub}</p>
              </div>
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 8 — MORNING ROUTINE STATUS                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {morningData && (
          <MorningStatusBar checkin={morningData.checkin} onEdit={() => openModal('morning')} />
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 9 — COUPLE ZONE (BOTTOM)                              */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="rounded-2xl border border-rose-500/12 p-5"
          style={{ background: 'linear-gradient(145deg, rgba(30,4,14,0.55) 0%, rgba(10,14,26,0.97) 65%)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Heart size={13} className="text-rose-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/25">Couple Zone</span>
            </div>
            <Link
              to="/chat"
              className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border font-bold transition-all ${
                isUnlocked
                  ? 'text-cyan-300 bg-cyan-500/10 border-cyan-500/18 hover:border-cyan-500/40'
                  : 'text-white/25 bg-white/5 border-white/10'
              }`}
            >
              {isUnlocked ? <Unlock size={9} /> : <Lock size={9} />}
              {isUnlocked ? 'Chat Open →' : 'Locked 🔒'}
            </Link>
          </div>

          {/* Three info cells */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            {/* Partner presence */}
            <div className={`rounded-xl border p-3 transition-all ${
              partnerStats?.isStudying
                ? 'border-purple-500/18 bg-purple-500/5'
                : 'border-white/[0.06] bg-white/[0.01]'
            }`}>
              <p className="text-[9px] text-white/22 uppercase tracking-wider mb-2">Partner</p>
              {!partner ? (
                <p className="text-xs text-white/25">No partner linked</p>
              ) : partnerStats?.isStudying ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                    <p className="text-sm font-bold text-white truncate">{partnerStats.displayName}</p>
                  </div>
                  <p className="text-xs text-purple-300">📚 {partnerStats.subject}</p>
                  {partnerStats.chapter && (
                    <p className="text-[9px] text-white/25 mt-0.5 truncate">{partnerStats.chapter}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xl">😴</span>
                  <p className="text-xs text-white/28">Waiting for {partner?.displayName || 'Shahinur'}…</p>
                </div>
              )}
            </div>

            {/* My vocab */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-3">
              <p className="text-[9px] text-white/22 uppercase tracking-wider mb-2">My Vocab</p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className={`text-xl font-black tabular-nums ${vocabCount >= vocabThreshold ? 'text-green-400' : 'text-white'}`}>
                  {vocabCount}
                </span>
                <span className="text-xs text-white/25">/ {vocabThreshold}</span>
                {vocabCount >= vocabThreshold && <CheckCircle2 size={11} className="text-green-400 ml-0.5" />}
              </div>
              <ProgressBar pct={vocabPct}
                color={vocabCount >= vocabThreshold ? '#22c55e' : 'linear-gradient(90deg, #5b21b6, #8b5cf6)'}
                height="h-1.5"
              />
            </div>

            {/* Partner vocab */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-3">
              <p className="text-[9px] text-white/22 uppercase tracking-wider mb-2">
                {partner?.displayName || 'Partner'}'s Vocab
              </p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className={`text-xl font-black tabular-nums ${partnerVocabCount >= vocabThreshold ? 'text-green-400' : 'text-white'}`}>
                  {partnerVocabCount}
                </span>
                <span className="text-xs text-white/25">/ {vocabThreshold}</span>
                {partnerVocabCount >= vocabThreshold && <CheckCircle2 size={11} className="text-green-400 ml-0.5" />}
              </div>
              <ProgressBar pct={partnerVocabPct}
                color={partnerVocabCount >= vocabThreshold ? '#22c55e' : 'linear-gradient(90deg, #9d174d, #ec4899)'}
                height="h-1.5"
              />
            </div>
          </div>

          {/* Unlock status message */}
          <AnimatePresence>
            {isUnlocked && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-cyan-500/12"
              >
                <p className="text-center text-xs text-cyan-400 font-medium">
                  🔓 Chat is unlocked! Tap "Chat Open" to start your 45-min session.
                </p>
              </motion.div>
            )}
            {!isUnlocked && (
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center text-[10px] text-white/18 mt-3"
              >
                Both need {vocabThreshold} vocab words to unlock chat
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

      </div>{/* end px-4 space-y-5 */}

      {/* ── MODALS ──────────────────────────────────────────────────────── */}
      <MorningCheckinModal />
      <PendingSessionModal pending={pending} />

      {/* ── SUBJECT DRAWER ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {drawerSubject && drawerData && (
          <SubjectDrawer
            subject={drawerSubject}
            chapters={drawerData.chs}
            colors={drawerData.colors}
            onClose={() => setDrawerSubject(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MORNING STATUS BAR (bottom of content, above Couple Zone)
// ─────────────────────────────────────────────────────────────────────────────
function MorningStatusBar({ checkin, onEdit }) {
  if (!checkin) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-white/35 bangla">আজকের সকাল লগ করা হয়নি</p>
          <p className="text-xs text-white/20 mt-0.5 bangla">৬টায় উঠেছিলে? কলেজের আগে পড়েছিলে?</p>
        </div>
        <button
          onClick={onEdit}
          className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-white/8 text-white/50 hover:text-white hover:bg-white/12 border border-white/10 transition-all"
        >
          Log করো
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={checkin.wokeUpAt6 ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
            {checkin.wokeUpAt6 ? '✓' : '✗'}
          </span>
          <span className="text-sm text-white/45 bangla">৬টায় উঠেছি</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={checkin.studiedBeforeCollege ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
            {checkin.studiedBeforeCollege ? '✓' : '✗'}
          </span>
          <span className="text-sm text-white/45 bangla">কলেজের আগে পড়া</span>
        </div>
      </div>
      <button
        onClick={onEdit}
        className="text-xs text-white/25 hover:text-white/60 transition-colors shrink-0"
      >
        Edit
      </button>
    </div>
  );
}
