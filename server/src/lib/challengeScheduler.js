// ─────────────────────────────────────────────────────────────────────────────
// BUET Daily Challenge Scheduler
// Uses node-cron to trigger challenge generation at 06:00 AM BST every day
// ─────────────────────────────────────────────────────────────────────────────
const cron = require('node-cron');
const { generateAndSaveChallenge } = require('../ai/challengeEngine');
const { getBSTDateString } = require('./schedule');

let schedulerHandle = null;

function startChallengeScheduler() {
  if (schedulerHandle) return schedulerHandle;

  // '0 6 * * *' = At 06:00 AM every day, in Asia/Dhaka timezone (BST = UTC+6)
  schedulerHandle = cron.schedule('0 6 * * *', async () => {
    const date = getBSTDateString();
    console.log(`[ChallengeScheduler] 6:00 AM BST — generating challenge for ${date}`);
    try {
      const challenge = await generateAndSaveChallenge(date);
      console.log(`[ChallengeScheduler] ✓ Challenge ready: "${challenge.title}" [${challenge.subject}]`);
    } catch (err) {
      console.error(`[ChallengeScheduler] ✗ Generation failed for ${date}:`, err.message);
      // Non-fatal: the GET /api/challenge/today fallback will handle it when user opens dashboard
    }
  }, {
    timezone: 'Asia/Dhaka',
    scheduled: true,
  });

  console.log('[ChallengeScheduler] ✓ Daily challenge scheduler started — fires at 06:00 AM BST (Asia/Dhaka)');
  return schedulerHandle;
}

function stopChallengeScheduler() {
  if (schedulerHandle) {
    schedulerHandle.stop();
    schedulerHandle = null;
  }
}

module.exports = { startChallengeScheduler, stopChallengeScheduler };
