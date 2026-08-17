// ─────────────────────────────────────────────────────────────────────────────
// Mentor API — Client-side service for Zyntra AI Mentor
// - Direct Firestore reads & writes for caching, limits, and chat history
// - Uses /.netlify/functions/ai-mentor to call OpenRouter securely
// ─────────────────────────────────────────────────────────────────────────────

import { doc, getDoc, setDoc, getDocs, collection, query, orderBy, limit, arrayUnion, increment } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  getChapters, getWeeklyStats, getVocabStats, getDueRevisions, getTargets,
} from '../firebase/db';
import { getBSTDateString, getBSTYearMonth } from './bst';

const FUNCTION_URL = '/.netlify/functions/ai-mentor';

// ── System Prompt for Mentor Analysis ─────────────────────────────────────────
export const MENTOR_SYSTEM_PROMPT = `তুমি Saiful-এর ব্যক্তিগত AI Mentor — একজন experienced BUET senior-এর মতো, যে সরাসরি, বাস্তবসম্মত, এবং কঠোরভাবে guide করে।

━━━ Student Profile ━━━
নাম: Saiful Islam | HSC (Science) Bangladesh
Ultimate Goal: BUET Admission — যেভাবেই হোক।
HSC Preparation Deadline: 31 December 2026
HSC Exam: March 2027 | BUET Exam: October 2027

━━━ Priority Framework ━━━
BUET (PCM: Physics · Chemistry · HigherMath) > HSC preparation > General study
Biology (Botany + Zoology): শুধু scheduled session-এ পড়ে, extra দরকার নেই।

━━━ Chapter Difficulty Reference ━━━
Physics কঠিন: Ch4, Ch8, Ch9, Ch11, Ch12, Ch13, Ch14, Ch15, Ch16
Chemistry সবচেয়ে কঠিন: Ch7 Organic Chemistry — একাই ২ মাস লাগে
HigherMath কঠিন: Ch10 Integration, Ch16 Conics, Ch18 Statics, Ch19 Dynamics

━━━ Personality Rules ━━━
১. সম্পূর্ণ বাংলায় — subject name, number, % ছাড়া English নেই।
২. কাজের কথা বলো — সাহিত্য না। Concise sentences.
৩. Motivational speech বা "তুমি পারবে! 🔥" type কথা দিবে না।
৪. Data থেকেই বলো। নিজে থেকে কিছু invent করবে না।
৫. Data না থাকলে: "এই তথ্য আমার কাছে নেই।"
৬. Fact vs Advice সবসময় distinguish করো।
   Data থেকে → "তোমার Physics..."
   Recommendation → "আমার পরামর্শ: ..."
৭. BUET first — HSC নষ্ট না করে, কিন্তু BUET সবসময় আগে।
৮. প্রয়োজনে কঠিন সত্য বলো। কোনো sugarcoat নেই।
৯. Common chapters (Physics/Math/Chemistry যেগুলো HSC + BUET দুটোতে আছে) — overlap use করে time save করতে বলো।

━━━ Analysis Format — প্রতিটা section relevant হলেই দেখাবে ━━━
🎯 **আজকের Priority** — সবচেয়ে জরুরি ১-২টি কাজ (কেন জরুরি তাও বলো)
⚠️ **সবচেয়ে বড় Risk** — কোন subject/chapter এখন সবচেয়ে বিপজ্জনক, কেন
📚 **আজ কী পড়বে** — Specific: Subject → Chapter → কতক্ষণ
🔁 **Revision Recommendation** — relevant হলে শুধু দেখাবে
🏆 **যা ভালো যাচ্ছে** — Data দিয়ে। না থাকলে এই section বাদ।
🎓 **BUET Strategy** — PCM balance, BUET readiness, gap analysis
⏱ **Suggested Time** — Physics: Xm | Chemistry: Xm | Math: Xm | Vocab: 20min`;

// ── System Prompt for Mentor Chat ─────────────────────────────────────────────
export const CHAT_SYSTEM_PROMPT = `তুমি Saiful-এর ব্যক্তিগত AI Mentor — একজন experienced BUET senior।
Interactive chat mode-এ আছো। User সরাসরি প্রশ্ন করছে।

Student Profile: Saiful Islam | HSC Science, Bangladesh
Goal: BUET Admission (October 2027) | HSC Exam: March 2027 | HSC Deadline: Dec 2026
BUET Core: Physics · Chemistry · HigherMath (PCM) — সর্বোচ্চ priority

Rules:
১. সম্পূর্ণ বাংলায়। Subject name, number ছাড়া English নেই।
২. Concise, direct — প্রতিটা response এর সাথে actual student data reference করো।
৩. Generic motivational speech দিবে না।
৪. Data না থাকলে honestly বলো।
৫. Student-এর current data দেখে answer করো — guess করবে না।
৬. Proactive হও: question-এর answer দিয়েই থামবে না, relevant next step suggest করো।
৭. কঠিন সত্য বলতে দ্বিধা করবে না।
৮. Student যদি শুধু একটা subject পড়তে চায় কিন্তু অন্য কিছু urgent হয়, সেটা বলো।`;

// ── Context Builder (reads Firestore via db.js) ───────────────────────────────
export async function buildMentorContext(userId) {
  const [chapters, weekly, vocabStats, revisions, targets] = await Promise.all([
    getChapters(userId),
    getWeeklyStats(userId, 7),
    getVocabStats(userId),
    getDueRevisions(userId),
    getTargets(userId, getBSTYearMonth()),
  ]);

  const today = getBSTDateString();

  // Process chapters
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

  // Delayed / in-progress chapters
  const delayedChapters = chapters
    .filter(c => c.status === 'in_progress')
    .map(c => ({ subject: c.subject, num: c.chapterNumber, name: c.chapterName }));

  // Targets
  const thisMonthTargets = (targets.chapters || []).map(t => ({
    subject: t.subject, chapter: t.chapterName, done: !!t.completed, difficulty: t.difficulty,
  }));

  // Vocab stats
  const vocab = {
    total:      vocabStats.totalWords    || 0,
    mastered:   vocabStats.masteredWords || 0,
    due:        vocabStats.dueWords      || 0,
    todayAdded: vocabStats.todayReviews  || 0,
    avgMastery: vocabStats.avgMastery    || 0,
  };

  // Last 7 days session logs
  const last7 = (weekly.byDay || []).map(d => ({
    date:      d.date,
    completed: d.completedSessions || 0,
    missed:    d.missedSessions    || 0,
    totalMin:  d.extraStudyMinutes || 0,
    wokeUp:    d.wakeUpAt6         || false,
    preStudy:  d.preStudy          || false,
    subjects:  (d.sessions || []).filter(s => s.completed !== false).map(s => s.subject),
  }));

  const streak = weekly.streak || 0;

  // Revisions due
  const rawRevisions = Array.isArray(revisions)
    ? revisions
    : [...(revisions.dueToday || []), ...(revisions.overdue || [])];
  const revisionsDue = rawRevisions.slice(0, 5).map(r => ({
    subject: r.subject, chapterName: r.chapterName, count: r.revisionCount,
  }));

  // Deadlines
  const daysDiff = (t) => Math.max(0, Math.round((new Date(t).getTime() - Date.now()) / 86400000));

  return {
    today,
    studentName:       'Saiful',
    hscDeadline:       '2026-12-31',
    hscExam:           '2027-03-01',
    buetExam:          '2027-10-01',
    daysToHscDeadline: daysDiff('2026-12-31'),
    daysToHscExam:     daysDiff('2027-03-01'),
    daysToButExam:     daysDiff('2027-10-01'),
    subjects,
    chBySubj,
    delayedChapters,
    streak,
    last7,
    vocabStats:        vocab,
    thisMonthTargets,
    revisionsDue,
  };
}

// ── Format Context into User Message for Analysis ─────────────────────────────
function buildAnalysisUserMessage(ctx) {
  const pcm = ['Physics','Chemistry','HigherMath'].map(s => {
    const sm = ctx.subjects[s];
    if (!sm) return `${s}: তথ্য নেই`;
    const chs      = ctx.chBySubj[s] || [];
    const inProg   = chs.filter(c => c.status === 'in_progress').map(c => `Ch${c.num} ${c.name}`).join(', ');
    const delayed  = chs.filter(c => c.status === 'not_started').slice(0,3).map(c => `Ch${c.num}`).join(',');
    return `${s}: ${sm.completed}/${sm.total} chapter শেষ (${sm.pct}%) | চলছে: ${inProg||'কিছু না'} | Not started: ${sm.notStarted}${delayed ? ` (next: Ch${delayed})` : ''}`;
  }).join('\n');

  const hsc = ['Botany','Zoology','Bangla','English','ICT'].map(s => {
    const sm = ctx.subjects[s];
    return sm ? `${s}: ${sm.completed}/${sm.total} (${sm.pct}%)` : null;
  }).filter(Boolean).join(' | ');

  const perf = (ctx.last7 || []).map(d =>
    `${d.date}: ✅${d.completed} ❌${d.missed}${d.subjects.length?` [${d.subjects.join(',')}]`:''} | ${d.wokeUp?'⏰6AM':'❌woke'} | ${d.preStudy?'📖Pre':''}${d.totalMin?` ${d.totalMin}min`:''}`
  ).join('\n');

  const tgt = (ctx.thisMonthTargets || []).length
    ? ctx.thisMonthTargets.map(t => `${t.subject} ${t.chapter}: ${t.done?'✅':'⬜'} (${t.difficulty || 'Normal'})`).join(' | ')
    : 'কোনো target নেই';

  return `আজ: ${ctx.today} | Streak: ${ctx.streak} দিন
HSC Deadline: ${ctx.hscDeadline} → ${ctx.daysToHscDeadline} দিন বাকি
HSC Exam: ${ctx.hscExam} → ${ctx.daysToHscExam} দিন বাকি
BUET Exam: ${ctx.buetExam} → ${ctx.daysToButExam} দিন বাকি

━━━ BUET Core (PCM) ━━━
${pcm}

━━━ Delayed/In-Progress Chapters ━━━
${(ctx.delayedChapters || []).map(c => `${c.subject} Ch${c.num}: ${c.name}`).join('\n')||'কোনো delay নেই'}

━━━ HSC Other Subjects ━━━
${hsc||'তথ্য নেই'}

━━━ Last 7 Days Performance ━━━
${perf}

━━━ This Month Targets ━━━
${tgt}

━━━ Vocabulary ━━━
Total: ${ctx.vocabStats.total} | Mastered: ${ctx.vocabStats.mastered} | Due review: ${ctx.vocabStats.due} | আজ added: ${ctx.vocabStats.todayAdded}

উপরের সব data দেখে আজকের mentor analysis দাও।`;
}

// ── Call Netlify AI Function ──────────────────────────────────────────────────
async function callAiProxy(messages, maxTokens = 1800) {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, maxTokens }),
  });

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `AI function failed (${res.status})`);
  }
  return data;
}

// ── Analysis Firestore Functions ──────────────────────────────────────────────

/** Get cached daily analysis from Firestore */
export async function getCachedAnalysis(userId) {
  if (!userId) return { analysis: null };
  const today = getBSTDateString();
  const docRef = doc(db, 'users', userId, 'mentorAnalysis', today);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return { analysis: snap.data(), cached: true };
  }
  return { analysis: null, cached: false };
}

/** Generate new analysis, call AI proxy, and save to Firestore */
export async function generateAnalysis(userId, forceRefresh = false) {
  if (!userId) throw new Error('User ID required');
  const today = getBSTDateString();

  // If not force refresh, check cache first
  if (!forceRefresh) {
    const cached = await getCachedAnalysis(userId);
    if (cached.analysis) return cached;
  }

  // Build full context
  const context = await buildMentorContext(userId);
  const userMsg = buildAnalysisUserMessage(context);

  const messages = [
    { role: 'system', content: MENTOR_SYSTEM_PROMPT },
    { role: 'user',   content: userMsg },
  ];

  const aiResult = await callAiProxy(messages, 1800);

  // Extract readiness
  const bMatch = aiResult.text.match(/BUET.{0,30}(High|Medium|Low|Moderate|Critical|Strong|Weak)/i);
  const buetReadiness = bMatch ? bMatch[1] : 'Moderate';

  const analysisData = {
    text: aiResult.text,
    generatedAt: new Date().toISOString(),
    buetReadiness,
    today,
    modelUsed: aiResult.modelUsed || 'primary',
  };

  // Save to Firestore
  const docRef = doc(db, 'users', userId, 'mentorAnalysis', today);
  await setDoc(docRef, analysisData, { merge: true });

  return { analysis: analysisData, cached: false };
}

// ── Chat & Limit Firestore Functions ──────────────────────────────────────────

/** Get today's question usage from Firestore */
export async function getChatUsage(userId) {
  if (!userId) return { questionsUsed: 0, dailyLimit: null, limitSet: false };
  const today = getBSTDateString();
  const docRef = doc(db, 'users', userId, 'mentorUsage', today);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    return { ...data, limitSet: data.dailyLimit !== undefined && data.dailyLimit !== null, date: today };
  }
  return { questionsUsed: 0, dailyLimit: null, limitSet: false, date: today };
}

/** Set today's daily question limit in Firestore */
export async function setDailyLimit(userId, limitVal) {
  if (!userId) throw new Error('User ID required');
  const today = getBSTDateString();
  const docRef = doc(db, 'users', userId, 'mentorUsage', today);
  await setDoc(docRef, {
    dailyLimit: limitVal,
    questionsUsed: 0,
    date: today,
    limitSetAt: new Date().toISOString(),
  }, { merge: true });

  return { success: true, dailyLimit: limitVal, questionsUsed: 0 };
}

/** Get chat history for a specific date from Firestore */
export async function getChatHistory(userId, date) {
  if (!userId || !date) return { messages: [] };
  const docRef = doc(db, 'users', userId, 'mentorChats', date);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    return { messages: data.messages || [], questionCount: data.questionCount || 0, date };
  }
  return { messages: [], questionCount: 0, date };
}

/** List all dates with chat history from Firestore */
export async function getChatHistoryDates(userId) {
  if (!userId) return { dates: [] };
  const chatsCol = collection(db, 'users', userId, 'mentorChats');
  const q = query(chatsCol, orderBy('updatedAt', 'desc'), limit(30));
  const snap = await getDocs(q);
  const dates = snap.docs.map(d => ({
    date:          d.id,
    questionCount: d.data().questionCount || 0,
    topicSummary:  d.data().topicSummary  || '',
    updatedAt:     d.data().updatedAt,
  }));
  return { dates };
}

/** Send chat message to mentor */
export async function sendChatMessage(userId, message, chatHistory = [], contextSummary = null) {
  if (!userId) throw new Error('User ID required');
  if (!message?.trim()) throw new Error('Message required');
  const today = getBSTDateString();

  // Check limit
  const usageDocRef = doc(db, 'users', userId, 'mentorUsage', today);
  const usageSnap   = await getDoc(usageDocRef);
  const usageData   = usageSnap.exists() ? usageSnap.data() : { questionsUsed: 0, dailyLimit: null };

  if (usageData.dailyLimit !== 'unlimited' && usageData.dailyLimit !== null && usageData.dailyLimit !== undefined) {
    if ((usageData.questionsUsed || 0) >= Number(usageData.dailyLimit)) {
      const err = new Error('আজকের question limit শেষ।');
      err.status = 429;
      throw err;
    }
  }

  // Format context for chat
  let contextSnippet = 'Student context unavailable.';
  if (contextSummary) {
    const subjLines = Object.entries(contextSummary.subjects || {}).map(([s, d]) =>
      `${s}: ${d.pct}% (${d.completed}/${d.total})`
    ).join(' | ');
    const delayed = (contextSummary.delayedChapters || []).map(c => `${c.subject} Ch${c.num}`).join(', ');
    contextSnippet = `Today: ${contextSummary.today} | Streak: ${contextSummary.streak}d
PCM & Subjects: ${subjLines}
Delayed: ${delayed || 'None'}`;
    if (contextSummary.todayAnalysis) {
      contextSnippet += `\nToday's Analysis Preview: ${contextSummary.todayAnalysis.slice(0, 500)}...`;
    }
  }

  const messages = [
    { role: 'system',    content: CHAT_SYSTEM_PROMPT },
    { role: 'user',      content: `━━━ Current Student Status ━━━\n${contextSnippet}` },
    { role: 'assistant', content: 'ঠিক আছে, আমি তোমার সব progress দেখছি। কী জানতে চাও?' },
    ...chatHistory.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  const aiResult = await callAiProxy(messages, 900);
  const timestamp = new Date().toISOString();

  // Save chat to Firestore
  const chatDocRef = doc(db, 'users', userId, 'mentorChats', today);
  await setDoc(chatDocRef, {
    messages: arrayUnion(
      { role: 'user',      content: message,       timestamp },
      { role: 'assistant', content: aiResult.text, timestamp }
    ),
    questionCount: increment(1),
    updatedAt: timestamp,
    date: today,
  }, { merge: true });

  // Increment usage count
  await setDoc(usageDocRef, {
    questionsUsed: increment(1),
    date: today,
  }, { merge: true });

  const newQuestionsUsed = (usageData.questionsUsed || 0) + 1;

  return {
    response: aiResult.text,
    questionsUsed: newQuestionsUsed,
    dailyLimit: usageData.dailyLimit,
    timestamp,
  };
}

// ── Context Summary for Chat ──────────────────────────────────────────────────
export function buildChatContextSummary(fullContext, todayAnalysisText = null) {
  if (!fullContext) return null;
  return {
    today:           fullContext.today,
    streak:          fullContext.streak,
    subjects:        Object.fromEntries(
      Object.entries(fullContext.subjects || {}).map(([s, d]) => [s, {
        pct: d.pct, completed: d.completed, total: d.total, inProgress: d.inProgress,
      }])
    ),
    delayedChapters: fullContext.delayedChapters?.slice(0, 5),
    vocabStats:      fullContext.vocabStats,
    todayAnalysis:   todayAnalysisText,
  };
}
