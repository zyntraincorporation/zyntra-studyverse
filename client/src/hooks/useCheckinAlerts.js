import { useEffect, useRef } from 'react';
import { useAuthStore, useUIStore } from '../store';
import {
  getScheduleEntries,
  getRoutineDefinitions,
  saveSessionLog,
  getSessionLog,
  updateScheduleEntry,
} from '../firebase/db';
import { getBSTDateString, getBSTDayName, getBSTTime } from '../lib/bst';

/**
 * Unified check-in alert hook.
 * Runs every 60 seconds and:
 *   1. Fires reminder notifications for upcoming routine sessions (configurable reminderMinutes)
 *   2. Fires reminder notifications for upcoming one-off schedule entries (10m + 0m)
 *   3. Auto-marks overdue routine sessions as "missed" if no log exists
 *   4. Auto-marks overdue pending schedule entries as "missed"
 */
export function useCheckinAlerts() {
  const user        = useAuthStore(s => s.user);
  const toast       = useUIStore(s => s.toast);
  const notifiedSet = useRef(new Set());

  useEffect(() => {
    if (!user?.uid) return;

    const notify = (msg, tag = 'checkin_alert') => {
      toast(msg, 'info');
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('Study Reminder', {
            body: msg,
            icon: '/android-chrome-192x192.png',
            tag,
          });
        } catch (_) {}
      }
    };

    const checkAlerts = async () => {
      try {
        const today      = getBSTDateString();
        const dayName    = getBSTDayName();
        const { hour, minute } = getBSTTime();
        const currentMins = hour * 60 + minute;

        // ── 1. Routine definitions ─────────────────────────────────────────
        const routineDefs = await getRoutineDefinitions(user.uid);
        const todayDefs   = routineDefs.filter(
          def => def.isActive && (def.daysOfWeek || []).includes(dayName)
        );

        for (const def of todayDefs) {
          if (!def.startTime) continue;
          const [startH, startM] = def.startTime.split(':').map(Number);
          const startMins  = startH * 60 + startM;
          const endMins    = startMins + (def.durationMinutes || 60);
          const reminderMins = def.reminderMinutes ?? 10;
          const diff = startMins - currentMins;

          // ── Reminder notification ─────────────────────────────────────
          if (reminderMins > 0 && diff === reminderMins) {
            const key = `routine-${def.id}-${today}-remind${reminderMins}`;
            if (!notifiedSet.current.has(key)) {
              notifiedSet.current.add(key);
              const name = def.title || def.subject;
              notify(
                `⏰ "${name}" starts in ${reminderMins} minutes!`,
                `routine-remind-${def.id}`
              );
            }
          }
          // Session start notification
          if (diff === 0) {
            const key = `routine-${def.id}-${today}-start`;
            if (!notifiedSet.current.has(key)) {
              notifiedSet.current.add(key);
              notify(
                `📚 "${def.title || def.subject}" has started!`,
                `routine-start-${def.id}`
              );
            }
          }

          // ── Auto-miss: overdue with no log ─────────────────────────────
          if (currentMins > endMins) {
            const missKey = `routine-${def.id}-${today}-automiss`;
            if (!notifiedSet.current.has(missKey)) {
              notifiedSet.current.add(missKey); // Prevent multiple Firestore writes
              try {
                const existing = await getSessionLog(user.uid, def.id, today);
                if (!existing) {
                  await saveSessionLog(user.uid, {
                    routineDefinitionId: def.id,
                    date:            today,
                    subject:         def.subject,
                    chapter:         def.chapter  || '',
                    topic:           def.topic    || '',
                    title:           def.title    || def.subject,
                    startTime:       def.startTime,
                    durationMinutes: def.durationMinutes,
                    status:          'missed',
                    missedAt:        new Date().toISOString(),
                  });
                }
              } catch (err) {
                console.warn('[checkinAlerts] auto-miss routine failed:', err);
              }
            }
          }
        }

        // ── 2. One-off schedule entries ───────────────────────────────────
        const entries = await getScheduleEntries(user.uid, today);

        for (const entry of entries) {
          if (entry.status && entry.status !== 'pending') continue;
          if (!entry.time) continue;

          const [startH, startM] = entry.time.split(':').map(Number);
          const startMins = startH * 60 + startM;
          const endMins   = entry.endTime
            ? (() => { const [eh, em] = entry.endTime.split(':').map(Number); return eh * 60 + em; })()
            : startMins + 120;

          const diff = startMins - currentMins;

          // 15 min warning (schedule entries always use 15m for backwards compat)
          if (diff === 15) {
            const key = `sched-${entry.id}-${today}-15m`;
            if (!notifiedSet.current.has(key)) {
              notifiedSet.current.add(key);
              notify(`⏰ "${entry.subject || 'Scheduled session'}" starts in 15 minutes.`);
            }
          }
          // Session start
          if (diff === 0) {
            const key = `sched-${entry.id}-${today}-start`;
            if (!notifiedSet.current.has(key)) {
              notifiedSet.current.add(key);
              notify(`📚 Your scheduled study session has started!`);
            }
          }

          // Auto-miss overdue pending entries
          if (currentMins > endMins) {
            const missKey = `sched-${entry.id}-${today}-automiss`;
            if (!notifiedSet.current.has(missKey)) {
              notifiedSet.current.add(missKey);
              try {
                await updateScheduleEntry(user.uid, entry.id, { status: 'missed' });
              } catch (err) {
                console.warn('[checkinAlerts] auto-miss schedule failed:', err);
              }
            }
          }
        }
      } catch (err) {
        console.error('[checkinAlerts] check failed:', err);
      }
    };

    // Run immediately, then every 60 seconds
    checkAlerts();
    const intervalId = setInterval(checkAlerts, 60_000);
    return () => clearInterval(intervalId);
  }, [user?.uid, toast]);
}
