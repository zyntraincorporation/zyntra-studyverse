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
  getWeeklyStats, getDueRevisions, getTargets,
  getActiveMentorMemories, batchGetTopicProgress,
} from '../firebase/db';
import { getBSTDateString, getBSTYearMonth } from './bst';
import { SYLLABUS, HSC_SUBJECT_KEYS, BUET_SUBJECT_KEYS } from '../data/syllabus';
import { calculateSubjectProgress, calculateChapterProgress } from './progressEngine';
import { useTopicStore } from '../store/useTopicStore';

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

━━━ তোমার কাছে থাকা ডেটা (Data Provided) ━━━
তোমার কাছে Saiful-এর নিম্নোক্ত তথ্যগুলো দেওয়া আছে:
• সার্বিক সিলেবাস ও BUET PCM প্রগ্রেস %
• প্রতিটা বিষয়ের (13টি বিষয়) প্রগ্রেস %, মোট ও সম্পন্ন অধ্যায়
• প্রতিটি বিষয়ের প্রতিটা অধ্যায়ের নাম, নম্বর, প্রগ্রেস % এবং স্ট্যাটাস (সম্পন্ন / চলমান / শুরু হয়নি)
• যেসব অধ্যায়ে এখন কাজ চলছে (In-Progress / Delayed)
• রিভিশন বাকি থাকা অধ্যায় (Revision Due)
• গত ৭ দিনের ডেইলি স্টাডি সেশন, অভ্যাস ও স্ট্রিক
• চলতি মাসের নির্ধারিত টার্গেট
• Saiful-এর নিজের Study Guidelines (সে নিজে add করা নিয়মনীতি ও রণকৌশল — সর্বোচ্চ গুরুত্ব)
• Saiful-এর Custom Memories

━━━ ডেটা ব্যবহারের কঠোর নিয়ম (Zero Hallucination Rules) ━━━
১. সম্পূর্ণ বাংলায় কথা বলবে। Subject name, number, % ছাড়া অপ্রয়োজনীয় English ব্যবহার করবে না।
২. নিচে দেওয়া Live Data হুবহু অনুসরণ করবে — নিজে থেকে কোনো মনগড়া % বা কাল্পনিক সংখ্যা বলবে না।
৩. ডেটায় যে অধ্যায় যে পেপারে (১ম পত্র / ২য় পত্র) আছে, সেটাই মানবে। কখনোই ১ম ও ২য় পত্রের অধ্যায় উল্টাপাল্টা করবে না (যেমন: 'বহুপদী ও বহুপদী সমীকরণ' উচ্চতর গণিত ২য় পত্রে, 'যোগজীকরণ' উচ্চতর গণিত ১ম পত্রে)।
৪. কোনো অধ্যায় যদি ০% (শুরু হয়নি) থাকে, তবে সরাসরি বলবে যে "এই অধ্যায়টি এখনও শুরু করোনি (০%)"। কখনোই কোনো কাল্পনিক ৫%, ১০% বা ১৫% বানিয়ে বলবে না।
৫. ডেটা না থাকলে: "এই তথ্য আমার কাছে নেই।" বলবে।
৬. Saiful-এর Study Guidelines দেওয়া থাকলে তা ১০০% গুরুত্ব ও গভীরতার সাথে বিশ্লেষণ করবে। প্রতিটি পরামর্শ ও অগ্রাধিকার Saiful-এর গাইডলাইনের স্ট্র্যাটেজির সাথে পুরোপুরি মিল রেখে তৈরি করবে।
৭. Saiful-এর বর্তমান প্রগ্রেস ফেজ (কোন বিষয়ে কতটুকু এগিয়েছে, কোথায় পিছিয়ে বা আটকে আছে, কতদিন বাকি আছে) গভীরভাবে ভেবেচিন্তে (Deep Analytical Thinking) আজকের জন্য সবচেয়ে উপযোগী, বাস্তবসম্মত ও লক্ষ্যভিত্তিক দিকনির্দেশনা দেবে।
৮. Sugarcoating নেই। কঠিন সত্য হলে সেটাই সরাসরি বলবে।
৯. Saiful মন খুলে কথা বলতে পারবে তোমার সাথে। তুমি তার সিনিয়র ভাই ও মেন্টর।
১০. কখনোই Markdown Table (| col1 | col2 |) ব্যবহার করবে না। চার্ট, রুটিন বা লিস্টের জন্য সবসময় বুলেট পয়েন্ট ও টাইমলাইন ফরম্যাট ব্যবহার করবে।

━━━ Analysis Format (relevant section-ই শুধু দেখাবে) ━━━
🎯 **আজকের Priority** — সবচেয়ে জরুরি ১-২টি কাজ, কেন জরুরি (data দিয়ে)
⚠️ **সবচেয়ে বড় Risk** — এখন কোন subject/chapter সবচেয়ে বিপজ্জনক, কেন
📚 **আজ কী পড়বে** — Specific: Subject → Chapter → কতক্ষণ
🔁 **Revision** — Due থাকলে আজ কোনটা করবে
🏆 **যা ভালো যাচ্ছে** — Data দিয়ে প্রমাণ করো। না থাকলে এই section বাদ।
🎓 **BUET Strategy** — PCM balance, readiness, gap analysis
⏱ **Suggested Time** — Physics: Xm | Chemistry: Xm | Math: Xm | HSC Others: Xm`;

// ─────────────────────────────────────────────────────────────────────────────
// CHAT SYSTEM PROMPT — Conversational Mode
// ─────────────────────────────────────────────────────────────────────────────
export const CHAT_SYSTEM_PROMPT = `তুমি Saiful-এর AI Mentor। তুমি BUET-এ পড়ছ, নিজে অনেক কষ্ট করে চান্স পেয়েছ।

Interactive chat mode। Saiful সরাসরি প্রশ্ন করছে।

━━━ Saiful-এর Goal ━━━
১. HSC Golden A+ (সব বিষয়ে — Bangla, English, ICT সহ)
২. BUET Admission October 2027

━━━ ডেটা ব্যবহারের কঠোর নিয়ম (Zero Hallucination - ১০০% আসল ডেটা) ━━━
১. সম্পূর্ণ বাংলায় কথা বলবে।
২. তোমাকে নিচে 'Saiful-এর Real-Time Study Data' ব্লকে যে ডেটা দেওয়া হয়েছে, সেটাই একমাত্র সত্য।
৩. ডেটায় প্রতিটি বিষয়ের এবং অধ্যায়ের যে সঠিক নাম ও % দেওয়া আছে, হুবহু সেই সংখ্যা ও স্ট্যাটাস বলবে। নিজে থেকে কোনো প্রগ্রেস %, কোনো কাল্পনিক গড় %, বা কোনো ভুয়া চ্যাপ্টারের তথ্য বানাবে না।
৪. ১ম পত্র ও ২য় পত্রের অধ্যায় একদম আলাদা রাখবে। ডেটায় যে অধ্যায় যে বিষয়ে আছে, সেটা সেভাবেই বলবে (যেমন: 'বহুপদী ও বহুপদী সমীকরণ' উচ্চতর গণিত ২য় পত্রে, 'যোগজীকরণ' উচ্চতর গণিত ১ম পত্রে)।
৫. ডেটায় কোনো অধ্যায়ে যদি 0% বা 'শুরু হয়নি' থাকে, তবে স্পষ্ট করে বলবে যে "এই অধ্যায়টি এখনও শুরু করোনি (0%)"। কখনোই ৫%, ১০% বা ১৫% বানিয়ে বলবে না।
৬. কোনো নির্দিষ্ট তথ্য ডেটায় না থাকলে বলবে: "এই তথ্যটি আমার কাছে নেই।"
৭. Saiful-এর Guidelines থাকলে সেগুলো সবসময় মেনে চলবে ও পরামর্শ দেওয়ার সময় প্রয়োগ করবে।
৮. Saiful freely কথা বলতে পারবে। তুমি তার সিনিয়র ভাই, বন্ধু ও কঠোর মেন্টর।
৯. সে একটা বিষয় করতে চাইলে কিন্তু অন্যটা urgent হলে স্পষ্ট করে গাইড করবে।
১০. কখনোই পাইপ দিয়ে Markdown Table (| col1 | col2 |) তৈরি করবে না, কারণ চ্যাটে টেবিল ভেঙে যায়। রুটিন, প্ল্যান বা তালিকার জন্য সবসময় সুন্দর বুলেট পয়েন্ট (•), স্পষ্ট টাইমলাইন (যেমন: ⏰ ৮:০০ AM — কাজ) অথবা ক্রমানুযায়ী লিস্ট ব্যবহার করবে।`;

// ─────────────────────────────────────────────────────────────────────────────
// Context Builder
// ─────────────────────────────────────────────────────────────────────────────
export async function buildMentorContext(userId) {
  const [weekly, revisions, targets, allMentorData] = await Promise.all([
    getWeeklyStats(userId, 7),
    getDueRevisions(userId),
    getTargets(userId, getBSTYearMonth()),
    getActiveMentorMemories(userId),
  ]);

  // Separate guidelines (type='guideline') from memories (type='memory' or no type)
  const activeGuidelines = (allMentorData || []).filter(m => m.type === 'guideline');
  const activeMemories   = (allMentorData || []).filter(m => m.type !== 'guideline');

  const today = getBSTDateString();

  // Fetch or construct topic progress across all chapters
  let topicMaps = {};
  try {
    const storeMaps = useTopicStore?.getState?.()?.topicMaps || {};
    if (Object.keys(storeMaps).length > 0) {
      topicMaps = { ...storeMaps };
    }
  } catch {
    // fallback if outside React/Zustand
  }

  if (Object.keys(topicMaps).length === 0) {
    try {
      const docIds = [];
      HSC_SUBJECT_KEYS.forEach(subjKey => {
        const subj = SYLLABUS[subjKey];
        (subj?.chapters || []).forEach(ch => {
          docIds.push(`${userId}_${subjKey}_${ch.chapterNumber}`);
        });
      });
      const fetched = await batchGetTopicProgress(docIds);
      topicMaps = { ...topicMaps, ...fetched };
    } catch (e) {
      console.warn('[mentorApi] topic fetch failed, falling back to empty map:', e);
    }
  }

  // Process all subjects from master static SYLLABUS
  const subjects = {};
  const chBySubj = {};

  HSC_SUBJECT_KEYS.forEach(subjKey => {
    const subjData = SYLLABUS[subjKey];
    const sp = calculateSubjectProgress(subjKey, topicMaps);
    subjects[subjKey] = {
      name: subjData?.name,
      shortName: subjData?.shortName,
      total: sp.totalChapters,
      completed: sp.completedChapters,
      inProgress: sp.totalChapters - sp.completedChapters,
      notStarted: sp.progressPct === 0 ? sp.totalChapters : 0,
      pct: sp.progressPct,
      unitsDone: sp.completedUnits,
      unitsTotal: sp.totalUnits,
    };

    chBySubj[subjKey] = (subjData?.chapters || []).map(ch => {
      const chDocId = `${userId}_${subjKey}_${ch.chapterNumber}`;
      const chProg = calculateChapterProgress(ch, topicMaps[chDocId] || topicMaps[ch.id] || topicMaps[ch.legacyDocId] || {});
      return {
        num: ch.chapterNumber,
        name: ch.chapterName,
        status: chProg.status,
        progressPct: chProg.progressPct,
        completedTopics: chProg.completedUnits,
        totalTopics: chProg.totalUnits,
      };
    });
  });

  // Delayed / in-progress chapters
  const delayedChapters = [];
  Object.entries(chBySubj).forEach(([subj, chs]) => {
    chs.forEach(c => {
      if (c.status === 'in_progress') {
        delayedChapters.push({ subject: subj, num: c.num, name: c.name, pct: c.progressPct });
      }
    });
  });

  // Monthly targets
  const thisMonthTargets = (targets?.chapters || []).map(t => ({
    subject: t.subject, chapter: t.chapterName, done: !!t.completed, difficulty: t.difficulty,
  }));

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
    thisMonthTargets,
    revisionsDue,
    activeMemories,    // Layer 3 — user custom notes
    activeGuidelines,  // Layer 2.5 — study guidelines (high priority)
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Guidelines Context Formatter (Layer 2.5 — High Priority)
// Guidelines are study rules/strategies the user adds from guideline videos.
// These have HIGHER priority than memories and shape AI advice behavior.
// ─────────────────────────────────────────────────────────────────────────────
export function formatGuidelinesContext(guidelines = [], maxChars = Infinity) {
  const active = (guidelines || []).filter(g => g.active !== false);
  if (!active.length) return '';

  let usedChars = 0;
  const itemParts = [];

  for (let i = 0; i < active.length; i++) {
    const g = active[i];
    const header  = g.title ? `【${g.title}】` : `【Study Guideline #${i + 1}】`;
    let   body    = g.content.trim();

    // For chat mode: truncate individual guideline if total budget exceeded
    if (maxChars !== Infinity) {
      const remaining = maxChars - usedChars - header.length - 4;
      if (remaining <= 50) {
        // Budget exhausted — note remaining guidelines count
        const skipped = active.length - i;
        itemParts.push(`[...আরও ${skipped}টি guideline আছে — Analysis tab-এ সব দেখা যাবে]`);
        break;
      }
      if (body.length > remaining) {
        body = body.slice(0, remaining - 3) + '…';
      }
    }

    const item = `${header}\n${body}`;
    usedChars += item.length + 2;
    itemParts.push(item);
  }

  if (!itemParts.length) return '';

  return (
    `\n━━━ Saiful-এর Study Guidelines (পড়াশোনার নিয়মনীতি ও কৌশল) — HIGH PRIORITY ━━━\n` +
    `(এগুলো Saiful তার guideline videos/notes থেকে নিজে add করেছে। এই নিয়মগুলো সবসময় মেনে চলো ও apply করো।)\n\n` +
    itemParts.join('\n\n')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Memory Context Formatter
// Formats active user memories into a clearly labeled block for AI injection.
// ─────────────────────────────────────────────────────────────────────────────
export function formatMemoriesContext(memories = []) {
  const active = (memories || []).filter(m => m.active !== false);
  if (!active.length) return '';

  const items = active.map((m, i) => {
    const header = m.title ? `[${m.title}]` : `[Custom Instruction #${i + 1}]`;
    return `${header}\n${m.content.trim()}`;
  }).join('\n\n');

  return (
    `\n━━━ Saiful-এর Custom Instructions ও Memories (Active) ━━━\n` +
    `(এগুলো Saiful নিজে manually add করেছে — তোমার analysis ও chat-এ এই context বিবেচনায় নাও।)\n\n` +
    items
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Overall Progress Formatter
// ─────────────────────────────────────────────────────────────────────────────
export function formatOverallProgress(ctx) {
  if (!ctx || !ctx.subjects) return 'তথ্য নেই';

  let totalChapters = 0;
  let completedChapters = 0;
  let totalUnits = 0;
  let completedUnits = 0;

  let pcmTotalChapters = 0;
  let pcmCompletedChapters = 0;
  let pcmTotalUnits = 0;
  let pcmCompletedUnits = 0;

  HSC_SUBJECT_KEYS.forEach(key => {
    const s = ctx.subjects[key];
    if (!s) return;
    totalChapters += s.total || 0;
    completedChapters += s.completed || 0;
    totalUnits += s.unitsTotal || 0;
    completedUnits += s.unitsDone || 0;

    if (BUET_SUBJECT_KEYS.includes(key)) {
      pcmTotalChapters += s.total || 0;
      pcmCompletedChapters += s.completed || 0;
      pcmTotalUnits += s.unitsTotal || 0;
      pcmCompletedUnits += s.unitsDone || 0;
    }
  });

  const overallPct = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;
  const pcmPct = pcmTotalUnits > 0 ? Math.round((pcmCompletedUnits / pcmTotalUnits) * 100) : 0;

  return `• HSC সর্বমোট সিলেবাস প্রগ্রেস: ${overallPct}% সম্পন্ন (${completedChapters}/${totalChapters} অধ্যায়, ${completedUnits}/${totalUnits} টপিক)
• BUET Core (PCM) প্রগ্রেস: ${pcmPct}% সম্পন্ন (${pcmCompletedChapters}/${pcmTotalChapters} অধ্যায়, ${pcmCompletedUnits}/${pcmTotalUnits} টপিক)`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Detailed Subject & Chapter-wise Progress Formatter (Daily Analysis Mode)
// ─────────────────────────────────────────────────────────────────────────────
export function formatDetailedProgress(ctx) {
  if (!ctx || !ctx.subjects || !ctx.chBySubj) return 'তথ্য নেই';

  const lines = [];

  HSC_SUBJECT_KEYS.forEach(subjKey => {
    const s = ctx.subjects[subjKey];
    const chs = ctx.chBySubj[subjKey] || [];
    if (!s) return;

    const subjHeader = `📌 ${s.name || subjKey} [${s.pct}% সম্পন্ন | অধ্যায়: ${s.completed}/${s.total} | টপিক: ${s.unitsDone}/${s.unitsTotal}]`;
    const chLines = chs.map(c => {
      const statusText = c.status === 'completed' ? 'সম্পন্ন' : c.status === 'in_progress' ? 'চলমান' : 'শুরু হয়নি';
      return `   Ch ${c.num}. ${c.name}: ${c.progressPct}% (${statusText})`;
    }).join('\n');

    lines.push(`${subjHeader}\n${chLines}`);
  });

  return lines.join('\n\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Progress Context — Explicit, Zero-Hallucination format for AI chat
// PCMB+ICT: Full explicit list of ALL chapters with real Name, %, and Status
// Bangla/English: subject-level %
// ─────────────────────────────────────────────────────────────────────────────
const PCMB_ICT_KEYS  = ['Physics1', 'Physics2', 'Chemistry1', 'Chemistry2', 'Math1', 'Math2', 'Botany', 'Zoology', 'ICT'];
const LITE_KEYS      = ['English1', 'English2', 'Bangla1', 'Bangla2'];

export function buildChatProgressContext(ctx) {
  if (!ctx || !ctx.subjects) return 'তথ্য নেই';

  const overall = formatOverallProgress(ctx);
  const lines   = [];

  // PCMB + ICT — ALL chapters with Number, Real Name, and exact %
  PCMB_ICT_KEYS.forEach(key => {
    const s   = ctx.subjects[key];
    const chs = (ctx.chBySubj?.[key] || []);
    if (!s) return;

    const chParts = chs.map(c => {
      const statusText = c.progressPct === 100 ? 'সম্পন্ন' : c.progressPct > 0 ? 'চলমান' : '০% শুরু হয়নি';
      return `Ch${c.num} ${c.name}: ${c.progressPct}% (${statusText})`;
    }).join(' | ');

    lines.push(`📌 ${s.name || key} [সর্বমোট প্রগ্রেস: ${s.pct}% | সম্পন্ন: ${s.completed}/${s.total} অধ্যায়]:\n   ${chParts || 'কোনো অধ্যায় নেই'}`);
  });

  // Bangla + English — subject-level only
  lines.push('');
  lines.push('📌 অন্যান্য বিষয় (HSC General):');
  LITE_KEYS.forEach(key => {
    const s = ctx.subjects[key];
    if (!s) return;
    lines.push(`• ${s.name || key}: ${s.pct}% সম্পন্ন (${s.completed}/${s.total} অধ্যায়)`);
  });

  return `${overall}\n\n━━━ Subject & Chapter-wise Real Progress (ডাটাবেজ থেকে আসল প্রগ্রেস) ━━━\n${lines.join('\n')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build Analysis User Message
// ─────────────────────────────────────────────────────────────────────────────
function buildAnalysisUserMessage(ctx) {
  const overall = formatOverallProgress(ctx);
  const detailed = formatDetailedProgress(ctx);

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
    .map(c => `${c.subject} Ch${c.num}: "${c.name}" (${c.pct}%)`)
    .join('\n') || 'কোনো delay নেই';

  // Revisions due
  const revDue = (ctx.revisionsDue || []).length
    ? ctx.revisionsDue.map(r => `${r.subject} "${r.chapterName}" (revision #${r.count + 1})`).join(', ')
    : 'কোনো revision due নেই';

  // Monthly targets
  const tgt = (ctx.thisMonthTargets || []).length
    ? ctx.thisMonthTargets.map(t => `${t.subject} "${t.chapter}": ${t.done ? '✅' : '⬜'} (${t.difficulty || 'Normal'})`).join(' | ')
    : 'কোনো target নেই';

  // Layer 2.5 — Study Guidelines (injected with highest priority, before data)
  const guidelinesBlock = formatGuidelinesContext(ctx.activeGuidelines);

  // Layer 3 — Active user memories
  const memoriesBlock = formatMemoriesContext(ctx.activeMemories);

  return `আজকের তারিখ: ${ctx.today} | Streak: ${ctx.streak} দিন
HSC Prep Deadline: ${ctx.hscDeadline} → ${ctx.daysToHscDeadline} দিন বাকি
HSC Exam: ${ctx.hscExam} → ${ctx.daysToHscExam} দিন বাকি
BUET Exam: ${ctx.buetExam} → ${ctx.daysToButExam} দিন বাকি${guidelinesBlock}${memoriesBlock}

━━━ Overall Progress (সার্বিক অগ্রগতি) ━━━
${overall}

━━━ Subject & Chapter-wise Detailed Progress (সব বিষয় ও অধ্যায়ের প্রগ্রেস) ━━━
${detailed}

━━━ Currently In-Progress Chapters (চলমান অধ্যায়সমূহ) ━━━
${delayed}

━━━ Revision Due (রিভিশন বাকি) ━━━
${revDue}

━━━ Last 7 Days Performance & Habits (গত ৭ দিনের রুটিন ও সেশন) ━━━
${perf}

━━━ This Month Targets (চলতি মাসের লক্ষ্য) ━━━
${tgt}

top-level data analysis: উপরে Saiful-এর যে Study Guidelines দেওয়া আছে, সেগুলো অত্যন্ত গভীরভাবে ও সর্বোচ্চ গুরুত্ব সহকারে বিবেচনা করো। Saiful-এর বর্তমান প্রগ্রেস ফেজ (কোন বিষয়ে কতটুকু অগ্রগতি, কোথায় আটকে আছে, স্ট্রিক কেমন) গভীরভাবে ভেবেচিন্তে (Deep Thinking) গাইডলাইনের রণকৌশল অনুসারে আজকের জন্য বিস্তারিত, বাস্তবসম্মত ও কঠোর দৈনিক রিপোর্ট তৈরি করো।`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Call Netlify AI Proxy
// ─────────────────────────────────────────────────────────────────────────────
async function callAiProxy(messages, maxTokens = 2500) {
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
  ], 2500);

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

/** Send chat message → call AI → save to Firestore
 * @param {Array} activeGuidelines - items with type='guideline' (high priority rules)
 * @param {Array} activeMemories   - items with type='memory' (custom notes)
 */
export async function sendChatMessage(
  userId,
  message,
  chatHistory = [],
  contextSummary = null,
  activeMemories = [],
  activeGuidelines = [],
) {
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

  // Ensure live real-time context is ALWAYS loaded
  let effectiveContext = contextSummary;
  if (!effectiveContext || !effectiveContext.subjects || Object.keys(effectiveContext.subjects).length === 0) {
    try {
      effectiveContext = await buildMentorContext(userId);
    } catch (err) {
      console.warn('[mentorApi] context build fallback error:', err);
    }
  }

  // Build LIGHTWEIGHT, ZERO-HALLUCINATION context for chat
  let contextSnippet = 'Student context unavailable.';
  if (effectiveContext && effectiveContext.subjects) {
    const progressBlock = buildChatProgressContext(effectiveContext);

    const delayed = (effectiveContext.delayedChapters || [])
      .map(c => `${c.subject} Ch${c.num}: "${c.name}" (${c.pct}%)`).join('\n') || 'কোনো chapter আটকে নেই';

    const revDue = (effectiveContext.revisionsDue || []).length
      ? effectiveContext.revisionsDue.map(r => `${r.subject} "${r.chapterName}" (rev #${r.count + 1})`).join(', ')
      : 'কোনো revision due নেই';

    contextSnippet = `আজকের তারিখ: ${effectiveContext.today || today} | Streak: ${effectiveContext.streak || 0} দিন
HSC Deadline: ${effectiveContext.daysToHscDeadline ?? 'N/A'} দিন বাকি | BUET Exam: ${effectiveContext.daysToButExam ?? 'N/A'} দিন বাকি

${progressBlock}

━━━ চলমান / আটকে থাকা অধ্যায় ━━━
${delayed}

━━━ Revision Due ━━━
${revDue}`;
  }

  // Layer 2.5 — Study Guidelines (high priority, injected before memories)
  const guidelinesBlock = formatGuidelinesContext(
    activeGuidelines.length ? activeGuidelines : (effectiveContext?.activeGuidelines || []),
    1500   // chat cap — prevents timeout with large admission guidelines
  );

  // Layer 3 — Active User Memories
  const memoriesBlock = formatMemoriesContext(
    activeMemories.length ? activeMemories : (effectiveContext?.activeMemories || [])
  );

  const messages = [
    { role: 'system',    content: CHAT_SYSTEM_PROMPT },
    { role: 'user',      content: `━━━ Saiful-এর Real-Time Study Data (DATABASE LIVE SYNC - STRICT TRUTH) ━━━\n[নিয়ম: নিচের ডেটাই ডাটাবেজের ১০০% আসল ডেটা। প্রতিটি বিষয়ে প্রতিটি অধ্যায়ের যে নাম ও % দেওয়া আছে, হুবহু তাই বলবে। মনগড়া কোনো % বা ১ম ও ২য় পত্রের অধ্যায় গুলিয়ে ফেলবে না। যা ০% তা ০% বলবে। যা শুরু হয়নি তা শুরু হয়নি বলবে।]\n\n${contextSnippet}${guidelinesBlock}${memoriesBlock}` },
    { role: 'assistant', content: 'তোমার পুরো সিলেবাসের সার্বিক ও অধ্যায়ভিত্তিক সঠিক প্রগ্রেস, guidelines এবং memories দেখলাম। বলো Saiful, কী নিয়ে আলোচনা করবে?' },
    ...chatHistory.slice(-16).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  const aiResult  = await callAiProxy(messages, 2000);

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
// Context Summary for Chat
// ─────────────────────────────────────────────────────────────────────────────
export function buildChatContextSummary(fullContext, todayAnalysisText = null) {
  if (!fullContext) return null;
  return {
    ...fullContext,
    todayAnalysis: todayAnalysisText,
  };
}
