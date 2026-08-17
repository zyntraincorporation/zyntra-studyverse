// ─────────────────────────────────────────────────────────────────────────────
// Netlify Function: ai-mentor-chat
// Handles mentor chat with server-side daily question limit enforcement
//
// GET  ?action=usage               → today's limit status
// GET  ?date=YYYY-MM-DD            → chat history for a specific date
// GET  ?action=history             → list of all dates with chat sessions
// POST {action:'set-limit', limit} → set today's question limit
// POST {action:'chat', message, chatHistory, contextSummary} → send a message
//
// ENV VARS:
//   FIREBASE_SERVICE_ACCOUNT  — Firebase service account JSON (same as send-push)
//   OPENROUTER_API_KEY        — OpenRouter API key
// ─────────────────────────────────────────────────────────────────────────────

// ── Centralized Model Configuration ──────────────────────────────────────────
const PRIMARY_MODEL  = 'openai/gpt-4.1';
const FALLBACK_MODEL = 'google/gemini-2.5-pro';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ── Firebase Admin (singleton — shared across warm function instances) ────────
let _adminApp = null;
function getAdminApp() {
  if (_adminApp) return _adminApp;
  const { initializeApp, getApps, cert } = require('firebase-admin/app');
  const existing = getApps().find(a => a.name === 'ai-mentor-chat');
  if (existing) { _adminApp = existing; return _adminApp; }
  const saStr = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saStr) throw new Error('FIREBASE_SERVICE_ACCOUNT env var not set');
  _adminApp = initializeApp({ credential: cert(JSON.parse(saStr)) }, 'ai-mentor-chat');
  return _adminApp;
}

function getDb() {
  const { getFirestore, FieldValue } = require('firebase-admin/firestore');
  return { db: getFirestore(getAdminApp()), FieldValue };
}

async function verifyToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Authentication required');
  const { getAuth } = require('firebase-admin/auth');
  const decoded = await getAuth(getAdminApp()).verifyIdToken(authHeader.slice(7));
  return decoded.uid;
}

// ── BST Helper ────────────────────────────────────────────────────────────────
function getBSTDateString(date = new Date()) {
  const d = new Date(date.getTime() + 6 * 3600000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

const ok   = (body) => ({ statusCode: 200, headers: CORS, body: JSON.stringify(body) });
const err  = (msg, status = 500) => ({ statusCode: status, headers: CORS, body: JSON.stringify({ error: msg }) });

// ── Mentor Chat System Prompt ─────────────────────────────────────────────────
const CHAT_SYSTEM_PROMPT = `তুমি Saiful-এর ব্যক্তিগত AI Mentor — একজন experienced BUET senior।
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

// ── OpenRouter Call ───────────────────────────────────────────────────────────
async function callOpenRouter(messages, maxTokens = 900) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const tryModel = async (model) => {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  'https://zyntra-studyverse.netlify.app',
        'X-Title':       'ZYNTRA StudyVerse AI Mentor Chat',
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
  catch (primErr) {
    console.warn(`[ai-chat] Primary model failed: ${primErr.message}`);
    return await tryModel(FALLBACK_MODEL);
  }
}

// ── Build Chat Context Message ────────────────────────────────────────────────
function buildChatContextMessage(contextSummary) {
  if (!contextSummary) return 'Student context not provided.';

  const { today, streak, subjects, vocabStats, delayedChapters, todayAnalysis } = contextSummary;

  const subjLines = Object.entries(subjects || {}).map(([s, d]) =>
    `${s}: ${d.pct}% (${d.completed}/${d.total}) | In-progress: ${d.inProgress}`
  ).join('\n');

  const delayed = (delayedChapters || []).map(c => `${c.subject} Ch${c.num} ${c.name}`).join(', ');

  let ctx = `━━━ Current Student Context (${today}) ━━━
Streak: ${streak || 0} দিন

Subject Progress:
${subjLines || 'No data'}

Delayed/In-progress chapters: ${delayed || 'None'}

Vocabulary: Total ${vocabStats?.total || 0} | Mastered ${vocabStats?.mastered || 0} | Due ${vocabStats?.due || 0} | Today added ${vocabStats?.todayAdded || 0}`;

  if (todayAnalysis) {
    ctx += `\n\n━━━ Today's Mentor Analysis (summary) ━━━\n${todayAnalysis.slice(0, 800)}...`;
  }

  return ctx;
}

// ── Main Handler ──────────────────────────────────────────────────────────────
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  try {
    const uid    = await verifyToken(event.headers.authorization || event.headers.Authorization || '');
    const { db, FieldValue } = getDb();
    const today  = getBSTDateString();
    const params = event.queryStringParameters || {};

    // ── GET requests ─────────────────────────────────────────────────────────
    if (event.httpMethod === 'GET') {

      // Get today's usage/limit status
      if (params.action === 'usage' || !params.action && !params.date) {
        const snap = await db.collection('users').doc(uid).collection('mentorUsage').doc(today).get();
        if (!snap.exists) return ok({ questionsUsed: 0, dailyLimit: null, limitSet: false, date: today });
        return ok({ ...snap.data(), date: today, limitSet: true });
      }

      // List all dates with chat history
      if (params.action === 'history') {
        const snap = await db.collection('users').doc(uid).collection('mentorChats')
          .orderBy('updatedAt', 'desc').limit(30).get();
        const dates = snap.docs.map(d => ({
          date:          d.id,
          questionCount: d.data().questionCount || 0,
          topicSummary:  d.data().topicSummary  || '',
          updatedAt:     d.data().updatedAt,
        }));
        return ok({ dates });
      }

      // Get specific date's chat history
      if (params.date) {
        const snap = await db.collection('users').doc(uid).collection('mentorChats').doc(params.date).get();
        if (!snap.exists) return ok({ messages: [], date: params.date });
        const data = snap.data();
        return ok({ messages: data.messages || [], date: params.date, questionCount: data.questionCount || 0 });
      }

      return err('Invalid GET request', 400);
    }

    // ── POST requests ─────────────────────────────────────────────────────────
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      // ── Set daily limit ───────────────────────────────────────────────────
      if (body.action === 'set-limit') {
        const limit = body.limit; // number or 'unlimited'
        if (limit === null || limit === undefined) return err('Missing limit', 400);

        await db.collection('users').doc(uid).collection('mentorUsage').doc(today).set({
          dailyLimit:   limit,
          questionsUsed: 0,
          date:         today,
          limitSetAt:   new Date().toISOString(),
        }, { merge: true });

        return ok({ success: true, dailyLimit: limit, questionsUsed: 0 });
      }

      // ── Send a chat message ───────────────────────────────────────────────
      if (body.action === 'chat') {
        const { message, chatHistory = [], contextSummary } = body;
        if (!message?.trim()) return err('Missing message', 400);

        // ── Atomic limit check + increment ───────────────────────────────────
        const usageRef = db.collection('users').doc(uid).collection('mentorUsage').doc(today);
        const usageSnap = await usageRef.get();
        const usage     = usageSnap.exists ? usageSnap.data() : { questionsUsed: 0, dailyLimit: null };

        if (usage.dailyLimit !== 'unlimited' && usage.dailyLimit !== null) {
          if ((usage.questionsUsed || 0) >= Number(usage.dailyLimit)) {
            return err('Daily question limit reached', 429);
          }
        }

        // ── Build messages for OpenRouter ─────────────────────────────────────
        const contextMsg = buildChatContextMessage(contextSummary);
        const messages   = [
          { role: 'system', content: CHAT_SYSTEM_PROMPT },
          { role: 'user',   content: contextMsg },
          { role: 'assistant', content: 'ঠিক আছে, আমি তোমার সব progress দেখছি। কী জানতে চাও?' },
          // Include previous messages in this session (last 10 for context)
          ...chatHistory.slice(-10).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: message },
        ];

        const aiResponse = await callOpenRouter(messages, 900);

        // ── Atomic increment of questionsUsed ─────────────────────────────────
        await usageRef.set({
          questionsUsed: FieldValue.increment(1),
          date:          today,
        }, { merge: true });

        // ── Save chat to Firestore ─────────────────────────────────────────────
        const chatRef  = db.collection('users').doc(uid).collection('mentorChats').doc(today);
        const timestamp = new Date().toISOString();
        const newMessages = [
          { role: 'user',      content: message,    timestamp },
          { role: 'assistant', content: aiResponse, timestamp },
        ];

        await chatRef.set({
          messages:      FieldValue.arrayUnion(...newMessages),
          questionCount: FieldValue.increment(1),
          updatedAt:     timestamp,
          date:          today,
        }, { merge: true });

        // Return updated usage
        const updatedUsage = await usageRef.get();
        const { questionsUsed = 1, dailyLimit = null } = updatedUsage.exists ? updatedUsage.data() : {};

        return ok({
          response: aiResponse,
          questionsUsed,
          dailyLimit,
          timestamp,
        });
      }

      return err('Invalid action', 400);
    }

    return err('Method not allowed', 405);

  } catch (e) {
    console.error('[ai-mentor-chat] error:', e);
    if (e.message?.toLowerCase().includes('token') || e.message?.includes('auth')) {
      return err('Authentication failed', 401);
    }
    if (e.message?.includes('limit')) return err(e.message, 429);
    return err(e.message);
  }
};
