// ─────────────────────────────────────────────────────────────────────────────
// Netlify Function: ai-mentor
// GET  → return cached daily analysis
// POST → generate new analysis (reads Firestore context, calls OpenRouter)
//
// ENV VARS (Netlify dashboard):
//   FIREBASE_SERVICE_ACCOUNT  — same JSON already used by send-push.js
//   OPENROUTER_API_KEY        — OpenRouter API key
// ─────────────────────────────────────────────────────────────────────────────

// ── Centralized Model Configuration ──────────────────────────────────────────
// Update PRIMARY_MODEL here when newer models become available on OpenRouter
// e.g. when 'openai/gpt-5.4-pro' or 'google/gemini-3.1-pro-preview' launch
const PRIMARY_MODEL  = 'openai/gpt-4.1';
const FALLBACK_MODEL = 'google/gemini-2.5-pro';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const PROJECT_ID     = 'zyntra-studyverse';

// ── Firebase Admin Init (singleton) ──────────────────────────────────────────
let _adminApp = null;
function getAdminApp() {
  if (_adminApp) return _adminApp;
  const { initializeApp, cert } = require('firebase-admin/app');
  const saStr = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saStr) throw new Error('FIREBASE_SERVICE_ACCOUNT env var not set');
  const sa = JSON.parse(saStr);
  _adminApp = initializeApp({ credential: cert(sa) }, 'ai-mentor-' + Date.now());
  return _adminApp;
}

function getDb() {
  const { getFirestore } = require('firebase-admin/firestore');
  return getFirestore(getAdminApp());
}

async function verifyToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No Bearer token');
  const { getAuth } = require('firebase-admin/auth');
  const decoded = await getAuth(getAdminApp()).verifyIdToken(authHeader.slice(7));
  return decoded.uid;
}

// ── BST Helper ────────────────────────────────────────────────────────────────
function getBSTDateString(date = new Date()) {
  const d = new Date(date.getTime() + 6 * 3600000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}
function getBSTYearMonth(date = new Date()) {
  const d = new Date(date.getTime() + 6 * 3600000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
}

// ── Context Builder ───────────────────────────────────────────────────────────
async function buildMentorContext(uid) {
  const db     = getDb();
  const today  = getBSTDateString();
  const ym     = getBSTYearMonth();
  const cutoff = getBSTDateString(new Date(Date.now() - 14 * 86400000));

  // ── Parallel Firestore reads ────────────────────────────────────────────────
  const [chapSnap, sessionSnap, checkinSnap, vocabSnap, routineSnap,
         revSnap, targetSnap, memorySnap] = await Promise.all([
    db.collection('chapters').where('userId','==',uid).get(),
    db.collection('users').doc(uid).collection('sessionLogs')
      .where('date','>=',cutoff).orderBy('date','desc').get(),
    db.collection('checkins').where('userId','==',uid).where('date','>=',cutoff).get(),
    db.collection('vocabulary').doc(uid).collection('words')
      .where('isArchived','==',false).get(),
    db.collection('users').doc(uid).collection('routineDefinitions').get(),
    db.collection('revisions').where('userId','==',uid)
      .orderBy('revisedAt','desc').limit(60).get(),
    db.collection('targets').doc(uid).collection('months').doc(ym).get(),
    db.collection('users').doc(uid).collection('mentorMemory').doc('current').get(),
  ]);

  // ── Process Chapters ────────────────────────────────────────────────────────
  const chapters = chapSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const chBySubj = {};
  for (const ch of chapters) {
    if (!chBySubj[ch.subject]) chBySubj[ch.subject] = [];
    chBySubj[ch.subject].push({
      num:             ch.chapterNumber,
      name:            ch.chapterName,
      status:          ch.status || 'not_started',
      completedTopics: ch.completedTopics || 0,
      totalTopics:     ch.totalTopics     || null,
    });
  }
  for (const s in chBySubj) chBySubj[s].sort((a,b) => a.num - b.num);

  const COMPLETED_STATUSES = ['completed','revised','revised_1','revised_2','revised_3','revised_4','revised_5'];

  const subjSummary = {};
  for (const [subj, chs] of Object.entries(chBySubj)) {
    const total      = chs.length;
    const completed  = chs.filter(c => COMPLETED_STATUSES.includes(c.status)).length;
    const inProgress = chs.filter(c => c.status === 'in_progress').length;
    const notStarted = chs.filter(c => c.status === 'not_started').length;
    const revised5   = chs.filter(c => c.status === 'revised_5').length;
    subjSummary[subj] = {
      total, completed, inProgress, notStarted, revised5,
      pct: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  // ── Session Logs (last 14 days) ─────────────────────────────────────────────
  const sessionsByDay = {};
  for (const d of sessionSnap.docs) {
    const s = d.data();
    if (!sessionsByDay[s.date]) sessionsByDay[s.date] = [];
    sessionsByDay[s.date].push({ subject: s.subject, status: s.status, duration: s.actualDurationMinutes || s.durationMinutes || 0 });
  }

  // ── Checkins ────────────────────────────────────────────────────────────────
  const checkinMap = {};
  for (const d of checkinSnap.docs) {
    const c = d.data();
    checkinMap[c.date] = { wokeUp: c.wokeUpAt6, preStudy: c.studiedBeforeCollege, subject: c.preCollegeSubject };
  }

  // ── Streak ──────────────────────────────────────────────────────────────────
  const routineDefs = routineSnap.docs.map(d => d.data());
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  let streak = 0;
  for (let i = 1; i <= 14; i++) {
    const d    = new Date(Date.now() - i * 86400000);
    const date = getBSTDateString(d);
    const day  = DAYS[new Date(date + 'T00:00:00+06:00').getUTCDay()];
    const logs = sessionsByDay[date] || [];
    if (logs.some(l => l.status === 'completed')) { streak++; continue; }
    if (routineDefs.some(r => r.isActive && (r.daysOfWeek||[]).includes(day))) break;
  }

  // ── Last 7 Days Performance ─────────────────────────────────────────────────
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d    = new Date(Date.now() - i * 86400000);
    const date = getBSTDateString(d);
    const logs = sessionsByDay[date] || [];
    const ci   = checkinMap[date] || {};
    last7.push({
      date,
      completed: logs.filter(l => l.status === 'completed').length,
      missed:    logs.filter(l => l.status === 'missed').length,
      subjects:  [...new Set(logs.filter(l => l.status === 'completed').map(l => l.subject))],
      wokeUp:    ci.wokeUp    || false,
      preStudy:  ci.preStudy  || false,
      totalMin:  logs.filter(l => l.status === 'completed').reduce((s,l) => s + l.duration, 0),
    });
  }

  // ── Vocabulary Stats ────────────────────────────────────────────────────────
  const words = vocabSnap.docs.map(d => d.data());
  const now   = new Date();
  const bstMidnight = new Date(getBSTDateString() + 'T00:00:00+06:00');
  const vocabStats = {
    total:      words.length,
    mastered:   words.filter(w => (w.masteryLevel || 0) >= 80).length,
    due:        words.filter(w => { const nr = w.nextReviewAt?.toDate?.(); return nr && nr <= now; }).length,
    avgMastery: words.length ? Math.round(words.reduce((s,w) => s + (w.masteryLevel||0), 0) / words.length) : 0,
    todayAdded: words.filter(w => { const ca = w.createdAt?.toDate?.(); return ca && ca >= bstMidnight; }).length,
  };

  // ── Revision Summary ────────────────────────────────────────────────────────
  const recentRevisions = revSnap.docs.slice(0, 20).map(d => {
    const r = d.data();
    return { subject: r.subject, chapterName: r.chapterName, revisionCount: r.revisionCount };
  });

  // ── Monthly Targets ─────────────────────────────────────────────────────────
  const targets = targetSnap.exists
    ? (targetSnap.data().chapters || []).map(t => ({
        subject: t.subject, chapter: t.chapterName, done: !!t.completed, difficulty: t.difficulty,
      }))
    : [];

  // ── Delayed/bottleneck chapters ─────────────────────────────────────────────
  const delayedChapters = chapters
    .filter(c => c.status === 'in_progress')
    .map(c => ({ subject: c.subject, num: c.chapterNumber, name: c.chapterName }));

  // ── Mentor Memory ───────────────────────────────────────────────────────────
  const mentorMemory = memorySnap.exists ? memorySnap.data() : null;

  // ── Deadline calculations ───────────────────────────────────────────────────
  const daysDiff = (targetDate) => Math.max(0, Math.round((new Date(targetDate).getTime() - Date.now()) / 86400000));

  return {
    today,
    studentName:        'Saiful',
    hscDeadline:        '2026-12-31',
    hscExam:            '2027-03-01',
    buetExam:           '2027-10-01',
    daysToHscDeadline:  daysDiff('2026-12-31'),
    daysToHscExam:      daysDiff('2027-03-01'),
    daysToButExam:      daysDiff('2027-10-01'),
    subjSummary,
    chBySubj,
    delayedChapters,
    streak,
    last7,
    vocabStats,
    targets,
    recentRevisions,
    mentorMemory,
  };
}

// ── Mentor System Prompt ──────────────────────────────────────────────────────
const MENTOR_SYSTEM_PROMPT = `তুমি Saiful-এর ব্যক্তিগত AI Mentor — একজন experienced BUET senior-এর মতো, যে সরাসরি, বাস্তবসম্মত, এবং কঠোরভাবে guide করে।

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

// ── Build User Message ────────────────────────────────────────────────────────
function buildAnalysisMessage(ctx) {
  const pcm = ['Physics','Chemistry','HigherMath'].map(s => {
    const sm = ctx.subjSummary[s];
    if (!sm) return `${s}: তথ্য নেই`;
    const chs      = ctx.chBySubj[s] || [];
    const inProg   = chs.filter(c => c.status === 'in_progress').map(c => `Ch${c.num} ${c.name}`).join(', ');
    const delayed  = chs.filter(c => c.status === 'not_started').slice(0,3).map(c => `Ch${c.num}`).join(',');
    return `${s}: ${sm.completed}/${sm.total} chapter শেষ (${sm.pct}%) | চলছে: ${inProg||'কিছু না'} | Not started: ${sm.notStarted}${delayed ? ` (next: Ch${delayed})` : ''}`;
  }).join('\n');

  const hsc = ['Botany','Zoology','Bangla','English','ICT'].map(s => {
    const sm = ctx.subjSummary[s];
    return sm ? `${s}: ${sm.completed}/${sm.total} (${sm.pct}%)` : null;
  }).filter(Boolean).join(' | ');

  const perf = ctx.last7.map(d =>
    `${d.date}: ✅${d.completed} ❌${d.missed}${d.subjects.length?` [${d.subjects.join(',')}]`:''} | ${d.wokeUp?'⏰6AM':'❌woke'} | ${d.preStudy?'📖Pre':''}${d.totalMin?` ${d.totalMin}min`:''}`
  ).join('\n');

  const tgt = ctx.targets.length
    ? ctx.targets.map(t => `${t.subject} ${t.chapter}: ${t.done?'✅':'⬜'} (${t.difficulty})`).join(' | ')
    : 'কোনো target নেই';

  const mem = ctx.mentorMemory
    ? `\n━━━ Previous Mentor Notes ━━━\n${JSON.stringify(ctx.mentorMemory, null, 2)}`
    : '';

  return `আজ: ${ctx.today} | Streak: ${ctx.streak} দিন
HSC Deadline: ${ctx.hscDeadline} → ${ctx.daysToHscDeadline} দিন বাকি
HSC Exam: ${ctx.hscExam} → ${ctx.daysToHscExam} দিন বাকি
BUET Exam: ${ctx.buetExam} → ${ctx.daysToButExam} দিন বাকি

━━━ BUET Core (PCM) ━━━
${pcm}

━━━ Delayed/In-Progress Chapters ━━━
${ctx.delayedChapters.map(c => `${c.subject} Ch${c.num}: ${c.name}`).join('\n')||'কোনো delay নেই'}

━━━ HSC Other Subjects ━━━
${hsc||'তথ্য নেই'}

━━━ Last 7 Days Performance ━━━
${perf}

━━━ This Month Targets ━━━
${tgt}

━━━ Vocabulary ━━━
Total: ${ctx.vocabStats.total} | Mastered: ${ctx.vocabStats.mastered} | Due review: ${ctx.vocabStats.due} | আজ added: ${ctx.vocabStats.todayAdded}
${mem}

উপরের সব data দেখে আজকের mentor analysis দাও।`;
}

// ── OpenRouter Call ───────────────────────────────────────────────────────────
async function callOpenRouter(messages, maxTokens = 1800) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const tryModel = async (model) => {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  'https://zyntra-studyverse.netlify.app',
        'X-Title':       'ZYNTRA StudyVerse AI Mentor',
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${model} ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const txt  = data.choices?.[0]?.message?.content;
    if (!txt) throw new Error('Empty response');
    return txt;
  };

  try                  { return await tryModel(PRIMARY_MODEL);  }
  catch (err) {
    console.warn(`[ai-mentor] Primary model failed: ${err.message}, trying fallback`);
    return await tryModel(FALLBACK_MODEL);
  }
}

// ── CORS headers ─────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

// ── Main Handler ──────────────────────────────────────────────────────────────
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  try {
    const uid = await verifyToken(event.headers.authorization || event.headers.Authorization || '');
    const db  = getDb();
    const today = getBSTDateString();

    // ── GET: return cached analysis ───────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      const snap = await db.collection('users').doc(uid).collection('mentorAnalysis').doc(today).get();
      if (!snap.exists) return { statusCode: 200, headers: CORS, body: JSON.stringify({ analysis: null, cached: false }) };
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ analysis: snap.data(), cached: true }) };
    }

    // ── POST: generate analysis ───────────────────────────────────────────────
    if (event.httpMethod === 'POST') {
      const body         = JSON.parse(event.body || '{}');
      const forceRefresh = !!body.forceRefresh;

      // Return cache unless forced
      if (!forceRefresh) {
        const snap = await db.collection('users').doc(uid).collection('mentorAnalysis').doc(today).get();
        if (snap.exists) return { statusCode: 200, headers: CORS, body: JSON.stringify({ analysis: snap.data(), cached: true }) };
      }

      // Build context & generate
      const ctx      = await buildMentorContext(uid);
      const userMsg  = buildAnalysisMessage(ctx);
      const text     = await callOpenRouter([
        { role: 'system', content: MENTOR_SYSTEM_PROMPT },
        { role: 'user',   content: userMsg },
      ], 1800);

      // Detect BUET readiness from response text
      const bMatch       = text.match(/BUET.{0,30}(High|Medium|Low|Moderate|Critical|Strong|Weak)/i);
      const buetReadiness = bMatch ? bMatch[1] : 'Moderate';

      const analysisData = {
        text,
        generatedAt: new Date().toISOString(),
        buetReadiness,
        today,
        modelUsed: PRIMARY_MODEL,
      };

      // Save to Firestore
      await db.collection('users').doc(uid).collection('mentorAnalysis').doc(today).set(analysisData);

      return { statusCode: 200, headers: CORS, body: JSON.stringify({ analysis: analysisData, cached: false }) };
    }

    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    console.error('[ai-mentor] error:', err);
    const status = err.message?.toLowerCase().includes('token') ? 401 : 500;
    return { statusCode: status, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
