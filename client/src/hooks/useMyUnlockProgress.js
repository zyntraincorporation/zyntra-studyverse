// ─────────────────────────────────────────────────────────────────────────────
// useMyUnlockProgress — ZYNTRA StudyVerse
//
// Unlock rule: myVocabCount >= 20  &&  partnerVocabCount >= 20  →  UNLOCKED
//
// Real-time: both vocab counts update instantly via Firestore onSnapshot.
// Daily reset: BST-aware midnight query means counts reset each BST day.
// Multi-channel sync:
//   1) Shared chat room doc `dailyVocab` (instant couple sync)
//   2) User vocabulary subcollections
//   3) Presence document
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import {
  subscribeToTodaySessions,
  subscribeToTodayVocabCount,
  subscribeToPartnerVocabCount,
  subscribeToPartner,
  syncUserVocabCount,
  subscribeToCoupleDailyVocab,
} from '../firebase/db';
import { getBSTDateString } from '../lib/bst';
import { COUPLE_CONFIG, getPartnerEmail } from '../lib/constants';

export function useMyUnlockProgress() {
  const user       = useAuthStore(s => s.user);
  const partner    = useAuthStore(s => s.partner);
  const setPartner = useAuthStore(s => s.setPartner);

  const [studyMinutes,      setStudyMinutes]      = useState(0);
  const [myVocabCount,      setMyVocabCount]      = useState(0);
  const [partnerVocabCount, setPartnerVocabCount] = useState(0);
  const [resolvedPartnerUid, setResolvedPartnerUid] = useState(
    partner?.uid || partner?.id || null
  );

  // ── 1. Auto-resolve partner UID if not yet present in store ──────────────────
  useEffect(() => {
    if (partner?.uid || partner?.id) {
      setResolvedPartnerUid(partner.uid || partner.id);
    }
    if (!user?.uid) return;

    const partnerEmail = getPartnerEmail(user.email);

    // Real-time subscribe to partner user document (with myUid fallback)
    const unsub = subscribeToPartner(partnerEmail, user.uid, (p) => {
      if (p) {
        setPartner(p);
        setResolvedPartnerUid(p.uid || p.id);
      }
    });
    return unsub;
  }, [partner?.uid, partner?.id, user?.uid, user?.email, setPartner]);

  // ── 2. My sessions (for study-minutes display, not unlock) ────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const today = getBSTDateString();
    const unsub = subscribeToTodaySessions(user.uid, today, (sessions) => {
      const custom = sessions
        .filter(s => s.type === 'custom')
        .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
      const timer = sessions
        .filter(s => s.type !== 'custom')
        .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
      setStudyMinutes(Math.min(custom, 120) + timer);
    });
    return unsub;
  }, [user?.uid]);

  // ── 3. My today vocab count (BST-correct, real-time) + Sync to Shared Doc ─────
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToTodayVocabCount(user.uid, (count) => {
      setMyVocabCount(count);
      // Immediately broadcast to shared couple chat room doc
      syncUserVocabCount(user.uid, count);
    });
    return unsub;
  }, [user?.uid]);

  // ── 4. Shared couple dailyVocab sync (Instant peer-to-peer reflection) ────────
  useEffect(() => {
    if (!user?.uid) return;
    const today = getBSTDateString();

    const unsub = subscribeToCoupleDailyVocab((dailyVocab) => {
      if (!dailyVocab) return;

      for (const [uid, info] of Object.entries(dailyVocab)) {
        if (uid !== user.uid && info) {
          if (!resolvedPartnerUid) {
            setResolvedPartnerUid(uid);
          }
          if (info.date === today && typeof info.count === 'number') {
            setPartnerVocabCount(prev => Math.max(prev, info.count));
          }
        }
      }
    });
    return unsub;
  }, [user?.uid, resolvedPartnerUid]);

  // ── 5. Partner today vocab count from subcollection ──────────────────────────
  useEffect(() => {
    if (!resolvedPartnerUid) return;
    const unsub = subscribeToPartnerVocabCount(resolvedPartnerUid, (count) => {
      setPartnerVocabCount(prev => Math.max(prev, count));
    });
    return unsub;
  }, [resolvedPartnerUid]);

  const vocabThreshold = COUPLE_CONFIG.chatUnlockVocab; // 20

  // Unlock rule: BOTH users must have completed 20 vocab today
  const isUnlocked = myVocabCount >= vocabThreshold && partnerVocabCount >= vocabThreshold;

  return {
    // Vocab progress (unlock condition)
    vocabCount:         myVocabCount,
    partnerVocabCount,
    vocabThreshold,
    vocabPct:           Math.min(100, Math.round((myVocabCount      / vocabThreshold) * 100)),
    partnerVocabPct:    Math.min(100, Math.round((partnerVocabCount / vocabThreshold) * 100)),

    // Study minutes (display only — not used for unlock)
    studyMinutes,

    // Unlock state
    isUnlocked,
  };
}
