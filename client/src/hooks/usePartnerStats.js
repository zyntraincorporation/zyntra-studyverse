// ─────────────────────────────────────────────────────────────────────────────
// usePartnerStats — ZYNTRA StudyVerse
// Single deduplicated hook for partner study progress
// Replaces the two separate listeners in AppLayout + ChatUnlockGate
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store';
import { subscribeToPresence, subscribeToUserStats } from '../firebase/db';

/**
 * Returns real-time partner stats.
 * @returns {{ isStudying, subject, studyMinutesToday, displayName, uid }}
 */
export function usePartnerStats() {
  const partner = useAuthStore(s => s.partner);
  const [stats, setStats] = useState({
    isStudying:        false,
    subject:           '',
    studyMinutesToday: 0,
    displayName:       partner?.displayName || '',
    uid:               partner?.uid || null,
    startedAt:         null,
    lastSeen:          null,
    chatLastReadAt:    null,
  });

  // Use a ref to avoid stale closure issues
  const presenceRef = useRef(null);
  const statsRef    = useRef(null);

  useEffect(() => {
    if (!partner?.uid) return;

    // 1️⃣ Presence (isStudying, subject, studyMinutesToday)
    const unsubPresence = subscribeToPresence(partner.uid, (presence) => {
      presenceRef.current = presence;
      setStats(prev => ({
        ...prev,
        isStudying:        presence?.isStudying        || false,
        subject:           presence?.subject           || '',
        chapter:           presence?.chapter           || null,
        startedAt:         presence?.startedAt         || null,
        lastSeen:          presence?.lastSeen?.toDate?.() || null,
        studyMinutesToday: presence?.studyMinutesToday || 0,
        displayName:       partner.displayName,
        uid:               partner.uid,
      }));
    });

    // 2️⃣ User stats doc (more reliable study minutes, updated by Timer/Checkin)
    const unsubUser = subscribeToUserStats(partner.uid, (userData) => {
      statsRef.current = userData;
      // Prefer presence minutes if online, else fall back to user doc
      setStats(prev => ({
        ...prev,
        displayName: userData?.displayName || partner.displayName,
        chatLastReadAt: userData?.chatLastReadAt?.toDate?.() || null,
        // Only override studyMinutes from user doc if presence isn't showing studying
        ...(presenceRef.current?.isStudying
          ? {}
          : { studyMinutesToday: userData?.studyMinutesToday || prev.studyMinutesToday }),
      }));
    });

    return () => {
      unsubPresence();
      unsubUser();
    };
  }, [partner?.uid]); // eslint-disable-line

  return stats;
}
