import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Auth token injection ───────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('zyntra_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — handle 401, offline queue ──────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('zyntra_token');
      window.location.href = '/login';
    }
    // If offline, queue write mutations
    if (!navigator.onLine && err.config?.method !== 'get') {
      queueOfflineWrite(err.config);
    }
    return Promise.reject(err);
  }
);

// ── Offline write queue ────────────────────────────────────────────────────────
const QUEUE_KEY = 'zyntra_offline_queue';

function queueOfflineWrite(config) {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  queue.push({
    url:    config.url,
    method: config.method,
    data:   config.data,
    queuedAt: new Date().toISOString(),
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function flushOfflineQueue() {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  if (!queue.length) return;

  const remaining = [];
  for (const item of queue) {
    try {
      await api({ method: item.method, url: item.url, data: item.data });
    } catch {
      remaining.push(item); // failed again — keep in queue
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return queue.length - remaining.length; // how many flushed
}

// ── Flush queue when connection returns ───────────────────────────────────────
window.addEventListener('online', () => {
  flushOfflineQueue().then((n) => {
    if (n > 0) console.log(`[Zyntra] Flushed ${n} queued offline writes`);
  });
});

// ── API helper functions ───────────────────────────────────────────────────────

export const authAPI = {
  login: (pin) => api.post('/api/auth/login', { pin }),
};

export const checkinAPI = {
  getMorningToday:      ()     => api.get('/api/checkin/morning/today'),
  saveMorning:          (data) => api.post('/api/checkin/morning', data),
  getMorningHistory:    (days) => api.get(`/api/checkin/morning/history?days=${days}`),
  getSessionsToday:     ()     => api.get('/api/checkin/sessions/today'),
  getPendingSessions:   ()     => api.get('/api/checkin/sessions/pending'),
  saveSession:          (data) => api.post('/api/checkin/sessions', data),
  getSessionHistory:    (days) => api.get(`/api/checkin/sessions/history?days=${days}`),
};

export const sessionsAPI = {
  saveCustom:     (data) => api.post('/api/sessions/custom', data),
  getCustom:      (days) => api.get(`/api/sessions/custom?days=${days || 60}`),
  deleteCustom:   (id)   => api.delete(`/api/sessions/custom/${id}`),
  savePractice:   (data) => api.post('/api/sessions/practice', data),
  getPractice:    (days) => api.get(`/api/sessions/practice?days=${days || 30}`),
};

export const chaptersAPI = {
  getAll:         ()           => api.get('/api/chapters'),
  update:         (id, data)   => api.patch(`/api/chapters/${id}`, data),
  bulkUpdate:     (updates)    => api.post('/api/chapters/bulk-update', { updates }),
};

export const statsAPI = {
  getWeekly:      (days) => api.get(`/api/stats/weekly?days=${days || 7}`),
  getHeatmap:     (days) => api.get(`/api/stats/heatmap?days=${days || 90}`),
};

export const aiAPI = {
  analyze:        (days) => api.post('/api/ai/analyze', { days: days || 7 }),
  getReports:     ()     => api.get('/api/ai/reports'),
  getLatest:      ()     => api.get('/api/ai/reports/latest'),
  getReport:      (id)   => api.get(`/api/ai/reports/${id}`),
};

export const revisionsAPI = {
  getDue:     ()          => api.get('/api/revisions/due'),
  getHistory: (days)      => api.get(`/api/revisions/history?days=${days || 30}`),
  getStats:   ()          => api.get('/api/revisions/stats'),
  logRevision:(data)      => api.post('/api/revisions', data),
};

export const notesAPI = {
  getToday:   ()                    => api.get('/api/notes/today'),
  getAll:     ({ page = 1, limit = 30 } = {}) => api.get(`/api/notes?page=${page}&limit=${limit}`),
  save:       (data)                => api.post('/api/notes', data),
  delete:     (date)                => api.delete(`/api/notes/${date}`),
};

export const mistakesAPI = {
  getAll:   (params = {}) => api.get('/api/mistakes', { params }),
  getStats: ()             => api.get('/api/mistakes/stats'),
  create:   (data)         => api.post('/api/mistakes', data),
  update:   (id, data)     => api.patch(`/api/mistakes/${id}`, data),
  delete:   (id)           => api.delete(`/api/mistakes/${id}`),
};

export const targetsAPI = {
  getByMonth:  (month)          => api.get(`/api/targets?month=${month}`),
  getMonths:   ()               => api.get('/api/targets/months'),
  seedMonth:   (month, targets) => api.post('/api/targets/seed', { month, targets }),
  update:      (id, data)       => api.patch(`/api/targets/${id}`, data),
  delete:      (id)             => api.delete(`/api/targets/${id}`),
};

// ── BUET Daily Challenge API — separate system, not connected to AI Mentor ────
export const challengeAPI = {
  getToday:     ()               => api.get('/api/challenge/today'),
  start:        (date)           => api.post(`/api/challenge/${date}/start`),
  complete:     (date, elapsed)  => api.post(`/api/challenge/${date}/complete`, { elapsedSeconds: elapsed }),
  getStats:     ()               => api.get('/api/challenge/stats'),
  getHistory:   ()               => api.get('/api/challenge/history'),
  generateNow:  ()               => api.post('/api/challenge/generate-now'), // dev/testing
};
