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
        // updatePresence automatically merges `lastSeen: now()`
        updatePresence(user.uid, {}).catch(err => {
          console.error('[Heartbeat] Failed to update presence:', err);
        });
      }
    };

    ping();

    // Ping every 60 seconds
    const intervalId = setInterval(ping, 60000);

    // Ping on visibility change (when user returns to app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        ping();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.uid]);
}
