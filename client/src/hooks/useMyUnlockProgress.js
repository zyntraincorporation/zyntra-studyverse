import { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import { subscribeToChatRoom, subscribeToTodayVocabCount } from '../firebase/db';
import { COUPLE_CONFIG } from '../lib/constants';

export function useMyUnlockProgress() {
  const user = useAuthStore(s => s.user);
  const [studyMinutes, setStudyMinutes] = useState(0);
  const [vocabCount, setVocabCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    // Subscribe to chat room to get eligible study minutes
    const unsubChat = subscribeToChatRoom((data) => {
      if (data) {
        setStudyMinutes(data[`${user.uid}_minutes`] || 0);
      }
    });

    // Subscribe to today's vocab count
    const unsubVocab = subscribeToTodayVocabCount(user.uid, (count) => {
      setVocabCount(count);
    });

    return () => {
      unsubChat();
      unsubVocab();
    };
  }, [user?.uid]);

  const studyPct = Math.min(100, Math.round((studyMinutes / COUPLE_CONFIG.chatUnlockMinutes) * 100));
  const vocabPct = Math.min(100, Math.round((vocabCount / COUPLE_CONFIG.chatUnlockVocab) * 100));
  
  const isUnlocked = studyMinutes >= COUPLE_CONFIG.chatUnlockMinutes && vocabCount >= COUPLE_CONFIG.chatUnlockVocab;

  return {
    studyMinutes,
    studyThreshold: COUPLE_CONFIG.chatUnlockMinutes,
    studyPct,
    
    vocabCount,
    vocabThreshold: COUPLE_CONFIG.chatUnlockVocab,
    vocabPct,
    
    isUnlocked
  };
}
