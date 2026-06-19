import { useEffect, useRef } from 'react';
import { useAuthStore, useUIStore } from '../store';
import { getScheduleEntries } from '../firebase/db';
import { getBSTDateString, getBSTTime } from '../lib/bst';

export function useCheckinAlerts() {
  const user = useAuthStore(s => s.user);
  const toast = useUIStore(s => s.toast);
  const notifiedSet = useRef(new Set());

  useEffect(() => {
    if (!user?.uid) return;

    const checkAlerts = async () => {
      try {
        const today = getBSTDateString();
        const entries = await getScheduleEntries(user.uid, today);
        
        const { hour, minute } = getBSTTime();
        const currentMins = hour * 60 + minute;

        entries.forEach(entry => {
          if (entry.status !== 'pending') return;
          if (!entry.time) return;

          const [startH, startM] = entry.time.split(':').map(Number);
          const startMins = startH * 60 + startM;
          
          const diff = startMins - currentMins;
          
          // 15 mins warning
          if (diff === 15) {
            const key = `${entry.id}-15m`;
            if (!notifiedSet.current.has(key)) {
              notifiedSet.current.add(key);
              notify(`⏰ Your ${entry.subject || 'scheduled'} Check-in starts in 15 minutes.`);
            }
          }
          
          // Started warning
          if (diff === 0) {
            const key = `${entry.id}-now`;
            if (!notifiedSet.current.has(key)) {
              notifiedSet.current.add(key);
              notify(`📚 Your scheduled study session has started.`);
            }
          }
        });

      } catch (err) {
        console.error('Failed to check alerts:', err);
      }
    };

    const notify = (msg) => {
      toast(msg, 'info');
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('Study Reminder', {
            body: msg,
            icon: '/android-chrome-192x192.png',
            tag: 'checkin_alert'
          });
        } catch (_) {}
      }
    };

    // Run immediately, then every minute
    checkAlerts();
    const intervalId = setInterval(checkAlerts, 60000);

    return () => clearInterval(intervalId);
  }, [user?.uid, toast]);
}
