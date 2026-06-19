// ─────────────────────────────────────────────────────────────────────────────
// Firebase Messaging Service Worker — ZYNTRA StudyVerse
// Handles background push notifications via FCM
// ─────────────────────────────────────────────────────────────────────────────

importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

// Firebase config — must match client/src/firebase/config.js
// These values are safe to have in the SW (they're in the public bundle anyway)
firebase.initializeApp({
  apiKey:            'AIzaSyAFcZtWr2Ku2WMErgopBA2EuFLo5BLeD9U',
  authDomain:        'zyntra-studyverse.firebaseapp.com',
  projectId:         'zyntra-studyverse',
  storageBucket:     'zyntra-studyverse.firebasestorage.app',
  messagingSenderId: '952356733174',
  appId:             '1:952356733174:web:b975dc9a2733ec368f6cd7',
});

const messaging = firebase.messaging();

// ── Background message handler ────────────────────────────────────────────────
// Fires when the app is NOT in the foreground
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, data } = payload.notification || {};
  const notificationTitle = title || 'ZYNTRA StudyVerse';
  const notificationBody  = body  || 'You have a new notification.';

  const options = {
    body:    notificationBody,
    icon:    icon || '/android-chrome-192x192.png',
    badge:   '/favicon-32x32.png',
    tag:     data?.tag || 'zyntra-notification',   // collapses duplicate notifs
    renotify: true,
    vibrate: [200, 100, 200],
    data:    data || {},
    actions: data?.type === 'chat_message'
      ? [{ action: 'open_chat', title: '💬 Open Chat' }]
      : [{ action: 'open_app',  title: '🚀 Open App'  }],
  };

  return self.registration.showNotification(notificationTitle, options);
});

// ── Notification click handler ────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data   = event.notification.data || {};
  const action = event.action;
  const type   = data.type || '';

  // Determine which URL to open
  let targetUrl = '/';
  if (type === 'chat_message' || action === 'open_chat') {
    targetUrl = '/chat';
  } else if (type === 'leaderboard') {
    targetUrl = '/leaderboard';
  } else if (type === 'vocab_milestone') {
    targetUrl = '/vocabulary';
  } else if (type === 'streak') {
    targetUrl = '/';
  }

  const fullUrl = self.location.origin + targetUrl;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If the app is already open, focus it and navigate
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(fullUrl);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});

// ── Push event fallback (in case onBackgroundMessage doesn't catch it) ────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    // FCM compat handles this — only act if it wasn't a display message
    if (!payload.notification) {
      const data  = payload.data || {};
      const title = data.title || 'ZYNTRA StudyVerse';
      const body  = data.body  || 'New update';
      event.waitUntil(
        self.registration.showNotification(title, {
          body,
          icon:  '/android-chrome-192x192.png',
          badge: '/favicon-32x32.png',
          data,
          vibrate: [200, 100, 200],
        })
      );
    }
  } catch (_) { /* ignore parse errors */ }
});
