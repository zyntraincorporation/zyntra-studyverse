const express    = require('express');
const { authenticate } = require('../middleware/auth');   // তোমার existing auth middleware
const {
  getWords, createWord, updateWord, deleteWord, getWordById
} = require('../controllers/vocabulary/wordsController');
const {
  submitReview, getYesterdayWords, getRevisionQueue
} = require('../controllers/vocabulary/reviewsController');
const {
  getWeeklyStats, getMonthlyStats, getStreakData, getHeatmapData
} = require('../controllers/vocabulary/analyticsController');
const {
  aiLookup, aiAutofill
} = require('../controllers/vocabulary/aiController');

const router = express.Router();
router.use(authenticate);

router.get('/words',           getWords);
router.get('/words/:id',       getWordById);
router.post('/words',          createWord);
router.put('/words/:id',       updateWord);
router.delete('/words/:id',    deleteWord);

router.get('/yesterday',       getYesterdayWords);
router.post('/review',         submitReview);
router.get('/revision-queue',  getRevisionQueue);

router.get('/stats/weekly',    getWeeklyStats);
router.get('/stats/monthly',   getMonthlyStats);
router.get('/stats/streak',    getStreakData);
router.get('/stats/heatmap',   getHeatmapData);

router.post('/ai/lookup',      aiLookup);
router.post('/ai/autofill',    aiAutofill);

module.exports = router;