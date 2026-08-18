import { useEffect } from 'react';
import { useAuthStore } from '../store';
import { updatePresence } from '../firebase/db';

export function useHeartbeat() {
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (!user?.uid) return;

    // Send heartbeat immediately on mount
    const ping = () => {
      if (document.visibilityState === 'visible') {
        updatePresence(user.uid, {}).catch(err => {
          console.warn('[Heartbeat] presence update failed:', err);
        });
      }
    };

    ping();

    // Ping every 25 seconds while visible
    const intervalId = setInterval(ping, 25000);

    // Ping on visibility change (when user returns to app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        ping();
      }
    };

    // Ping on window focus
    const handleFocus = () => ping();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.uid]);
}
