// ─────────────────────────────────────────────────────────────────────────────
// ZYNTRA STUDY TRACKER — Express Server Entry Point
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');

// Route handlers
const authRoutes     = require('./routes/auth');
const checkinRoutes  = require('./routes/checkin');
const sessionsRoutes = require('./routes/sessions');
const chaptersRoutes = require('./routes/chapters');
const statsRoutes    = require('./routes/stats');
const aiRoutes       = require('./routes/ai');
const revisionsRoutes = require('./routes/revisions');
const mistakesRoutes  = require('./routes/mistakes');
const notesRoutes     = require('./routes/notes');
const vocabularyRoutes = require('./routes/vocabulary');
const targetsRoutes   = require('./routes/targets');
const challengeRoutes = require('./routes/challenge');            // BUET Daily Challenge
const { startSessionAutoMissWorker } = require('./lib/sessionReconciliation');
const { startChallengeScheduler }    = require('./lib/challengeScheduler'); // BUET 6AM Scheduler

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Security & middleware ──────────────────────────────────────────────────────
app.use(helmet());
// Support multiple origins via comma-separated CLIENT_ORIGIN env var
// e.g. CLIENT_ORIGIN="http://localhost:5173,https://zyntra-studyverse.netlify.app"
const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, same-origin)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));

// Rate limiting — prevent abuse (generous for single-user app)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  message: { error: 'Too many requests, slow down!' },
});
app.use('/api/', limiter);

// Stricter limit on AI endpoint (expensive API calls)
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'AI analysis limit reached (10/hour). Try again later.' },
});
app.use('/api/ai/analyze', aiLimiter);

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/checkin',   checkinRoutes);
app.use('/api/sessions',  sessionsRoutes);
app.use('/api/chapters',  chaptersRoutes);
app.use('/api/stats',     statsRoutes);
app.use('/api/ai',        aiRoutes);
app.use('/api/revisions', revisionsRoutes);
app.use('/api/mistakes',  mistakesRoutes);
app.use('/api/notes',     notesRoutes);
app.use('/api/targets',   targetsRoutes);
app.use('/api/vocabulary', vocabularyRoutes);
app.use('/api/challenge', challengeRoutes); // BUET Daily Challenge

// Health check — Render uses this
// ── Keep-alive: প্রতি ১৪ মিনিটে নিজেকে ping করো ──────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const SELF_URL = process.env.RENDER_EXTERNAL_URL || '';
  if (SELF_URL) {
    setInterval(async () => {
      try {
        await fetch(`${SELF_URL}/health`);
        console.log('[Keep-alive] Pinged successfully');
      } catch (e) {
        console.log('[Keep-alive] Ping failed:', e.message);
      }
    }, 14 * 60 * 1000);
  }
}
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'ZYNTRA Study Tracker OS',
    version: '1.0.0',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ── Start server ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║   ZYNTRA STUDY TRACKER OS — Server        ║
  ║   Running on port ${PORT}                    ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}              ║
  ╚═══════════════════════════════════════════╝
  `);
});

startSessionAutoMissWorker();
startChallengeScheduler();   // BUET Daily Challenge — 06:00 AM BST (Asia/Dhaka)

module.exports = app;
