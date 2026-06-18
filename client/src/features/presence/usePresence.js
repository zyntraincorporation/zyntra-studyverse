import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store';
import {
  updatePresence, clearPresence,
  subscribeToPresence, subscribeToPartnerPresence,
  getTodayStudyMinutes,
} from '../../firebase/db';

export function usePresence() {
  const user    = useAuthStore(s => s.user);
  const partner = useAuthStore(s => s.partner);
  const [myPresence,      setMyPresence]      = useState(null);
  const [partnerPresence, setPartnerPresence] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToPresence(user.uid, setMyPresence);
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    if (!partner?.uid) return;
    const unsub = subscribeToPartnerPresence(partner.uid, setPartnerPresence);
    return unsub;
  }, [partner?.uid]);

  const startStudying = useCallback(async (subject, chapter = null) => {
    if (!user?.uid) return;
    await updatePresence(user.uid, {
      isStudying: true,
      subject,
      chapter,
      startedAt: new Date().toISOString(),
    });
  }, [user?.uid]);

  const stopStudying = useCallback(async () => {
    if (!user?.uid) return;
    const minutes = await getTodayStudyMinutes(user.uid);
    await updatePresence(user.uid, {
      isStudying: false,
      subject: null,
      chapter: null,
      startedAt: null,
      studyMinutesToday: minutes,
    });
  }, [user?.uid]);

  return { myPresence, partnerPresence, startStudying, stopStudying };
}
