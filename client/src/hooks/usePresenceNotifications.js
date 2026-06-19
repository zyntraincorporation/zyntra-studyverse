import { useEffect, useRef } from 'react';
import { usePartnerStats } from './usePartnerStats';
import { useUIStore } from '../store';

const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

export function usePresenceNotifications() {
  const partnerStats = usePartnerStats();
  const toast = useUIStore(s => s.toast);
  const lastNotified = useRef(0);
  const prevStudying = useRef(false);

  useEffect(() => {
    if (!partnerStats.uid) return;

    const currentlyStudying = partnerStats.isStudying;
    const now = Date.now();

    if (currentlyStudying && !prevStudying.current) {
      // Transitioned to studying
      if (now - lastNotified.current > COOLDOWN_MS) {
        const subject = partnerStats.subject || 'something';
        const msg = `📚 ${partnerStats.displayName} started studying ${subject}.`;
        
        // Show in-app toast
        toast(msg, 'info');

        // Show browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('Partner Activity', {
              body: msg,
              icon: '/android-chrome-192x192.png',
              tag: 'presence_update'
            });
          } catch (_) {}
        }

        lastNotified.current = now;
      }
    }

    prevStudying.current = currentlyStudying;

  }, [partnerStats.isStudying, partnerStats.subject, partnerStats.uid, partnerStats.displayName, toast]);
}
