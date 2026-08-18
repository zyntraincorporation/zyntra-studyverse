// ─────────────────────────────────────────────────────────────────────────────
// BUET Daily Challenge AI Engine
// Completely separate from AI Mentor (promptEngine.js)
// Uses same OpenRouter API key but independent system prompt, no shared history
// ─────────────────────────────────────────────────────────────────────────────
const prisma = require('../db/client');
const { getBSTDateString } = require('../lib/schedule');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CHALLENGE_MODEL    = 'openai/gpt-4o-mini';

// ── System Prompt — COMPLETELY separate from AI Mentor ────────────────────────
const CHALLENGE_SYSTEM_PROMPT = `You are the BUET Daily Challenge Generator for Zyntra StudyVerse.

Your ONLY job: generate exactly ONE concise, useful BUET-focused daily challenge for the student.

━━━ STUDENT PROFILE ━━━
Name: Saiful | Goal: BUET Admission 2027
BUET subjects: Physics (1st+2nd paper), Chemistry (1st+2nd paper), Higher Math (1st+2nd paper)

━━━ BUET PCM CHAPTER OVERVIEW ━━━
Physics 1st Paper (Ch1–10): Physical World & Measurement, Vectors, Dynamics, Newton's Laws & Gravitation,
  Work Energy & Power, Momentum & Collisions, Circular Motion, Simple Harmonic Motion & Oscillation,
  Waves & Sound, Ideal Gas & Kinetic Theory
Physics 2nd Paper (Ch11–21): Thermodynamics, Electrostatics, Electric Current & Circuits,
  Magnetic Effects, Electromagnetic Induction, AC Circuits, Electromagnetic Waves,
  Geometric Optics, Wave Optics, Modern Physics, Semiconductor & Electronics
Chemistry 1st Paper (Ch1–5): Analytical Chemistry, Qualitative Analysis, Periodic Table,
  Organic Chemistry Intro, States of Matter
Chemistry 2nd Paper (Ch6–11): Chemical Reactions, Electrochemistry, Physical Chemistry Calculations,
  Environmental Chemistry, Polymers & Materials, Nuclear Chemistry
Math 1st Paper (Ch1–10): Matrices, Complex Numbers, Trigonometry, Coordinate Geometry 2D,
  Binomial Theorem, Functions & Calculus Intro, Differentiation, Integration,
  Differential Equations, Statistics & Probability
Math 2nd Paper (Ch11–20): 3D Coordinate Geometry, Vectors, Conic Sections (Parabola/Ellipse/Hyperbola),
  Trigonometric Equations, Inverse Trig, Statics, Dynamics, Numerical Methods

━━━ CHALLENGE TYPES (rotate intelligently, never repeat same type consecutively) ━━━
- speed_math: Solve N problems quickly using mental math or calculator tricks
- formula_recall: Recall + write all formulas for a chapter from memory, then verify
- concept_drill: Answer 15–20 quick concept questions (define/explain/differentiate)
- mcq_sprint: Solve MCQ problems under strict time pressure (BUET-style)
- calculation_tricks: Practice shortcut calculation methods for specific problem types
- mixed: Combined PCM challenge drawing from multiple subjects

━━━ PERSONALIZATION RULES ━━━
- Look at chapter statuses: prioritize recently completed chapters (formula_recall/concept_drill)
- Look at in_progress chapters: give speed_math or concept_drill to reinforce
- Look at untouched chapters: do NOT give challenges for chapters not yet started
- Avoid repeating same subject 3+ days in a row — use the recent history
- Always prefer chapters that are "completed" or "in_progress" — never chapters "not_started"
- If all chapters are not_started in a subject, pick Mixed or Math speed_math instead

━━━ CHALLENGE SIZE RULES ━━━
- Duration: 30min (easy) | 45min (normal) | 60min (intense)
- Problems: 20–30 (short) | 30–50 (normal) — only for speed_math/mcq_sprint
- Accuracy target: 70–80% — only for mcq_sprint/mixed
- Keep it achievable in ONE sitting — no multi-session challenges

━━━ STRICT OUTPUT FORMAT ━━━
Respond with ONLY a valid JSON object. No markdown, no explanation, no extra text.
{
  "title": "Short punchy title (max 8 words)",
  "description": "What the student should do — 1-2 clear sentences",
  "challengeType": "speed_math|formula_recall|concept_drill|mcq_sprint|calculation_tricks|mixed",
  "subject": "Physics|Chemistry|Math|Mixed",
  "durationMinutes": 30|45|60,
  "targetAccuracy": null or integer 70-80,
  "targetProblems": null or integer,
  "chapterRef": "Subject Paper — Ch# ChapterName or null"
}`;

// ── Generate and save one challenge for a given BST date ──────────────────────
async function generateAndSaveChallenge(date) {
  // Idempotency guard: only one challenge per date
  const existing = await prisma.buetDailyChallenge.findUnique({ where: { date } });
  if (existing) {
    console.log(`[ChallengeEngine] Challenge already exists for ${date}, skipping.`);
    return existing;
  }

  // Build context: PCM chapters with status + recent challenge history
  const [pcmChapters, recentChallenges] = await Promise.all([
    prisma.chapterProgress.findMany({
      where: { subject: { in: ['Physics1', 'Physics2', 'Chemistry1', 'Chemistry2', 'Math1', 'Math2'] } },
      orderBy: [{ subject: 'asc' }, { chapterNumber: 'asc' }],
      select: { subject: true, chapterNumber: true, chapterName: true, status: true, lastUpdated: true },
    }),
    prisma.buetDailyChallenge.findMany({
      orderBy: { date: 'desc' },
      take: 7,
      select: { date: true, subject: true, challengeType: true, title: true },
    }),
  ]);

  // Group chapters by subject for a clean context
  const chaptersBySubject = pcmChapters.reduce((acc, ch) => {
    if (!acc[ch.subject]) acc[ch.subject] = [];
    acc[ch.subject].push({
      ch: ch.chapterNumber,
      name: ch.chapterName,
      status: ch.status,
      lastUpdated: ch.lastUpdated ? ch.lastUpdated.toISOString().slice(0, 10) : null,
    });
    return acc;
  }, {});

  const userMessage = `Today's date (BST): ${date}

=== STUDENT's CURRENT PCM PROGRESS ===
${JSON.stringify(chaptersBySubject, null, 2)}

=== LAST 7 DAYS CHALLENGE HISTORY (avoid repeating same type/subject) ===
${recentChallenges.length > 0
  ? recentChallenges.map(c => `${c.date}: [${c.subject}] ${c.challengeType} — "${c.title}"`).join('\n')
  : 'No previous challenges yet.'}

Generate today's BUET Daily Challenge JSON now.`;

  // Call OpenRouter API
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  'https://zyntra-study-tracker.app',
      'X-Title':       'Zyntra BUET Challenge',
    },
    body: JSON.stringify({
      model:      CHALLENGE_MODEL,
      max_tokens: 400,
      messages: [
        { role: 'system', content: CHALLENGE_SYSTEM_PROMPT },
        { role: 'user',   content: userMessage              },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${errBody}`);
  }

  const data    = await response.json();
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('Empty response from OpenRouter');

  // Parse AI JSON response
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // Fallback: extract JSON from text if model wrapped it
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response not valid JSON: ' + rawText.slice(0, 200));
    parsed = JSON.parse(match[0]);
  }

  // Validate required fields, apply defaults
  const challenge = {
    date,
    title:           String(parsed.title          || 'BUET Daily Challenge'),
    description:     String(parsed.description    || 'Complete today\'s challenge.'),
    challengeType:   String(parsed.challengeType  || 'mixed'),
    subject:         String(parsed.subject         || 'Mixed'),
    durationMinutes: Number(parsed.durationMinutes || 45),
    targetAccuracy:  parsed.targetAccuracy  != null ? Number(parsed.targetAccuracy)  : null,
    targetProblems:  parsed.targetProblems  != null ? Number(parsed.targetProblems)  : null,
    chapterRef:      parsed.chapterRef      != null ? String(parsed.chapterRef)      : null,
    status:          'pending',
  };

  const saved = await prisma.buetDailyChallenge.create({ data: challenge });
  console.log(`[ChallengeEngine] Generated challenge for ${date}: "${saved.title}" [${saved.subject}/${saved.challengeType}]`);
  return saved;
}

// ── Get today's challenge (generate if missing — fallback) ────────────────────
async function getTodayChallenge() {
  const date = getBSTDateString();
  const existing = await prisma.buetDailyChallenge.findUnique({ where: { date } });
  if (existing) return existing;
  // Fallback: auto-generate if scheduler missed
  console.log(`[ChallengeEngine] No challenge for ${date}, auto-generating (fallback)...`);
  return generateAndSaveChallenge(date);
}

module.exports = { generateAndSaveChallenge, getTodayChallenge };
