// ─────────────────────────────────────────────────────────────────────────────
// Mentor API — client-side functions for all AI Mentor endpoints
// All calls go through Netlify Functions (server-side, API key secure)
// ─────────────────────────────────────────────────────────────────────────────
import { getAuth } from 'firebase/auth';
import {
  getChapters, getWeeklyStats, getVocabStats, getDueRevisions, getTargets,
} from '../firebase/db';
import { getBSTDateString, getBSTYearMonth } from './bst';

const BASE = '/.netlify/functions';

// ── Auth token helper ─────────────────────────────────────────────────────────
async function getToken() {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

async function apiFetch(url, options = {}) {
  const token = await getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      ...(options.headers || {}),
    },
  });

  // Parse body regardless of status
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}

// ── Context Builder ───────────────────────────────────────────────────────────
// Reads Firestore data using existing db.js helpers and assembles a context object
// that is sent to the Netlify AI function.
export async function buildMentorContext(userId) {
  const [chapters, weekly, vocabStats, revisions, targets] = await Promise.all([
    getChapters(userId),
    getWeeklyStats(userId, 7),
    getVocabStats(userId),
    getDueRevisions(userId),
    getTargets(userId, getBSTYearMonth()),
  ]);

  const today = getBSTDateString();

  // ── Chapter summary by subject ────────────────────────────────────────────
  const COMPLETED = ['completed','revised','revised_1','revised_2','revised_3','revised_4','revised_5'];
  const subjects  = {};
  const chBySubj  = {};

  for (const ch of chapters) {
    const s = ch.subject;
    if (!subjects[s]) subjects[s] = { total: 0, completed: 0, inProgress: 0, notStarted: 0, pct: 0 };
    if (!chBySubj[s])  chBySubj[s]  = [];

    subjects[s].total++;
    if (COMPLETED.includes(ch.status))    subjects[s].completed++;
    else if (ch.status === 'in_progress') subjects[s].inProgress++;
    else                                   subjects[s].notStarted++;

    chBySubj[s].push({
      num:    ch.chapterNumber,
      name:   ch.chapterName,
      status: ch.status || 'not_started',
      completedTopics: ch.completedTopics || 0,
      totalTopics:     ch.totalTopics     || null,
    });
  }

  for (const s in subjects) {
    const { completed, total } = subjects[s];
    subjects[s].pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    chBySubj[s]?.sort((a, b) => a.num - b.num);
  }

  // ── Delayed (in-progress) chapters ───────────────────────────────────────
  const delayedChapters = chapters
    .filter(c => c.status === 'in_progress')
    .map(c => ({ subject: c.subject, num: c.chapterNumber, name: c.chapterName }));

  // ── Monthly targets ───────────────────────────────────────────────────────
  const thisMonthTargets = (targets.chapters || []).map(t => ({
    subject: t.subject, chapter: t.chapterName, done: !!t.completed, difficulty: t.difficulty,
  }));

  // ── Vocab stats ───────────────────────────────────────────────────────────
  const vocab = {
    total:      vocabStats.totalWords   || 0,
    mastered:   vocabStats.masteredWords || 0,
    due:        vocabStats.dueWords     || 0,
    todayAdded: vocabStats.todayReviews || 0,  // proxy
    avgMastery: vocabStats.avgMastery   || 0,
  };

  // ── Session performance (getWeeklyStats returns {byDay, streak, summary}) ──
  const last7 = (weekly.byDay || []).map(d => ({
    date:      d.date,
    completed: d.completedSessions || 0,
    missed:    d.missedSessions    || 0,
    totalMin:  d.extraStudyMinutes || 0,
    wokeUp:    d.wakeUpAt6        || false,
    preStudy:  d.preStudy         || false,
    subjects:  (d.sessions || []).filter(s => s.completed !== false).map(s => s.subject),
  }));

  const streak = weekly.streak || 0;

  // ── Revision due list ─────────────────────────────────────────────────────
  // getDueRevisions returns {dueToday, overdue, upcoming} or flat array
  const rawRevisions = Array.isArray(revisions)
    ? revisions
    : [...(revisions.dueToday || []), ...(revisions.overdue || [])];
  const revisionsDue = rawRevisions.slice(0, 5).map(r => ({
    subject: r.subject, chapterName: r.chapterName, count: r.revisionCount,
  }));

  // ── Deadline calculations ─────────────────────────────────────────────────
  const daysDiff = (t) => Math.max(0, Math.round((new Date(t).getTime() - Date.now()) / 86400000));

  return {
    today,
    studentName:      'Saiful',
    hscDeadline:      '2026-12-31',
    hscExam:          '2027-03-01',
    buetExam:         '2027-10-01',
    daysToHscDeadline: daysDiff('2026-12-31'),
    daysToHscExam:     daysDiff('2027-03-01'),
    daysToButExam:     daysDiff('2027-10-01'),
    subjects,
    chBySubj,
    delayedChapters,
    streak,
    last7,
    vocabStats:       vocab,
    thisMonthTargets,
    revisionsDue,
  };
}

// ── Analysis endpoints ────────────────────────────────────────────────────────

/** Get cached daily analysis (no AI call) */
export async function getCachedAnalysis() {
  return apiFetch(`${BASE}/ai-mentor`);
}

/** Generate or refresh today's analysis (triggers AI call) */
export async function generateAnalysis(forceRefresh = false) {
  return apiFetch(`${BASE}/ai-mentor`, {
    method: 'POST',
    body:   JSON.stringify({ forceRefresh }),
  });
}

// ── Chat endpoints ────────────────────────────────────────────────────────────

/** Get today's question usage/limit */
export async function getChatUsage() {
  return apiFetch(`${BASE}/ai-mentor-chat?action=usage`);
}

/** Set today's daily question limit */
export async function setDailyLimit(limit) {
  return apiFetch(`${BASE}/ai-mentor-chat`, {
    method: 'POST',
    body:   JSON.stringify({ action: 'set-limit', limit }),
  });
}

/**
 * Send a chat message to the mentor
 * @param {string}   message         - User's message
 * @param {Array}    chatHistory     - Previous messages [{role, content}]
 * @param {object}   contextSummary  - Lightweight student context
 */
export async function sendChatMessage(message, chatHistory = [], contextSummary = null) {
  return apiFetch(`${BASE}/ai-mentor-chat`, {
    method: 'POST',
    body:   JSON.stringify({ action: 'chat', message, chatHistory, contextSummary }),
  });
}

/** Get chat history for a specific date */
export async function getChatHistory(date) {
  return apiFetch(`${BASE}/ai-mentor-chat?date=${date}`);
}

/** Get list of all dates that have chat sessions */
export async function getChatHistoryDates() {
  return apiFetch(`${BASE}/ai-mentor-chat?action=history`);
}

// ── Context summary (lightweight, for chat) ───────────────────────────────────
export function buildChatContextSummary(fullContext, todayAnalysisText = null) {
  if (!fullContext) return null;
  return {
    today:           fullContext.today,
    streak:          fullContext.streak,
    subjects:        Object.fromEntries(
      Object.entries(fullContext.subjects).map(([s, d]) => [s, {
        pct: d.pct, completed: d.completed, total: d.total, inProgress: d.inProgress,
      }])
    ),
    delayedChapters: fullContext.delayedChapters?.slice(0, 5),
    vocabStats:      fullContext.vocabStats,
    todayAnalysis:   todayAnalysisText,
  };
}
