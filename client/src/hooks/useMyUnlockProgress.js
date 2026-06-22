// ─────────────────────────────────────────────────────────────────────────────
// useMyUnlockProgress — ZYNTRA StudyVerse
//
// Subscribes DIRECTLY to today's sessions (real-time) and computes eligible
// minutes client-side. This ensures the unlock gate re-evaluates instantly
// whenever a session is saved — without relying on the chatRoom doc field
// (which is only written when updateChatStudyMinutes is explicitly called).
//
// Eligible minutes rule (DO NOT change — already implemented & working):
//   custom sessions capped at 120 min + timer/pomodoro sessions uncapped
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import { subscribeToTodaySessions, subscribeToTodayVocabCount } from '../firebase/db';
import { getBSTDateString } from '../lib/bst';
import { COUPLE_CONFIG } from '../lib/constants';

export function useMyUnlockProgress() {
  const user = useAuthStore(s => s.user);
  const [studyMinutes, setStudyMinutes] = useState(0);
  const [vocabCount,   setVocabCount]   = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    const today = getBSTDateString(); // BST-aware today string e.g. "2026-06-22"

    // ── Subscribe to today's sessions (real-time) ──────────────────────────
    // Compute eligible minutes the same way getChatEligibleMinutes() does:
    //   custom sessions capped at 120 min, timer/pomodoro uncapped
    const unsubSessions = subscribeToTodaySessions(user.uid, today, (sessions) => {
      const custom = sessions
        .filter(s => s.type === 'custom')
        .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
      const timer = sessions
        .filter(s => s.type !== 'custom')
        .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

      // Custom cap is ALREADY in place — DO NOT change
      const eligible = Math.min(custom, 120) + timer;
      setStudyMinutes(eligible);
    });

    // ── Subscribe to today's vocab count (BST-correct) ────────────────────
    const unsubVocab = subscribeToTodayVocabCount(user.uid, (count) => {
      setVocabCount(count);
    });

    return () => {
      unsubSessions();
      unsubVocab();
    };
  }, [user?.uid]);

  const studyPct = Math.min(100, Math.round((studyMinutes / COUPLE_CONFIG.chatUnlockMinutes) * 100));
  const vocabPct = Math.min(100, Math.round((vocabCount   / COUPLE_CONFIG.chatUnlockVocab)   * 100));

  const isUnlocked =
    studyMinutes >= COUPLE_CONFIG.chatUnlockMinutes &&
    vocabCount   >= COUPLE_CONFIG.chatUnlockVocab;

  return {
    studyMinutes,
    studyThreshold: COUPLE_CONFIG.chatUnlockMinutes,
    studyPct,

    vocabCount,
    vocabThreshold: COUPLE_CONFIG.chatUnlockVocab,
    vocabPct,

    isUnlocked,
  };
}
