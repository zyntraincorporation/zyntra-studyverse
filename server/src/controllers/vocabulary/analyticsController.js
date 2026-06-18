import * as analyticsService from '../../services/vocabulary/analyticsService.js';
import * as streakService from '../../services/vocabulary/streakService.js';

export async function getWeeklyStats(req, res) {
  try {
    const data = await analyticsService.getWeeklyComparison(req.userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMonthlyStats(req, res) {
  try {
    const data = await analyticsService.getMonthlyAnalytics(req.userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getStreakData(req, res) {
  try {
    const data = await streakService.getStreakInfo(req.userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getHeatmapData(req, res) {
  try {
    const data = await analyticsService.getHeatmapData(req.userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}