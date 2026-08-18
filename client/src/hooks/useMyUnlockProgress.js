// ─────────────────────────────────────────────────────────────────────────────
// useMyUnlockProgress — ZYNTRA StudyVerse
//
// Unlock rule: myVocabCount >= 20  &&  partnerVocabCount >= 20  →  UNLOCKED
//
// Real-time: both vocab counts update instantly via Firestore onSnapshot.
// Daily reset: BST-aware midnight query means counts reset each BST day.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import {
  subscribeToTodaySessions,
  subscribeToTodayVocabCount,
  subscribeToPartnerVocabCount,
} from '../firebase/db';
import { getBSTDateString } from '../lib/bst';
import { COUPLE_CONFIG } from '../lib/constants';

export function useMyUnlockProgress() {
  const user    = useAuthStore(s => s.user);
  const partner = useAuthStore(s => s.partner);

  const [studyMinutes,      setStudyMinutes]      = useState(0);
  const [myVocabCount,      setMyVocabCount]      = useState(0);
  const [partnerVocabCount, setPartnerVocabCount] = useState(0);

  // ── My sessions (for study-minutes display, not unlock) ────────────────────
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

  // ── My today vocab count (BST-correct, real-time) ─────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToTodayVocabCount(user.uid, (count) => {
      setMyVocabCount(count);
    });
    return unsub;
  }, [user?.uid]);

  // ── Partner today vocab count (BST-correct, real-time) ────────────────────
  // NOTE: partner object may have uid or id depending on how findUserByEmail
  // resolved it. We normalise here to always get the UID string.
  useEffect(() => {
    const partnerUid = partner?.uid || partner?.id;
    if (!partnerUid) return;
    const unsub = subscribeToPartnerVocabCount(partnerUid, (count) => {
      setPartnerVocabCount(count);
    });
    return unsub;
  }, [partner?.uid, partner?.id]);

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
