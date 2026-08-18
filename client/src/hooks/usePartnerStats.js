// ─────────────────────────────────────────────────────────────────────────────
// usePartnerStats — ZYNTRA StudyVerse
// Single deduplicated hook for partner study progress
// Replaces the two separate listeners in AppLayout + ChatUnlockGate
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store';
import { subscribeToPresence, subscribeToUserStats, subscribeToPartner } from '../firebase/db';
import { getPartnerEmail } from '../lib/constants';

function parseDate(val) {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(val);
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (val && typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000);
  }
  return null;
}

/**
 * Returns real-time partner stats.
 * @returns {{ isStudying, subject, studyMinutesToday, displayName, uid, lastSeen, chatLastReadAt }}
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
    if (!user?.uid) return;
    const partnerEmail = getPartnerEmail(user.email);

    const unsub = subscribeToPartner(partnerEmail, user.uid, (p) => {
      if (p) setPartner(p);
    });
    return unsub;
  }, [user?.uid, user?.email, setPartner]);

  useEffect(() => {
    if (!partnerUid) return;

    // 1️⃣ Presence (isStudying, subject, studyMinutesToday, lastSeen)
    const unsubPresence = subscribeToPresence(partnerUid, (presence) => {
      presenceRef.current = presence;
      const parsedLastSeen = parseDate(presence?.lastSeen);
      setStats(prev => ({
        ...prev,
        isStudying:        presence?.isStudying        || false,
        subject:           presence?.subject           || '',
        chapter:           presence?.chapter           || null,
        startedAt:         presence?.startedAt         || null,
        lastSeen:          parsedLastSeen || prev.lastSeen,
        studyMinutesToday: presence?.studyMinutesToday || 0,
        displayName:       partner?.displayName || prev.displayName,
        uid:               partnerUid,
      }));
    });

    // 2️⃣ User stats doc (more reliable study minutes, updated by Timer/Checkin)
    const unsubUser = subscribeToUserStats(partnerUid, (userData) => {
      statsRef.current = userData;
      const userLastSeen = parseDate(userData?.lastSeen);
      setStats(prev => ({
        ...prev,
        displayName:    userData?.displayName || partner?.displayName || prev.displayName,
        chatLastReadAt: parseDate(userData?.chatLastReadAt),
        lastSeen:       prev.lastSeen || userLastSeen || null,
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
