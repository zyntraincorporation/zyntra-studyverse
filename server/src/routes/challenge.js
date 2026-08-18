// ─────────────────────────────────────────────────────────────────────────────
// /api/challenge — BUET Daily Challenge REST API
// Completely separate from /api/ai — no shared state, no AI Mentor data
// ─────────────────────────────────────────────────────────────────────────────
const router = require('express').Router();
const prisma  = require('../db/client');
const { requireAuth } = require('../middleware/auth');
const { getTodayChallenge, generateAndSaveChallenge } = require('../ai/challengeEngine');
const { getChallengeCycleDate, getBSTDateString } = require('../lib/schedule');

router.use(requireAuth);

// ── GET /api/challenge/today ───────────────────────────────────────────────────
// Returns today's challenge. Auto-generates if not yet created (fallback).
router.get('/today', async (req, res) => {
  try {
    const challenge = await getTodayChallenge();
    res.json(challenge);
  } catch (err) {
    console.error('[Challenge] GET /today error:', err.message);
    res.status(500).json({ error: 'Failed to get/generate today\'s challenge: ' + err.message });
  }
});

// ── GET /api/challenge/stats ───────────────────────────────────────────────────
// Aggregated stats for analytics (total, completed, streaks, subject breakdown)
router.get('/stats', async (req, res) => {
  try {
    const all = await prisma.buetDailyChallenge.findMany({
      orderBy: { date: 'asc' },
      select: {
        date: true, subject: true, challengeType: true,
        status: true, elapsedSeconds: true,
        completedAt: true,
      },
    });

    const total     = all.length;
    const completed = all.filter(c => c.status === 'completed').length;
    const missed    = all.filter(c => c.status === 'missed').length;
    const rate      = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Total challenge time (seconds → minutes)
    const totalSeconds = all
      .filter(c => c.status === 'completed' && c.elapsedSeconds)
      .reduce((s, c) => s + c.elapsedSeconds, 0);

    // Subject breakdown
    const bySubject = {};
    all.forEach(c => {
      if (!bySubject[c.subject]) bySubject[c.subject] = { total: 0, completed: 0 };
      bySubject[c.subject].total++;
      if (c.status === 'completed') bySubject[c.subject].completed++;
    });

    // Type breakdown
    const byType = {};
    all.forEach(c => {
      if (!byType[c.challengeType]) byType[c.challengeType] = 0;
      byType[c.challengeType]++;
    });

    // Current streak & best streak (based on sequential completed days)
    const sortedCompleted = all
      .filter(c => c.status === 'completed')
      .map(c => c.date)
      .sort();

    let currentStreak = 0;
    let bestStreak    = 0;
    let tempStreak    = 0;
    const today = getBSTDateString();

    if (sortedCompleted.length > 0) {
      // Calculate streak working backwards from today
      let checkDate = today;
      for (let i = 0; i < 365; i++) {
        if (sortedCompleted.includes(checkDate)) {
          currentStreak++;
          // subtract one day
          const d = new Date(checkDate + 'T00:00:00+06:00');
          d.setDate(d.getDate() - 1);
          checkDate = d.toISOString().slice(0, 10);
        } else {
          break;
        }
      }

      // Best streak: iterate through all completed dates
      let prevDate = null;
      sortedCompleted.forEach(date => {
        if (!prevDate) { tempStreak = 1; }
        else {
          const prev = new Date(prevDate + 'T00:00:00+06:00');
          prev.setDate(prev.getDate() + 1);
          const expectedNext = prev.toISOString().slice(0, 10);
          if (date === expectedNext) tempStreak++;
          else tempStreak = 1;
        }
        if (tempStreak > bestStreak) bestStreak = tempStreak;
        prevDate = date;
      });
    }

    res.json({
      total, completed, missed, rate,
      totalMinutes: Math.round(totalSeconds / 60),
      currentStreak, bestStreak,
      bySubject, byType,
    });
  } catch (err) {
    console.error('[Challenge] GET /stats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/challenge/history ─────────────────────────────────────────────────
// Last 30 challenges for history display
router.get('/history', async (req, res) => {
  try {
    const history = await prisma.buetDailyChallenge.findMany({
      orderBy: { date: 'desc' },
      take: 30,
    });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/challenge/:date/start ───────────────────────────────────────────
// Mark challenge as started (timer began)
router.post('/:date/start', async (req, res) => {
  try {
    const { date } = req.params;
    const challenge = await prisma.buetDailyChallenge.findUnique({ where: { date } });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found for date: ' + date });
    if (challenge.status !== 'pending') {
      return res.json(challenge); // already started/completed — return as-is
    }
    const updated = await prisma.buetDailyChallenge.update({
      where: { date },
      data: { status: 'started', startedAt: new Date() },
    });
    res.json(updated);
  } catch (err) {
    console.error('[Challenge] POST /start error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/challenge/:date/complete ────────────────────────────────────────
// Mark challenge as completed with elapsed time
router.post('/:date/complete', async (req, res) => {
  try {
    const { date } = req.params;
    const { elapsedSeconds } = req.body;

    const challenge = await prisma.buetDailyChallenge.findUnique({ where: { date } });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found for date: ' + date });
    if (challenge.status === 'completed') return res.json(challenge); // idempotent

    const updated = await prisma.buetDailyChallenge.update({
      where: { date },
      data: {
        status:        'completed',
        completedAt:   new Date(),
        elapsedSeconds: elapsedSeconds ? Number(elapsedSeconds) : null,
        // Ensure startedAt is set even if start wasn't explicitly called
        startedAt: challenge.startedAt || new Date(),
      },
    });
    console.log(`[Challenge] ✓ Completed for ${date} (${elapsedSeconds}s elapsed)`);
    res.json(updated);
  } catch (err) {
    console.error('[Challenge] POST /complete error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/challenge/generate-now ─────────────────────────────────────────
// Generates or returns the challenge for the active 6:00 AM cycle date
router.post('/generate-now', async (req, res) => {
  try {
    const date      = getChallengeCycleDate();
    const challenge = await generateAndSaveChallenge(date);
    res.json({ message: 'Generated', challenge });
  } catch (err) {
    console.error('[Challenge] Generate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
