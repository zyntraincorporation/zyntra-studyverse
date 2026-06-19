// ─────────────────────────────────────────────────────────────────────────────
// Firebase Cloud Messaging — ZYNTRA StudyVerse
// Manages push notification tokens + foreground message handling
// ─────────────────────────────────────────────────────────────────────────────
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './config';
import { saveFCMToken } from './db';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let _messaging = null;

function getMessagingInstance() {
  if (!_messaging) {
    try {
      _messaging = getMessaging(app);
    } catch (err) {
      console.warn('[FCM] Messaging not supported in this browser:', err.message);
      return null;
    }
  }
  return _messaging;
}

// ── Request permission & get FCM token ────────────────────────────────────────
export async function requestPushPermission(uid) {
  if (!uid) return null;
  if (!('Notification' in window)) {
    console.warn('[FCM] Notifications not supported');
    return null;
  }
  if (!('serviceWorker' in navigator)) {
    console.warn('[FCM] Service workers not supported');
    return null;
  }

  const messaging = getMessagingInstance();
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('[FCM] Push permission denied by user');
      return null;
    }

    // Register the FCM service worker
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });

    const token = await getToken(messaging, {
      vapidKey:        VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (token) {
      await saveFCMToken(uid, token);
      console.info('[FCM] Token saved successfully');
      return token;
    }
  } catch (err) {
    console.error('[FCM] Failed to get push token:', err);
  }
  return null;
}

// ── Foreground message listener ───────────────────────────────────────────────
// Fires when app is in the foreground; we show in-app toasts instead
export function onForegroundMessage(callback) {
  const messaging = getMessagingInstance();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    callback(payload);
  });
}

// ── Check if push is currently granted ───────────────────────────────────────
export function isPushGranted() {
  return 'Notification' in window && Notification.permission === 'granted';
}
