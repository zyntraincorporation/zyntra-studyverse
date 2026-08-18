// ─────────────────────────────────────────────────────────────────────────────
// usePartnerStats — ZYNTRA StudyVerse
// Single deduplicated hook for partner study progress
// Replaces the two separate listeners in AppLayout + ChatUnlockGate
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store';
import { subscribeToPresence, subscribeToUserStats, subscribeToPartner } from '../firebase/db';
import { getPartnerEmail } from '../lib/constants';

/**
 * Returns real-time partner stats.
 * @returns {{ isStudying, subject, studyMinutesToday, displayName, uid }}
 */
export function usePartnerStats() {
  const user       = useAuthStore(s => s.user);
  const partner    = useAuthStore(s => s.partner);
  const setPartner = useAuthStore(s => s.setPartner);

  const [stats, setStats] = useState({
    isStudying:        false,
    subject:           '',
    chapter:           null,
    studyMinutesToday: 0,
    displayName:       partner?.displayName || '',
    uid:               partner?.uid || partner?.id || null,
    startedAt:         null,
    lastSeen:          null,
    chatLastReadAt:    null,
  });

  const presenceRef = useRef(null);
  const statsRef    = useRef(null);

  const partnerUid = partner?.uid || partner?.id;

  // Auto-resolve partner if missing
  useEffect(() => {
    if (partnerUid || !user?.email) return;
    const partnerEmail = getPartnerEmail(user.email);
    if (!partnerEmail) return;

    const unsub = subscribeToPartner(partnerEmail, (p) => {
      if (p) setPartner(p);
    });
    return unsub;
  }, [partnerUid, user?.email, setPartner]);

  useEffect(() => {
    if (!partnerUid) return;

    // 1️⃣ Presence (isStudying, subject, studyMinutesToday)
    const unsubPresence = subscribeToPresence(partnerUid, (presence) => {
      presenceRef.current = presence;
      setStats(prev => ({
        ...prev,
        isStudying:        presence?.isStudying        || false,
        subject:           presence?.subject           || '',
        chapter:           presence?.chapter           || null,
        startedAt:         presence?.startedAt         || null,
        lastSeen:          presence?.lastSeen?.toDate?.() || null,
        studyMinutesToday: presence?.studyMinutesToday || 0,
        displayName:       partner?.displayName || prev.displayName,
        uid:               partnerUid,
      }));
    });

    // 2️⃣ User stats doc (more reliable study minutes, updated by Timer/Checkin)
    const unsubUser = subscribeToUserStats(partnerUid, (userData) => {
      statsRef.current = userData;
      setStats(prev => ({
        ...prev,
        displayName:    userData?.displayName || partner?.displayName || prev.displayName,
        chatLastReadAt: userData?.chatLastReadAt?.toDate?.() || null,
        ...(presenceRef.current?.isStudying
          ? {}
          : { studyMinutesToday: userData?.studyMinutesToday || prev.studyMinutesToday }),
      }));
    });

    return () => {
      unsubPresence();
      unsubUser();
    };
  }, [partnerUid, partner?.displayName]);

  return stats;
}
