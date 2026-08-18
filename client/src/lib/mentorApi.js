// ─────────────────────────────────────────────────────────────────────────────
// Mentor API — Client-side service for Zyntra AI Mentor
// - Direct Firestore reads & writes (caching, limits, chat history)
// - Calls /.netlify/functions/ai-mentor to keep OPENROUTER_API_KEY secure
// ─────────────────────────────────────────────────────────────────────────────

import {
  doc, getDoc, setDoc, getDocs,
  collection, query, orderBy, limit,
  arrayUnion, increment,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  getChapters, getWeeklyStats, getVocabStats, getDueRevisions, getTargets,
} from '../firebase/db';
import { getBSTDateString, getBSTYearMonth } from './bst';

const FUNCTION_URL = '/.netlify/functions/ai-mentor';

// ─────────────────────────────────────────────────────────────────────────────
// MENTOR SYSTEM PROMPT — Daily Analysis Mode
// Personality: BUET senior who got in through hard work. Direct, honest,
// data-driven. Knows BUET exam realities inside out.
// ─────────────────────────────────────────────────────────────────────────────
export const MENTOR_SYSTEM_PROMPT = `তুমি Saiful-এর AI Mentor। তুমি নিজে BUET-এ পড়ছ — daily ১৩-১৪ ঘন্টা পড়ে, cricket ছেড়ে, social media ছেড়ে চান্স পেয়েছ। তুমি জানো এই জার্নিটা কতটা কঠিন।

━━━ Saiful-এর Double Goal ━━━
১. HSC-এ Golden A+ (GPA 5.00, সব বিষয়ে A+)
২. BUET Admission — October 2027

BUET-এর জন্য HSC PCM-এ ৮৯-৯০%+ দরকার (shortlist হতে)। Bangla, English, ICT-তে A+ না হলে Golden A+ হবে না। তাই সব বিষয়ই গুরুত্বপূর্ণ।

━━━ BUET Exam Reality ━━━
• HSC PCM marks-এর rank অনুযায়ী ১০,০০০ জন shortlist — PCM-এ কম নম্বর মানে exam-ই দিতে পারবে না
• ৬০০ নম্বরের written exam, ৬০টি প্রশ্ন, ৩ ঘন্টা → প্রতি প্রশ্নে মাত্র **৩ মিনিট**
• **৩০-৩৫টি নির্ভুল** করলে চান্স হয়। Partial marking আছে।
• Physics : Chemistry : Math = সমান নম্বর। Physics fetish করলে Chemistry-তে ডুবে যাবে।
• Chemistry Ch7 (Organic) — একাই ২ মাস লাগে, কিন্তু সবাই ignore করে। এটাই সবচেয়ে বড় ফাঁদ।

━━━ Chapter Difficulty Reference ━━━
Physics (কঠিন): Ch4, Ch8, Ch9, Ch11, Ch12, Ch13, Ch14, Ch15, Ch16
Chemistry (সবচেয়ে কঠিন): Ch7 Organic Chemistry
HigherMath (কঠিন): Ch10 Integration, Ch16 Conics, Ch18 Statics, Ch19 Dynamics
HSC Bangla/English/ICT: এগুলোতে A+ না পেলে Golden হবে না — নিয়মিত রাখতে হবে

━━━ Smart Preparation Strategy ━━━
Step 1 → Concept clear (lecture/online)
Step 2 → Main book examples + exercises নিজে করো
Step 3 → Test paper solve (HSC নিরাপদ করতে)
Step 4 → Engineering QB chapter-wise (নিজে করার চেষ্টা, দেখে নয়)
Step 5 → Advanced (JEE, HCV) — শুধু QB শেষ হলে

QB Smart Revision: কঠিন problem mark করো → বারবার করতে করতে chapter-এ ১০-১৫টি core problem-এ নামাও → সেগুলো ৩০-৫০ বার করো। Brain gym: কঠিন math ১০-১৫ মিনিট নিজে ভাবো, তারপর solution দেখো।

━━━ Exam Hall Strategy ━━━
সহজ subject দিয়ে শুরু। Accuracy > Quantity। ৩০-৩৫ নির্ভুল = pass।

━━━ তোমার Personality Rules ━━━
১. সম্পূর্ণ বাংলায়। Subject name, number, % ছাড়া English নেই।
২. Data দেখে analyze করো, তারপর বলো। নিজে কিছু invent করবে না।
৩. Data না থাকলে: "এই তথ্য আমার কাছে নেই।"
৪. Sugarcoating নেই। কঠিন সত্য বললে সেটাই বলো।
৫. Motivational speech নয় — specific action দাও।
৬. Saiful মন খুলে কথা বলতে পারবে তোমার সাথে। তুমি তার বন্ধু এবং mentor।
৭. সবসময় তার goal-এর দিকে focused থাকো।
৮. HSC অবহেলা করলেই BUET-এর shortlist হওয়ার chance চলে যাবে — এটা মনে রাখবে।

━━━ Analysis Format (relevant section-ই শুধু দেখাবে) ━━━
🎯 **আজকের Priority** — সবচেয়ে জরুরি ১-২টি কাজ, কেন জরুরি (data দিয়ে)
⚠️ **সবচেয়ে বড় Risk** — এখন কোন subject/chapter সবচেয়ে বিপজ্জনক, কেন
📚 **আজ কী পড়বে** — Specific: Subject → Chapter → কতক্ষণ
🔁 **Revision** — Due থাকলে আজ কোনটা করবে
🏆 **যা ভালো যাচ্ছে** — Data দিয়ে প্রমাণ করো। না থাকলে এই section বাদ।
🎓 **BUET Strategy** — PCM balance, readiness, gap analysis
⏱ **Suggested Time** — Physics: Xm | Chemistry: Xm | Math: Xm | HSC Others: Xm | Vocab: 20m`;

// ─────────────────────────────────────────────────────────────────────────────
// CHAT SYSTEM PROMPT — Conversational Mode
// ─────────────────────────────────────────────────────────────────────────────
export const CHAT_SYSTEM_PROMPT = `তুমি Saiful-এর AI Mentor। তুমি BUET-এ পড়ছ, নিজে অনেক কষ্ট করে চান্স পেয়েছ।

Interactive chat mode। Saiful সরাসরি প্রশ্ন করছে।

━━━ Saiful-এর Goal ━━━
১. HSC Golden A+ (সব বিষয়ে — Bangla, English, ICT সহ)
২. BUET Admission October 2027 (PCM-এ ৮৯-৯০%+ দরকার)

━━━ BUET Reality ━━━
১০,০০০ shortlist → ৬০০ নম্বর written (৬০ প্রশ্ন, ৩ মিনিট/প্রশ্ন) → ৩০-৩৫ নির্ভুল = pass
Physics = Chemistry = Math (সমান নম্বর — Physics fetish বিপজ্জনক)
Ch7 Chemistry (Organic) — সবচেয়ে কঠিন, সবচেয়ে ignore হয়
HSC Bangla/English/ICT — A+ না হলে Golden হবে না

━━━ Chapter Difficulty ━━━
Physics কঠিন: Ch4, Ch8, Ch9, Ch11-Ch16
Chemistry কঠিন: Ch7 Organic (সবচেয়ে গুরুত্বপূর্ণ)
HigherMath কঠিন: Ch10 Integration, Ch16 Conics, Ch18-Ch19

━━━ Rules ━━━
১. সম্পূর্ণ বাংলায়। Subject name/number ছাড়া English নয়।
২. Data দেখে বলো — guess নয়।
৩. Concise এবং direct। Saiful-এর real progress দেখে answer করো।
৪. Generic motivation নেই — specific কাজের কথা।
৫. Saiful freely কথা বলতে পারবে। তুমি তার senior, বন্ধু।
৬. সে একটা বিষয় করতে চাইলে কিন্তু অন্যটা urgent হলে সেটা বলো।
৭. Next step সবসময় suggest করো।
৮. কঠিন সত্য বলতে ভয় নেই।`;

// ─────────────────────────────────────────────────────────────────────────────
// Context Builder
// ─────────────────────────────────────────────────────────────────────────────
export async function buildMentorContext(userId) {
  const [chapters, weekly, vocabStats, revisions, targets] = await Promise.all([
    getChapters(userId),
    getWeeklyStats(userId, 7),
    getVocabStats(userId),
    getDueRevisions(userId),
    getTargets(userId, getBSTYearMonth()),
  ]);

  const today = getBSTDateString();
  const COMPLETED = ['completed','revised','revised_1','revised_2','revised_3','revised_4','revised_5'];

  // Process all chapters by subject
  const subjects = {};
  const chBySubj = {};

  for (const ch of chapters) {
    const s = ch.subject;
    if (!subjects[s]) subjects[s] = { total: 0, completed: 0, inProgress: 0, notStarted: 0, pct: 0 };
    if (!chBySubj[s])  chBySubj[s]  = [];

    subjects[s].total++;
    if (COMPLETED.includes(ch.status))    subjects[s].completed++;
    else if (ch.status === 'in_progress') subjects[s].inProgress++;
    else                                   subjects[s].notStarted++;

    chBySubj[s].push({
      num:             ch.chapterNumber,
      name:            ch.chapterName,
      status:          ch.status || 'not_started',
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

  // Monthly targets
  const thisMonthTargets = (targets?.chapters || []).map(t => ({
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

  // Last 7 days
  const last7 = (weekly?.byDay || []).map(d => ({
    date:      d.date,
    completed: d.completedSessions || 0,
    missed:    d.missedSessions    || 0,
    totalMin:  d.extraStudyMinutes || 0,
    wokeUp:    d.wakeUpAt6         || false,
    preStudy:  d.preStudy          || false,
    subjects:  (d.sessions || []).filter(s => s.completed !== false).map(s => s.subject),
  }));

  const streak = weekly?.streak || 0;

  // Revisions due
  const rawRevisions = Array.isArray(revisions)
    ? revisions
    : [...(revisions?.dueToday || []), ...(revisions?.overdue || [])];
  const revisionsDue = rawRevisions.slice(0, 6).map(r => ({
    subject: r.subject, chapterName: r.chapterName, count: r.revisionCount || 0,
  }));

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

// ─────────────────────────────────────────────────────────────────────────────
// Build Analysis User Message
// ─────────────────────────────────────────────────────────────────────────────
function buildAnalysisUserMessage(ctx) {
  // BUET core (PCM)
  const pcm = ['Physics', 'Chemistry', 'HigherMath'].map(s => {
    const sm = ctx.subjects[s];
    if (!sm) return `**${s}**: তথ্য নেই`;
    const chs    = ctx.chBySubj[s] || [];
    const inProg = chs.filter(c => c.status === 'in_progress')
                      .map(c => `Ch${c.num} "${c.name}"`).join(', ');
    const notStartedNext = chs.filter(c => c.status === 'not_started')
                              .slice(0, 3).map(c => `Ch${c.num}`).join(', ');
    return `**${s}**: ${sm.completed}/${sm.total} শেষ (${sm.pct}%) | চলছে: ${inProg || 'কিছু না'} | বাকি: ${sm.notStarted} chapter${notStartedNext ? ` (পরেরটা: ${notStartedNext})` : ''}`;
  }).join('\n');

  // HSC other subjects (Golden A+ tracking)
  const hscSubjects = ['Bangla', 'English', 'ICT', 'Botany', 'Zoology'];
  const hsc = hscSubjects.map(s => {
    const sm = ctx.subjects[s];
    if (!sm) return null;
    const chs    = ctx.chBySubj[s] || [];
    const inProg = chs.filter(c => c.status === 'in_progress').map(c => `Ch${c.num}`).join(',');
    return `**${s}**: ${sm.completed}/${sm.total} (${sm.pct}%)${inProg ? ` | চলছে: ${inProg}` : ''}`;
  }).filter(Boolean).join('\n');

  // Last 7 days performance
  const perf = (ctx.last7 || []).map(d => {
    const subj = d.subjects.length ? ` [${d.subjects.join(',')}]` : '';
    const wake = d.wokeUp ? '⏰6AM' : '❌wake';
    const pre  = d.preStudy ? ' 📖pre-study' : '';
    const min  = d.totalMin ? ` ${d.totalMin}m` : '';
    return `${d.date}: ✅${d.completed} ❌${d.missed}${subj} | ${wake}${pre}${min}`;
  }).join('\n') || 'কোনো session data নেই';

  // Delayed chapters (in-progress)
  const delayed = (ctx.delayedChapters || [])
    .map(c => `${c.subject} Ch${c.num}: "${c.name}"`)
    .join('\n') || 'কোনো delay নেই';

  // Revisions due
  const revDue = (ctx.revisionsDue || []).length
    ? ctx.revisionsDue.map(r => `${r.subject} "${r.chapterName}" (revision #${r.count + 1})`).join(', ')
    : 'কোনো revision due নেই';

  // Monthly targets
  const tgt = (ctx.thisMonthTargets || []).length
    ? ctx.thisMonthTargets.map(t => `${t.subject} "${t.chapter}": ${t.done ? '✅' : '⬜'} (${t.difficulty || 'Normal'})`).join(' | ')
    : 'কোনো target নেই';

  return `আজ: ${ctx.today} | Streak: ${ctx.streak} দিন
HSC Prep Deadline: ${ctx.hscDeadline} → ${ctx.daysToHscDeadline} দিন বাকি
HSC Exam: ${ctx.hscExam} → ${ctx.daysToHscExam} দিন বাকি
BUET Exam: ${ctx.buetExam} → ${ctx.daysToButExam} দিন বাকি

━━━ BUET Core — PCM Progress ━━━
${pcm}

━━━ HSC অন্যান্য বিষয় (Golden A+ tracking) ━━━
${hsc || 'তথ্য নেই (Bangla/English/ICT data add করো)'}

━━━ এখন যে Chapter-এ আটকে আছি ━━━
${delayed}

━━━ Revision Due ━━━
${revDue}

━━━ Last 7 Days Performance ━━━
${perf}

━━━ This Month Targets ━━━
${tgt}

━━━ Vocabulary ━━━
Total: ${ctx.vocabStats.total} | Mastered: ${ctx.vocabStats.mastered} | Due: ${ctx.vocabStats.due} | আজ যোগ: ${ctx.vocabStats.todayAdded}

উপরের সব data দেখে আজকের জন্য detailed mentor analysis দাও। Data থেকে specific সমস্যা বের করো।`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Call Netlify AI Proxy
// ─────────────────────────────────────────────────────────────────────────────
async function callAiProxy(messages, maxTokens = 2000) {
  const res = await fetch(FUNCTION_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ messages, maxTokens }),
  });

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `AI function failed (${res.status})`);
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Analysis — Firestore Functions
// ─────────────────────────────────────────────────────────────────────────────

/** Get cached daily analysis from Firestore */
export async function getCachedAnalysis(userId) {
  if (!userId) return { analysis: null };
  const today  = getBSTDateString();
  const docRef = doc(db, 'users', userId, 'mentorAnalysis', today);
  const snap   = await getDoc(docRef);
  if (snap.exists()) return { analysis: snap.data(), cached: true };
  return { analysis: null, cached: false };
}

/** Generate new analysis → save to Firestore → return */
export async function generateAnalysis(userId, forceRefresh = false) {
  if (!userId) throw new Error('User ID required');
  const today = getBSTDateString();

  if (!forceRefresh) {
    const cached = await getCachedAnalysis(userId);
    if (cached.analysis) return cached;
  }

  const context = await buildMentorContext(userId);
  const userMsg = buildAnalysisUserMessage(context);

  const aiResult = await callAiProxy([
    { role: 'system', content: MENTOR_SYSTEM_PROMPT },
    { role: 'user',   content: userMsg },
  ], 2200);

  const bMatch       = aiResult.text.match(/BUET.{0,40}(High|Medium|Low|Moderate|Critical|Strong|Weak)/i);
  const buetReadiness = bMatch ? bMatch[1] : 'Moderate';

  const analysisData = {
    text:        aiResult.text,
    generatedAt: new Date().toISOString(),
    buetReadiness,
    today,
    modelUsed:   aiResult.modelUsed || 'primary',
  };

  await setDoc(doc(db, 'users', userId, 'mentorAnalysis', today), analysisData, { merge: true });
  return { analysis: analysisData, cached: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat — Firestore Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getChatUsage(userId) {
  if (!userId) return { questionsUsed: 0, dailyLimit: null, limitSet: false };
  const today  = getBSTDateString();
  const snap   = await getDoc(doc(db, 'users', userId, 'mentorUsage', today));
  if (snap.exists()) {
    const d = snap.data();
    return { ...d, limitSet: d.dailyLimit !== undefined && d.dailyLimit !== null, date: today };
  }
  return { questionsUsed: 0, dailyLimit: null, limitSet: false, date: today };
}

export async function setDailyLimit(userId, limitVal) {
  if (!userId) throw new Error('User ID required');
  const today = getBSTDateString();
  await setDoc(doc(db, 'users', userId, 'mentorUsage', today), {
    dailyLimit:    limitVal,
    questionsUsed: 0,
    date:          today,
    limitSetAt:    new Date().toISOString(),
  }, { merge: true });
  return { success: true, dailyLimit: limitVal, questionsUsed: 0 };
}

export async function getChatHistory(userId, date) {
  if (!userId || !date) return { messages: [] };
  const snap = await getDoc(doc(db, 'users', userId, 'mentorChats', date));
  if (snap.exists()) {
    const d = snap.data();
    return { messages: d.messages || [], questionCount: d.questionCount || 0, date };
  }
  return { messages: [], questionCount: 0, date };
}

export async function getChatHistoryDates(userId) {
  if (!userId) return { dates: [] };
  const q    = query(collection(db, 'users', userId, 'mentorChats'), orderBy('updatedAt', 'desc'), limit(30));
  const snap = await getDocs(q);
  return {
    dates: snap.docs.map(d => ({
      date:          d.id,
      questionCount: d.data().questionCount || 0,
      topicSummary:  d.data().topicSummary  || '',
      updatedAt:     d.data().updatedAt,
    })),
  };
}

/** Send chat message → call AI → save to Firestore */
export async function sendChatMessage(userId, message, chatHistory = [], contextSummary = null) {
  if (!userId) throw new Error('User ID required');
  if (!message?.trim()) throw new Error('Message required');
  const today = getBSTDateString();

  // Check daily limit from Firestore
  const usageRef  = doc(db, 'users', userId, 'mentorUsage', today);
  const usageSnap = await getDoc(usageRef);
  const usageData = usageSnap.exists()
    ? usageSnap.data()
    : { questionsUsed: 0, dailyLimit: null };

  const isUnlimited = !usageData.dailyLimit || usageData.dailyLimit === 'unlimited';
  if (!isUnlimited && (usageData.questionsUsed || 0) >= Number(usageData.dailyLimit)) {
    const e = new Error('আজকের question limit শেষ।');
    e.status = 429;
    throw e;
  }

  // Build context snippet for AI
  let contextSnippet = 'Student context unavailable.';
  if (contextSummary) {
    const subjLines = Object.entries(contextSummary.subjects || {})
      .map(([s, d]) => `${s}: ${d.pct}% (${d.completed}/${d.total})`)
      .join(' | ');
    const delayed = (contextSummary.delayedChapters || [])
      .map(c => `${c.subject} Ch${c.num}`).join(', ');
    contextSnippet = `আজ: ${contextSummary.today} | Streak: ${contextSummary.streak}d
Progress: ${subjLines}
In-progress: ${delayed || 'None'}`;
    if (contextSummary.todayAnalysis) {
      contextSnippet += `\n\nআজকের Analysis Summary:\n${contextSummary.todayAnalysis.slice(0, 600)}`;
    }
  }

  const messages = [
    { role: 'system',    content: CHAT_SYSTEM_PROMPT },
    { role: 'user',      content: `━━━ Saiful-এর Current Status ━━━\n${contextSnippet}` },
    { role: 'assistant', content: 'তোমার সব data দেখলাম। কী জানতে চাও?' },
    ...chatHistory.slice(-12).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  const aiResult  = await callAiProxy(messages, 1000);
  const timestamp = new Date().toISOString();

  // Save chat to Firestore
  await setDoc(doc(db, 'users', userId, 'mentorChats', today), {
    messages: arrayUnion(
      { role: 'user',      content: message,         timestamp },
      { role: 'assistant', content: aiResult.text,   timestamp }
    ),
    questionCount: increment(1),
    updatedAt:     timestamp,
    date:          today,
  }, { merge: true });

  // Increment usage
  await setDoc(usageRef, { questionsUsed: increment(1), date: today }, { merge: true });

  return {
    response:      aiResult.text,
    questionsUsed: (usageData.questionsUsed || 0) + 1,
    dailyLimit:    usageData.dailyLimit,
    timestamp,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Summary for Chat (lightweight)
// ─────────────────────────────────────────────────────────────────────────────
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
    delayedChapters: fullContext.delayedChapters?.slice(0, 6),
    vocabStats:      fullContext.vocabStats,
    todayAnalysis:   todayAnalysisText,
  };
}
