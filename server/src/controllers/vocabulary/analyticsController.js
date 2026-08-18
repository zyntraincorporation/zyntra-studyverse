const analyticsService = require('../../services/vocabulary/analyticsService');
const streakService    = require('../../services/vocabulary/streakService');

const uid = req => req.user?.id || 'saiful';

async function getWeeklyStats(req, res) {
  try { res.json(await analyticsService.getWeeklyComparison(uid(req))); }
  catch (err) { res.status(500).json({ error: err.message }); }
}

async function getMonthlyStats(req, res) {
  try { res.json(await analyticsService.getMonthlyAnalytics(uid(req))); }
  catch (err) { res.status(500).json({ error: err.message }); }
}

async function getStreakData(req, res) {
  try { res.json(await streakService.getStreakInfo(uid(req))); }
  catch (err) { res.status(500).json({ error: err.message }); }
}

async function getHeatmapData(req, res) {
  try { res.json(await analyticsService.getHeatmapData(uid(req))); }
  catch (err) { res.status(500).json({ error: err.message }); }
}

module.exports = { getWeeklyStats, getMonthlyStats, getStreakData, getHeatmapData };