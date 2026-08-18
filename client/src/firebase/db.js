// ─────────────────────────────────────────────────────────────────────────────
// Firestore Database Service — ZYNTRA StudyVerse
// All Firestore operations in one place, organized by domain
// ─────────────────────────────────────────────────────────────────────────────
import {
  collection, doc, setDoc, getDoc, getDocs, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, Timestamp, writeBatch,
  runTransaction, increment, startAfter, getCountFromServer,
} from 'firebase/firestore';
import { db } from './config';
import { getBSTDateString, getBSTYearMonth, getDateRange } from '../lib/bst';
import { COUPLE_CONFIG, LEADERBOARD_SCORE_WEIGHTS } from '../lib/constants';

// ── Couple Chat Config (must be at module top to avoid TDZ in all functions) ──
const { chatRoomId, chatWindowMinutes, messageTTLMs } = COUPLE_CONFIG;
const CHAT_SESSION_DURATION_MS = chatWindowMinutes * 60 * 1000;

// ── Helper ────────────────────────────────────────────────────────────────────

const col  = (path)       => collection(db, path);
const ref  = (path, id)   => doc(db, path, id);
const now  = ()           => serverTimestamp();
const tsNow = ()          => Timestamp.now();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// USERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function createOrUpdateUser(uid, data) {
  await setDoc(ref('users', uid), { ...data, updatedAt: now() }, { merge: true });
}

export async function getUserProfile(uid) {
  const snap = await getDoc(ref('users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function findUserByEmail(email) {
  const q    = query(col('users'), where('email', '==', email), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function saveWidgetLayout(uid, layout) {
  await setDoc(
    doc(db, 'users', uid, 'settings', 'dashboard'),
    { layout, updatedAt: now() },
    { merge: true }
  );
}

export async function getWidgetLayout(uid) {
  const snap = await getDoc(doc(db, 'users', uid, 'settings', 'dashboard'));
  return snap.exists() ? snap.data().layout : null;
}

export async function saveFCMToken(uid, token) {
  await updateDoc(ref('users', uid), { fcmToken: token, updatedAt: now() });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SESSIONS (scheduled + custom + practice)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function saveSession(userId, sessionData) {
  // For scheduled sessions use deterministic ID to allow upsert
  if (sessionData.type === 'scheduled' && sessionData.date && sessionData.sessionNumber) {
    const id = `${userId}_${sessionData.date}_S${sessionData.sessionNumber}`;
    await setDoc(ref('sessions', id), {
      ...sessionData, userId, createdAt: now(),
    }, { merge: true });
    return id;
  }
  // Custom / practice → auto ID
  const docRef = await addDoc(col('sessions'), {
    ...sessionData, userId, createdAt: now(),
  });
  return docRef.id;
}

export async function getTodaySessions(userId, date) {
  const q = query(
    col('sessions'),
    where('userId', '==', userId),
    where('date',   '==', date),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getSessionsByDateRange(userId, startDate, endDate) {
  const q = query(
    col('sessions'),
    where('userId', '==', userId),
    where('date',   '>=', startDate),
    where('date',   '<=', endDate),
    orderBy('date', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteSession(sessionId) {
  await deleteDoc(ref('sessions', sessionId));
}

export async function getTodayStudyMinutes(userId) {
  const today    = getBSTDateString();
  const sessions = await getTodaySessions(userId, today);
  const total    = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const custom   = sessions
    .filter(s => s.type === 'custom')
    .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  return { total, custom, timer: total - custom };
}

// Chat eligible minutes: custom capped at 120 min, timer/pomodoro uncapped
export async function getChatEligibleMinutes(userId) {
  const { custom, timer } = await getTodayStudyMinutes(userId);
  return Math.min(custom, 120) + timer;
}

export function subscribeToTodaySessions(userId, date, callback) {
  const q = query(
    col('sessions'),
    where('userId', '==', userId),
    where('date',   '==', date),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHECK-INS (morning routine)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function saveCheckin(userId, date, data) {
  const id = `${userId}_${date}`;
  await setDoc(ref('checkins', id), { ...data, userId, date, updatedAt: now() }, { merge: true });
}

export async function getTodayCheckin(userId, date) {
  const id   = `${userId}_${date}`;
  const snap = await getDoc(ref('checkins', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getCheckinHistory(userId, days = 30) {
  const dates    = getDateRange(days).map(d => d.date);
  const startDate = dates[0];
  const q = query(
    col('checkins'),
    where('userId', '==', userId),
    where('date',   '>=', startDate),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHAPTERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getChapters(userId) {
  if (!userId) return [];
  try {
    const q = query(col('chapters'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const chapters = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Client-side sorting avoids requiring multi-field composite indexes
    chapters.sort((a, b) => {
      const subjA = a.subject || '';
      const subjB = b.subject || '';
      if (subjA !== subjB) return subjA.localeCompare(subjB);
      return (Number(a.chapterNumber) || 0) - (Number(b.chapterNumber) || 0);
    });
    return chapters;
  } catch (err) {
    console.error('[getChapters] Firestore query error:', err);
    throw err;
  }
}

export function subscribeChapters(userId, onNext, onError) {
  if (!userId) return () => {};
  const q = query(col('chapters'), where('userId', '==', userId));
  return onSnapshot(q, (snap) => {
    const chapters = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    chapters.sort((a, b) => {
      const subjA = a.subject || '';
      const subjB = b.subject || '';
      if (subjA !== subjB) return subjA.localeCompare(subjB);
      return (Number(a.chapterNumber) || 0) - (Number(b.chapterNumber) || 0);
    });
    if (onNext) onNext(chapters);
  }, (err) => {
    console.error('[subscribeChapters] listener error:', err);
    if (onError) onError(err);
  });
}

export async function updateChapter(userId, subject, chapterNumber, data) {
  const id = `${userId}_${subject}_${chapterNumber}`;
  await setDoc(ref('chapters', id), {
    ...data, userId, subject, chapterNumber, lastUpdated: now(),
  }, { merge: true });
}

export async function bulkUpdateChapters(userId, updates) {
  const chunkSize = 400;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach(u => {
      const id = `${userId}_${u.subject}_${u.chapterNumber}`;
      batch.set(ref('chapters', id), { ...u, userId, lastUpdated: now() }, { merge: true });
    });
    await batch.commit();
  }
}

export async function seedChapters(userId, chapters) {
  const chunkSize = 400;
  for (let i = 0; i < chapters.length; i += chunkSize) {
    const chunk = chapters.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach(ch => {
      const id = `${userId}_${ch.subject}_${ch.chapterNumber}`;
      batch.set(ref('chapters', id), {
        userId,
        subject:         ch.subject,
        chapterNumber:   ch.chapterNumber,
        chapterName:     ch.chapterName,
        status:          ch.status || 'not_started',
        completedTopics: ch.completedTopics || 0,
        totalTopics:     ch.totalTopics || null,
        lastUpdated:     now(),
      }, { merge: true });
    });
    await batch.commit();
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NOTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function saveNote(userId, date, content) {
  const id = `${userId}_${date}`;
  await setDoc(ref('notes', id), { userId, date, content, updatedAt: now() }, { merge: true });
}

export async function getTodayNote(userId, date) {
  const snap = await getDoc(ref('notes', `${userId}_${date}`));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getNotes(userId, pageSize = 30, lastDoc = null) {
  let q = query(
    col('notes'),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(pageSize)
  );
  if (lastDoc) q = query(q, startAfter(lastDoc));
  const snap = await getDocs(q);
  return {
    items:   snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === pageSize,
  };
}

export async function deleteNote(userId, date) {
  await deleteDoc(ref('notes', `${userId}_${date}`));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MISTAKES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getMistakes(userId, { subject, resolved, days = 90 } = {}) {
  const startDate = getBSTDateString(new Date(Date.now() - days * 86400000));
  let q = query(
    col('mistakes'),
    where('userId', '==', userId),
    where('date',   '>=', startDate),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  let docs   = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (subject  !== undefined && subject)            docs = docs.filter(m => m.subject  === subject);
  if (resolved !== undefined && resolved !== null)  docs = docs.filter(m => m.resolved === resolved);
  return docs;
}

export async function getMistakeStats(userId) {
  const q    = query(col('mistakes'), where('userId', '==', userId));
  const snap = await getDocs(q);
  const all  = snap.docs.map(d => d.data());
  const bySubject = {}, byType = {};
  let unresolved = 0;
  all.forEach(m => {
    bySubject[m.subject]    = (bySubject[m.subject]    || 0) + 1;
    byType[m.mistakeType]   = (byType[m.mistakeType]   || 0) + 1;
    if (!m.resolved) unresolved++;
  });
  return { total: all.length, unresolved, bySubject, byType };
}

export async function createMistake(userId, data) {
  const docRef = await addDoc(col('mistakes'), {
    ...data, userId, date: data.date || getBSTDateString(), resolved: false, createdAt: now(),
  });
  return docRef.id;
}

export async function updateMistake(mistakeId, data) {
  await updateDoc(ref('mistakes', mistakeId), { ...data, updatedAt: now() });
}

export async function deleteMistake(mistakeId) {
  await deleteDoc(ref('mistakes', mistakeId));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REVISIONS (spaced repetition)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 5-level spaced repetition: 1 → 3 → 7 → 14 → 30 days
const REVISION_INTERVALS = [1, 3, 7, 14, 30];

function getNextDueDate(revisionCount, today) {
  const idx      = Math.min(revisionCount - 1, REVISION_INTERVALS.length - 1);
  const interval = REVISION_INTERVALS[idx];
  const d = new Date(`${today}T00:00:00+06:00`);
  d.setUTCDate(d.getUTCDate() + interval);
  return getBSTDateString(d);
}

// Statuses that are eligible for revision scheduling
const REVISED_STATUSES = [
  'completed', 'revised', // legacy
  'revised_1', 'revised_2', 'revised_3', 'revised_4', 'revised_5',
];

export async function getDueRevisions(userId) {
  if (!userId) return { dueToday: [], upcoming: [], today: getBSTDateString(), completionPct: 0, totalEligible: 0, totalRevised5: 0 };
  const today = getBSTDateString();
  // Get all chapters for this user and filter eligible revision statuses in memory
  const chapQ = query(
    col('chapters'),
    where('userId', '==', userId)
  );
  const chapSnap = await getDocs(chapQ);
  const allChapters = chapSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const chapters = allChapters.filter(ch => REVISED_STATUSES.includes(ch.status));

  // Get all revision logs
  const revQ = query(col('revisions'), where('userId', '==', userId), orderBy('revisedAt', 'desc'));
  const revSnap = await getDocs(revQ);
  const allLogs = revSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Latest log per chapter
  const latestByChapter = {};
  allLogs.forEach(log => {
    if (!latestByChapter[log.chapterId]) latestByChapter[log.chapterId] = log;
  });

  const dueToday = [], upcoming = [];
  chapters.forEach(ch => {
    const latest   = latestByChapter[ch.id];
    const count    = latest ? latest.revisionCount : 0;

    // After 5 revisions, chapter is fully revised — skip
    if (count >= 5) return;

    const lastDate = latest
      ? (latest.revisedAt?.toDate?.() || new Date(latest.revisedAt)).toISOString().slice(0, 10)
      : (ch.lastUpdated?.toDate?.() || new Date()).toISOString().slice(0, 10);

    const interval = REVISION_INTERVALS[Math.min(count, REVISION_INTERVALS.length - 1)];
    const d = new Date(`${lastDate}T00:00:00+06:00`);
    d.setUTCDate(d.getUTCDate() + interval);
    const dueDate = getBSTDateString(d);

    const item = {
      chapterId: ch.id, subject: ch.subject, chapterNumber: ch.chapterNumber,
      chapterName: ch.chapterName, revisionCount: count, dueDate,
      overdue: dueDate < today,
      nextInterval: REVISION_INTERVALS[Math.min(count + 1, REVISION_INTERVALS.length - 1)],
    };
    if (dueDate <= today) dueToday.push(item);
    else {
      const weekOut = new Date(`${today}T00:00:00+06:00`);
      weekOut.setUTCDate(weekOut.getUTCDate() + 14); // show 2 weeks ahead
      if (dueDate <= getBSTDateString(weekOut)) upcoming.push(item);
    }
  });

  // Sort due today: overdue first, then by dueDate
  dueToday.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const totalEligible = chapters.length;
  const totalRevised5 = chapters.filter(ch => {
    const st = ch.status;
    return st === 'revised_5' || (latestByChapter[ch.id]?.revisionCount >= 5);
  }).length;
  const completionPct = totalEligible ? Math.round((totalRevised5 / totalEligible) * 100) : 0;

  return { dueToday, upcoming, today, completionPct, totalEligible, totalRevised5 };
}

export async function logRevision(userId, data) {
  const today    = getBSTDateString();
  const prevCount = (await getDocs(
    query(col('revisions'), where('userId', '==', userId), where('chapterId', '==', data.chapterId))
  )).size;
  const revisionCount = prevCount + 1;
  // After 5 revisions nextDueDate is null (fully revised)
  const nextDueDate = revisionCount < REVISION_INTERVALS.length
    ? getNextDueDate(revisionCount, today)
    : null;

  const docRef = await addDoc(col('revisions'), {
    ...data, userId, revisionCount, nextDueDate, revisedAt: now(),
  });

  // Update chapter status to revised_N (capped at revised_5)
  const revStatus = revisionCount >= 5 ? 'revised_5' : `revised_${revisionCount}`;
  await setDoc(ref('chapters', data.chapterId), { status: revStatus, lastUpdated: now() }, { merge: true });

  return { id: docRef.id, revisionCount, nextDueDate };
}

export async function getRevisionHistory(userId, days = 30) {
  const cutoff = new Date(Date.now() - days * 86400000);
  const q = query(
    col('revisions'),
    where('userId', '==', userId),
    where('revisedAt', '>=', Timestamp.fromDate(cutoff)),
    orderBy('revisedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MONTHLY TARGETS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getTargets(userId, yearMonth) {
  const snap = await getDoc(doc(db, 'targets', userId, 'months', yearMonth));
  return snap.exists() ? snap.data() : { chapters: [] };
}

export async function saveTargets(userId, yearMonth, chapters) {
  await setDoc(doc(db, 'targets', userId, 'months', yearMonth), { chapters, updatedAt: now() });
}

export async function updateTargetItem(userId, yearMonth, index, data) {
  const current = await getTargets(userId, yearMonth);
  const chapters = [...(current.chapters || [])];
  chapters[index] = { ...chapters[index], ...data };
  await saveTargets(userId, yearMonth, chapters);
}

export async function getTargetMonths(userId) {
  const snap = await getDocs(collection(db, 'targets', userId, 'months'));
  return snap.docs.map(d => d.id).sort();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOCABULARY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const vocabWordsCol  = (userId) => collection(db, 'vocabulary', userId, 'words');
const vocabReviewCol = (userId) => collection(db, 'vocabulary', userId, 'reviews');

export async function getVocabularyWords(userId, { search, sort, filter, pageSize = 20, lastDoc: ld = null } = {}) {
  let q = query(vocabWordsCol(userId), where('isArchived', '==', false));
  if (filter === 'due')      q = query(vocabWordsCol(userId), where('nextReviewAt', '<=', tsNow()), where('isArchived', '==', false));
  if (filter === 'mastered') q = query(vocabWordsCol(userId), where('masteryLevel', '>=', 80), where('isArchived', '==', false));
  if (filter === 'hard')     q = query(vocabWordsCol(userId), where('difficulty',   '>=', 4),  where('isArchived', '==', false));

  const sortField = sort === 'mastery' ? 'masteryLevel' : sort === 'due' ? 'nextReviewAt' : 'createdAt';
  const sortDir   = sort === 'mastery' ? 'desc' : sort === 'due' ? 'asc' : 'desc';
  q = query(q, orderBy(sortField, sortDir), limit(pageSize));
  if (ld) q = query(q, startAfter(ld));

  const snap  = await getDocs(q);
  let docs    = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (search) {
    const s = search.toLowerCase();
    docs = docs.filter(w => w.word.toLowerCase().includes(s) || w.banglaMeaning.toLowerCase().includes(s));
  }
  return { words: docs, lastDoc: snap.docs[snap.docs.length - 1] || null, hasMore: snap.docs.length === pageSize };
}

export async function createVocabWord(userId, data) {
  const docRef = await addDoc(vocabWordsCol(userId), {
    ...data, userId, isArchived: false, masteryLevel: 0, totalReviews: 0,
    correctCount: 0, failCount: 0, correctStreak: 0, reviewInterval: 1,
    nextReviewAt: tsNow(), createdAt: now(), updatedAt: now(),
  });
  return docRef.id;
}

export async function updateVocabWord(userId, wordId, data) {
  await updateDoc(doc(db, 'vocabulary', userId, 'words', wordId), { ...data, updatedAt: now() });
}

export async function deleteVocabWord(userId, wordId) {
  await deleteDoc(doc(db, 'vocabulary', userId, 'words', wordId));
}

export async function getVocabRevisionQueue(userId) {
  const q = query(
    vocabWordsCol(userId),
    where('nextReviewAt', '<=', tsNow()),
    where('isArchived',   '==', false),
    orderBy('nextReviewAt', 'asc'),
    limit(30)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getYesterdayVocabWords(userId) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);
  const q = query(
    vocabWordsCol(userId),
    where('createdAt', '>=', Timestamp.fromDate(yesterday)),
    where('createdAt', '<=', Timestamp.fromDate(endOfYesterday)),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60];

function getNextInterval(currentInterval, result, confidence) {
  const idx  = REVIEW_INTERVALS.indexOf(currentInterval);
  const base = idx === -1 ? 0 : idx;
  if (result === 'correct' && confidence >= 4) return REVIEW_INTERVALS[Math.min(base + 1, REVIEW_INTERVALS.length - 1)];
  if (result === 'correct' && confidence >= 2) return REVIEW_INTERVALS[base];
  return REVIEW_INTERVALS[0];
}

export async function submitVocabReview(userId, { wordId, mode, result, confidence, responseMs }) {
  const wordRef  = doc(db, 'vocabulary', userId, 'words', wordId);
  const wordSnap = await getDoc(wordRef);
  if (!wordSnap.exists()) throw new Error('Word not found');
  const word = wordSnap.data();

  const isCorrect    = result === 'correct';
  const newCorrect   = (word.correctCount  || 0) + (isCorrect ? 1 : 0);
  const newFail      = (word.failCount     || 0) + (isCorrect ? 0 : 1);
  const newTotal     = (word.totalReviews  || 0) + 1;
  const newStreak    = isCorrect ? (word.correctStreak || 0) + 1 : 0;
  const newInterval  = getNextInterval(word.reviewInterval || 1, result, confidence);
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  await updateDoc(wordRef, {
    correctCount:   newCorrect,
    failCount:      newFail,
    totalReviews:   newTotal,
    correctStreak:  newStreak,
    reviewInterval: newInterval,
    nextReviewAt:   Timestamp.fromDate(nextReviewAt),
    lastReviewedAt: now(),
    masteryLevel:   Math.min(100, Math.round((newCorrect / newTotal) * 100)),
    updatedAt:      now(),
  });

  await addDoc(vocabReviewCol(userId), {
    wordId, userId, mode, result, confidence, responseMs: responseMs || null,
    reviewedAt: now(),
  });
}

export async function getVocabStats(userId) {
  const [wordsSnap, reviewsSnap] = await Promise.all([
    getDocs(query(vocabWordsCol(userId), where('isArchived', '==', false))),
    getDocs(query(vocabReviewCol(userId), orderBy('reviewedAt', 'desc'), limit(200))),
  ]);
  const words   = wordsSnap.docs.map(d => d.data());
  const reviews = reviewsSnap.docs.map(d => d.data());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayReviews = reviews.filter(r => r.reviewedAt?.toDate?.() >= today).length;
  return {
    totalWords:    words.length,
    masteredWords: words.filter(w => w.masteryLevel >= 80).length,
    dueWords:      words.filter(w => w.nextReviewAt?.toDate?.() <= new Date()).length,
    todayReviews,
    avgMastery:    words.length ? Math.round(words.reduce((s, w) => s + (w.masteryLevel || 0), 0) / words.length) : 0,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PRESENCE (real-time)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function updatePresence(userId, data) {
  await setDoc(ref('presence', userId), { ...data, lastSeen: now() }, { merge: true });
}

export async function clearPresence(userId) {
  await setDoc(ref('presence', userId), {
    isStudying: false, subject: null, chapter: null, startedAt: null, lastSeen: now(),
  }, { merge: true });
}

export function subscribeToPresence(userId, callback) {
  return onSnapshot(ref('presence', userId), snap => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export function subscribeToPartnerPresence(partnerId, callback) {
  return onSnapshot(ref('presence', partnerId), snap => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export function subscribeToMessages(callback, limitCount = 60) {
  const q = query(
    collection(db, 'chat', chatRoomId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(limitCount)
  );
  return onSnapshot(q, { includeMetadataChanges: false }, snap => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(msgs);
  });
}

export function subscribeToTodayVocabCount(userId, callback) {
  // Use BST-aware midnight so words added on the BST calendar day are counted
  // regardless of the device's local timezone.
  const BST_OFFSET_MS = 6 * 60 * 60 * 1000;
  const nowInBST = new Date(Date.now() + BST_OFFSET_MS);
  // BST midnight as a UTC-based Date
  const bstMidnightUTC = new Date(
    Date.UTC(nowInBST.getUTCFullYear(), nowInBST.getUTCMonth(), nowInBST.getUTCDate())
    - BST_OFFSET_MS
  );
  // BST end-of-day (23:59:59.999 BST)
  const bstEndOfDayUTC = new Date(bstMidnightUTC.getTime() + 24 * 60 * 60 * 1000 - 1);

  const q = query(
    vocabWordsCol(userId),
    where('createdAt', '>=', Timestamp.fromDate(bstMidnightUTC)),
    where('createdAt', '<=', Timestamp.fromDate(bstEndOfDayUTC))
  );

  return onSnapshot(q, snap => {
    callback(snap.size);
  });
}

/**
 * Subscribes to a partner's today vocabulary count (BST-aware).
 * Used by the unlock gate to check if the partner has also reached 20 vocab.
 */
export function subscribeToPartnerVocabCount(partnerUid, callback) {
  const BST_OFFSET_MS = 6 * 60 * 60 * 1000;
  const nowInBST = new Date(Date.now() + BST_OFFSET_MS);
  const bstMidnightUTC = new Date(
    Date.UTC(nowInBST.getUTCFullYear(), nowInBST.getUTCMonth(), nowInBST.getUTCDate())
    - BST_OFFSET_MS
  );
  const bstEndOfDayUTC = new Date(bstMidnightUTC.getTime() + 24 * 60 * 60 * 1000 - 1);

  const q = query(
    collection(db, 'vocabulary', partnerUid, 'words'),
    where('createdAt', '>=', Timestamp.fromDate(bstMidnightUTC)),
    where('createdAt', '<=', Timestamp.fromDate(bstEndOfDayUTC))
  );

  return onSnapshot(q, snap => {
    callback(snap.size);
  });
}

// Paginate — fetch older messages before a given cursor doc snapshot
export async function fetchOlderMessages(oldestDocId, limitCount = 30) {
  const cursorRef = doc(db, 'chat', chatRoomId, 'messages', oldestDocId);
  const cursorSnap = await getDoc(cursorRef);
  if (!cursorSnap.exists()) return [];
  const { endBefore, limitToLast } = await import('firebase/firestore');
  const q2 = query(
    collection(db, 'chat', chatRoomId, 'messages'),
    orderBy('createdAt', 'asc'),
    endBefore(cursorSnap),
    limitToLast(limitCount)
  );
  const snap = await getDocs(q2);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// replyTo: { id, text, senderName } — optional, stored only when replying
// isEmergency: true → stored in main chat but excluded from unread badge counts
export async function sendMessage(senderId, text, mediaUrl = null, mediaType = null, replyTo = null, isEmergency = false) {
  const expiresAt = new Date(Date.now() + messageTTLMs);
  await addDoc(collection(db, 'chat', chatRoomId, 'messages'), {
    senderId, text: text || null, mediaUrl, mediaType,
    ...(replyTo    ? { replyTo }          : {}),
    ...(isEmergency ? { isEmergency: true } : {}),
    createdAt: now(), expiresAt: Timestamp.fromDate(expiresAt),
  });
}

// ── Unread Count ──────────────────────────────────────────────────────────────

export async function updateLastRead(userId) {
  try {
    await setDoc(
      doc(db, 'users', userId),
      { chatLastReadAt: now() },
      { merge: true }
    );
  } catch (err) {
    console.error('[chat] updateLastRead failed:', err);
  }
}

export function subscribeToUnreadCount(userId, callback) {
  // Fully-reactive two-layer listener:
  // Layer 1 — watch the user doc for chatLastReadAt changes
  // Layer 2 — watch the message collection after that timestamp
  // Both layers fire instantly so the badge is always accurate.
  let innerUnsub = null;

  const outerUnsub = onSnapshot(doc(db, 'users', userId), (snap) => {
    // Clean up previous inner listener whenever lastReadAt changes
    if (innerUnsub) { innerUnsub(); innerUnsub = null; }

    if (!snap.exists()) { callback(0); return; }
    const lastReadAt = snap.data().chatLastReadAt;

    try {
      const q = lastReadAt
        ? query(
            collection(db, 'chat', chatRoomId, 'messages'),
            where('senderId', '!=', userId),
            where('createdAt', '>', lastReadAt),
            orderBy('senderId'),
            orderBy('createdAt', 'asc'),
            limit(99)
          )
        : query(
            collection(db, 'chat', chatRoomId, 'messages'),
            where('senderId', '!=', userId),
            orderBy('senderId'),
            orderBy('createdAt', 'desc'),
            limit(99)
          );

      innerUnsub = onSnapshot(q, (msgSnap) => {
        // Emergency messages are excluded from the unread badge
        const count = msgSnap.docs.filter(d => !d.data().isEmergency).length;
        callback(count);
      }, () => callback(0));
    } catch {
      callback(0);
    }
  });

  // Return a combined cleanup function
  return () => {
    outerUnsub();
    if (innerUnsub) innerUnsub();
  };
}

// ── Real-time user stats (fixes partner study progress sync) ──────────────────

export function subscribeToUserStats(uid, callback) {
  return onSnapshot(doc(db, 'users', uid), snap => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

// ── Push Notification Sender (calls Netlify function) ─────────────────────────

export async function sendPushNotification(toUid, { title, body, type = 'default', data = {} }) {
  try {
    // Get recipient's FCM token from Firestore
    const userSnap = await getDoc(doc(db, 'users', toUid));
    if (!userSnap.exists()) return;
    const fcmToken = userSnap.data()?.fcmToken;
    if (!fcmToken) return; // User hasn't granted push permission

    const pushUrl = import.meta.env.VITE_PUSH_FUNCTION_URL || '/.netlify/functions/send-push';
    const res = await fetch(pushUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: fcmToken,
        title,
        body,
        data: { type, ...data },
      }),
    });

    const result = await res.json();

    // If token is invalid, clear it from Firestore
    if (result.reason === 'invalid_token') {
      await updateDoc(doc(db, 'users', toUid), { fcmToken: null });
    }
  } catch (err) {
    // Non-fatal — push is best-effort
    console.warn('[push] Failed to send notification:', err);
  }
}

// (Emergency Chat removed — feature no longer needed)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LEADERBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function updateLeaderboard(userId, date, entry) {
  await setDoc(ref('leaderboard', date), { [userId]: entry, updatedAt: now() }, { merge: true });
}

export function subscribeToDailyLeaderboard(date, callback) {
  return onSnapshot(ref('leaderboard', date), snap => {
    callback(snap.exists() ? snap.data() : {});
  });
}

export async function recalculateAndSaveLeaderboard(userId, displayName) {
  const today    = getBSTDateString();
  const sessions = await getTodaySessions(userId, today);
  // Custom sessions are EXCLUDED from leaderboard scoring
  const eligibleSessions = sessions.filter(s => s.type !== 'custom');
  const minutes   = eligibleSessions.reduce((s, sess) => s + (sess.durationMinutes || 0), 0);
  const completed = eligibleSessions.filter(s => s.completed !== false).length;
  const score = Math.min(100, minutes * 2 + completed * 10);
  await updateLeaderboard(userId, today, {
    displayName, studyMinutes: minutes, sessionsCompleted: completed,
    score, updatedAt: new Date().toISOString(),
  });
  
  // Also sync todayStudyMinutes to the user doc for real-time presence/stats sync
  await setDoc(ref('users', userId), { 
    todayStudyMinutes: minutes,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  return { minutes, completed, score };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHAT — Shared 45-minute session system
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Session state stored in chat/{chatRoomId} (the room doc itself):
//   sessionDate           : "YYYY-MM-DD" (BST) — which day this session belongs to
//   sessionStartedAt      : Timestamp | null    — when timer last resumed (null if paused/not started)
//   sessionPausedAt       : Timestamp | null    — when timer last paused
//   sessionAccumulatedMs  : number              — ms elapsed before last resume
//   sessionExpiredAt      : Timestamp | null    — set when 45 min consumed
//   activeUsers           : string[]            — UIDs currently in the chat window
//
// Remaining time formula (client-computed, server is authoritative):
//   if sessionExpiredAt  → 0
//   if sessionStartedAt && !sessionPausedAt:
//     elapsed = accumulated + (now - sessionStartedAt)
//   else:
//     elapsed = accumulated
//   remaining = max(0, 45min - elapsed)
//
// Timer runs when activeUsers.length > 0
// Timer pauses when activeUsers.length === 0
// Timer cannot be reset by refresh — sessionStartedAt is a server timestamp

export function subscribeToChatRoom(callback) {
  return onSnapshot(ref('chat', chatRoomId), snap => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : {});
  });
}

/**
 * Subscribes to the shared chat session state in real-time.
 * Returns everything needed to compute remaining time and session status.
 */
export function subscribeToChatSession(callback) {
  return onSnapshot(ref('chat', chatRoomId), snap => {
    if (!snap.exists()) {
      callback({ sessionDate: null, sessionStartedAt: null, sessionPausedAt: null,
                 sessionAccumulatedMs: 0, sessionExpiredAt: null, activeUsers: [] });
      return;
    }
    const d = snap.data();
    callback({
      sessionDate:          d.sessionDate          || null,
      sessionStartedAt:     d.sessionStartedAt     || null,
      sessionPausedAt:      d.sessionPausedAt      || null,
      sessionAccumulatedMs: d.sessionAccumulatedMs || 0,
      sessionExpiredAt:     d.sessionExpiredAt     || null,
      activeUsers:          d.activeUsers          || [],
    });
  });
}

/**
 * Called when a user enters the chat page.
 * Adds them to activeUsers and resumes the timer if it was paused.
 */
export async function enterChatSession(userId) {
  const today   = getBSTDateString();
  const roomRef = ref('chat', chatRoomId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef);
    const data = snap.exists() ? snap.data() : {};

    const sessionDate          = data.sessionDate || null;
    const sessionExpiredAt     = data.sessionExpiredAt || null;
    const sessionAccumulatedMs = data.sessionAccumulatedMs || 0;
    const sessionPausedAt      = data.sessionPausedAt || null;
    const sessionStartedAt     = data.sessionStartedAt || null;
    const activeUsers          = data.activeUsers || [];

    // If session expired or belongs to a different day — reset for today
    const isNewDay   = sessionDate !== today;
    const isExpired  = !!sessionExpiredAt;

    if (isNewDay || isExpired) {
      // Fresh session for today
      tx.set(roomRef, {
        ...data,
        sessionDate:          today,
        sessionStartedAt:     Timestamp.now(),
        sessionPausedAt:      null,
        sessionAccumulatedMs: 0,
        sessionExpiredAt:     null,
        activeUsers:          [userId],
      }, { merge: true });
      return;
    }

    // Add user to activeUsers (deduplicated)
    const newActiveUsers = activeUsers.includes(userId)
      ? activeUsers
      : [...activeUsers, userId];

    // If timer was paused and now someone is entering, resume it
    let updates = { activeUsers: newActiveUsers };
    if (sessionPausedAt && !sessionExpiredAt) {
      // Accumulate elapsed ms up to the pause point
      const pauseEpoch = sessionPausedAt.toDate ? sessionPausedAt.toDate().getTime() : sessionPausedAt;
      const startEpoch = sessionStartedAt ? (sessionStartedAt.toDate ? sessionStartedAt.toDate().getTime() : sessionStartedAt) : pauseEpoch;
      const additionalMs = Math.max(0, pauseEpoch - startEpoch);
      updates = {
        ...updates,
        sessionAccumulatedMs: sessionAccumulatedMs + additionalMs,
        sessionStartedAt:     Timestamp.now(),
        sessionPausedAt:      null,
      };
    } else if (!sessionStartedAt) {
      // No session started yet — start it now
      updates = { ...updates, sessionStartedAt: Timestamp.now(), sessionPausedAt: null };
    }

    tx.set(roomRef, updates, { merge: true });
  });
}

/**
 * Called when a user leaves the chat page.
 * Removes them from activeUsers. If activeUsers becomes empty, pauses the timer.
 */
export async function leaveChatSession(userId) {
  const roomRef = ref('chat', chatRoomId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef);
    if (!snap.exists()) return;
    const data = snap.data();

    const activeUsers      = data.activeUsers || [];
    const newActiveUsers   = activeUsers.filter(u => u !== userId);
    const sessionStartedAt = data.sessionStartedAt || null;
    const sessionPausedAt  = data.sessionPausedAt  || null;
    const accumulated      = data.sessionAccumulatedMs || 0;
    const sessionExpiredAt = data.sessionExpiredAt || null;

    // If already expired or paused, just update activeUsers
    if (sessionExpiredAt || sessionPausedAt || !sessionStartedAt) {
      tx.set(roomRef, { activeUsers: newActiveUsers }, { merge: true });
      return;
    }

    // If no one left in chat — pause the timer
    if (newActiveUsers.length === 0) {
      const startEpoch    = sessionStartedAt.toDate ? sessionStartedAt.toDate().getTime() : sessionStartedAt;
      const additionalMs  = Math.max(0, Date.now() - startEpoch);
      const newAccumulated = accumulated + additionalMs;
      const updates = {
        activeUsers:          newActiveUsers,
        sessionPausedAt:      Timestamp.now(),
        sessionAccumulatedMs: newAccumulated,
        // Check if this pause means we've exhausted the session
        ...(newAccumulated >= CHAT_SESSION_DURATION_MS
          ? { sessionExpiredAt: Timestamp.now() }
          : {}),
      };
      tx.set(roomRef, updates, { merge: true });
    } else {
      // Others still in chat — just remove this user, timer keeps running
      tx.set(roomRef, { activeUsers: newActiveUsers }, { merge: true });
    }
  });
}

/**
 * Marks the session as expired. Called by the client when remaining time hits 0.
 */
export async function expireChatSession() {
  const roomRef = ref('chat', chatRoomId);
  await setDoc(roomRef, { sessionExpiredAt: Timestamp.now() }, { merge: true });
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI REPORTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function saveAIReport(userId, data) {
  const docRef = await addDoc(collection(db, 'aiReports', userId, 'reports'), {
    ...data, generatedAt: now(),
  });
  return docRef.id;
}

export async function getLatestAIReport(userId) {
  const q = query(
    collection(db, 'aiReports', userId, 'reports'),
    orderBy('generatedAt', 'desc'),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function getAllAIReports(userId) {
  const q = query(
    collection(db, 'aiReports', userId, 'reports'),
    orderBy('generatedAt', 'desc'),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NOTIFICATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function createNotification(userId, { type, title, body, metadata = {} }) {
  await addDoc(collection(db, 'notifications', userId, 'items'), {
    type, title, body, metadata, read: false, createdAt: now(),
  });
}

export async function markNotificationRead(userId, notifId) {
  await updateDoc(doc(db, 'notifications', userId, 'items', notifId), { read: true });
}

export async function markAllNotificationsRead(userId) {
  const q    = query(collection(db, 'notifications', userId, 'items'), where('read', '==', false));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { read: true }));
  await batch.commit();
}

export function subscribeToNotifications(userId, callback) {
  const q = query(
    collection(db, 'notifications', userId, 'items'),
    orderBy('createdAt', 'desc'),
    limit(30)
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATS AGGREGATION (for charts)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getWeeklyStats(userId, days = 7) {
  const range    = getDateRange(days);
  const startDate = range[0].date;
  const sessions = await getSessionsByDateRange(userId, startDate, range[range.length - 1].date);
  const checkins = await getCheckinHistory(userId, days);
  const { WEEKLY_SCHEDULE } = await import('../lib/bst'); // bst is statically imported at top; bundler will reuse it


  const byDay = range.map(({ date, day }) => {
    const dayLogs     = sessions.filter(s => s.date === date);
    const completed   = dayLogs.filter(s => s.completed !== false);
    const missed      = dayLogs.filter(s => s.completed === false);
    const checkin     = checkins.find(c => c.date === date);
    const schedule    = WEEKLY_SCHEDULE[day];
    const isBreakDay  = !schedule;
    const scheduledCount = schedule ? Object.keys(schedule).length : 0;
    const extraMinutes   = dayLogs.filter(s => s.type === 'custom').reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

    let score = 0;
    if (!isBreakDay && scheduledCount > 0) score = Math.round((completed.length / scheduledCount) * 70);
    if (checkin?.wokeUpAt6)            score += 15;
    if (checkin?.studiedBeforeCollege) score += 15;
    if (isBreakDay) score = Math.min(100, 50 + Math.floor(extraMinutes / 30) * 10);

    return {
      date, day, isBreakDay, scheduledSessions: scheduledCount,
      completedSessions: completed.length, missedSessions: missed.length,
      extraStudyMinutes: extraMinutes, productivityScore: Math.min(100, score),
      wakeUpAt6: checkin?.wokeUpAt6 || false, preStudy: checkin?.studiedBeforeCollege || false,
      sessions: dayLogs,
    };
  });

  const subjectMap = {};
  sessions.filter(s => s.completed !== false).forEach(s => {
    subjectMap[s.subject] = (subjectMap[s.subject] || 0) + Math.round((s.durationMinutes || 30) / 30);
  });

  let streak = 0;
  for (const d of [...byDay].reverse()) {
    if (d.completedSessions > 0 || d.extraStudyMinutes > 0) streak++;
    else break;
  }

  const summary = {
    totalScheduled: byDay.reduce((s, d) => s + d.scheduledSessions, 0),
    totalCompleted: byDay.reduce((s, d) => s + d.completedSessions, 0),
    totalMissed:    byDay.reduce((s, d) => s + d.missedSessions,    0),
    totalExtraMin:  byDay.reduce((s, d) => s + d.extraStudyMinutes,  0),
    avgScore:       Math.round(byDay.reduce((s, d) => s + d.productivityScore, 0) / byDay.length),
    wakeUpStreak:   streak,
  };

  return { byDay, subjectDistribution: subjectMap, summary, streak };
}

export async function getHeatmapData(userId, days = 90) {
  const range    = getDateRange(days);
  const startDate = range[0].date;
  const sessions = await getSessionsByDateRange(userId, startDate, range[range.length - 1].date);

  return range.map(({ date, day }) => {
    const completed = sessions.filter(s => s.date === date && s.completed !== false).length;
    const extra     = sessions.filter(s => s.date === date && s.type === 'custom')
                              .reduce((a, s) => a + (s.durationMinutes || 0), 0);
    const level = completed === 0 && extra === 0 ? 0
                : completed >= 3 || extra >= 90  ? 4
                : completed === 2 || extra >= 60  ? 3
                : completed === 1 || extra >= 30  ? 2 : 1;
    return { date, day, completed, extraMin: extra, level };
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PER-USER SCHEDULE (custom check-in system)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const scheduleCol = (uid) => collection(db, 'users', uid, 'schedule');

export async function createScheduleEntry(userId, data) {
  const docRef = await addDoc(scheduleCol(userId), {
    ...data, userId, status: 'pending', createdAt: now(),
  });
  return docRef.id;
}

export async function getScheduleEntries(userId, date) {
  const q = query(scheduleCol(userId), where('date', '==', date), orderBy('time', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllScheduleEntries(userId) {
  const snap = await getDocs(scheduleCol(userId));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return docs.sort((a, b) => {
    if (a.date === b.date) return (b.time || '').localeCompare(a.time || '');
    return (b.date || '').localeCompare(a.date || '');
  });
}

export function subscribeToAllScheduleEntries(userId, callback, onError) {
  return onSnapshot(
    scheduleCol(userId),
    snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = docs.sort((a, b) => {
        if (a.date === b.date) return (b.time || '').localeCompare(a.time || '');
        return (b.date || '').localeCompare(a.date || '');
      });
      callback(sorted);
    },
    onError
  );
}

export async function updateScheduleEntry(userId, entryId, data) {
  await setDoc(doc(db, 'users', userId, 'schedule', entryId), { ...data, updatedAt: now() }, { merge: true });
}

export async function deleteScheduleEntry(userId, entryId) {
  await deleteDoc(doc(db, 'users', userId, 'schedule', entryId));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI ANALYSIS (calls OpenRouter directly from client)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function generateAndSaveAIReport(userId, days = 7, topicSummary = null) {
  const [stats, chapters] = await Promise.all([
    getWeeklyStats(userId, days),
    getChapters(userId),
  ]);

  const chapterSummary = chapters.reduce((acc, ch) => {
    if (!acc[ch.subject]) acc[ch.subject] = { total: 0, completed: 0, revised: 0, inProgress: 0 };
    acc[ch.subject].total++;
    if (ch.status === 'completed')   acc[ch.subject].completed++;
    if (ch.status === 'revised')     acc[ch.subject].revised++;
    if (ch.status === 'in_progress') acc[ch.subject].inProgress++;
    return acc;
  }, {});

  // Build topic-level progress string if provided
  let topicProgressStr = '';
  if (topicSummary && Object.keys(topicSummary).length > 0) {
    topicProgressStr = '\nTopic-level progress: ' +
      Object.entries(topicSummary)
        .map(([subj, d]) => `${subj}: ${d.done}/${d.total} topics done, Rev1: ${d.rev1}/${d.total}`)
        .join(' | ');
  }

  const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  const userMessage = `সাইফুলের গত ${days} দিনের data:\n` +
    `Scheduled sessions: ${stats.summary.totalCompleted}/${stats.summary.totalScheduled}\n` +
    `Extra study: ${stats.summary.totalExtraMin} min | Streak: ${stats.streak}d\n` +
    `Subject stats: ${JSON.stringify(stats.subjectDistribution)}\n` +
    `Chapter progress: ${JSON.stringify(chapterSummary)}` +
    topicProgressStr + '\n' +
    `Daily log: ${JSON.stringify(stats.byDay.map(d => ({ date: d.date, completed: d.completedSessions, missed: d.missedSessions, extra: d.extraStudyMinutes })))}`;

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://zyntra-studyverse.netlify.app',
      'X-Title': 'ZYNTRA StudyVerse',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      max_tokens: 1400,
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
  const data       = await res.json();
  const reportText = data.choices?.[0]?.message?.content;
  if (!reportText) throw new Error('Empty AI response');

  const scoreMatch = reportText.match(/স্কোর:\s*(\d+)\/100/);
  const score      = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;

  const id = await saveAIReport(userId, { reportText, score, periodDays: days, date: getBSTDateString() });
  return { id, reportText, score };
}


const AI_SYSTEM_PROMPT = `তুমি ZYNTRA AI — সাইফুলের কঠোর study mentor। সংক্ষিপ্ত, কাজের কথা বলো।

━━━ সাইফুলের পরিচয় ━━━
Class 11 বিজ্ঞান, বাংলাদেশ। Online recorded class করে।
লক্ষ্য: BUET (সর্বোচ্চ priority) + HSC 2027
BUET exam: শুধু Physics, Chemistry, Math (PCM)

━━━ নিয়ম ━━━
১. সম্পূর্ণ বাংলায়।
২. প্রতিটা section সংক্ষিপ্ত — ৪-৫ লাইনের বেশি না।
৩. Data থেকে specific সংখ্যা দিয়ে বলো।

━━━ OUTPUT FORMAT ━━━

## 🎯 স্কোর ও সামগ্রিক অবস্থা
[স্কোর: XX/100]

## 🔴 BUET Core — Physics · Chemistry · Math

## 🟡 HSC Subjects

## ⚠️ এই সপ্তাহের Top 3 সমস্যা

## 💡 এই সপ্তাহের Action Plan

## ✅ ভালো দিক`;

// ─────────────────────────────────────────────────────────────────────────────
// TOPIC PROGRESS — Firestore subcollection: chapters/{chapterDocId}/topics/{slug}
//
// Schema per topic doc:
//   { slug, topicName, topicIndex, type, studied, studiedAt, revisions: { '1': Timestamp|null, '2': Timestamp|null, '3': Timestamp|null }, updatedAt }
// ─────────────────────────────────────────────────────────────────────────────

function topicsCol(chapterDocId) {
  return collection(db, 'chapters', chapterDocId, 'topics');
}
function topicRef(chapterDocId, slug) {
  return doc(db, 'chapters', chapterDocId, 'topics', slug);
}

/**
 * Fetch all topic progress docs for a chapter.
 * Returns a map: { [slug]: topicDoc }
 */
export async function getTopicProgress(chapterDocId) {
  const snap = await getDocs(topicsCol(chapterDocId));
  const map = {};
  snap.docs.forEach(d => { map[d.id] = d.data(); });
  return map;
}

/**
 * Update a single topic's studied or revision status.
 * Uses setDoc with merge:true for safe partial writes.
 *
 * @param {string} chapterDocId  - e.g. "uid_Physics1_1"
 * @param {string} slug          - topic slug, e.g. "t01" | "cq" | "mock"
 * @param {object} update        - { studied?: bool, revisionLevel?: 1|2|3, revisionDone?: bool }
 */
export async function updateTopicStatus(chapterDocId, slug, update) {
  const ref = topicRef(chapterDocId, slug);
  const payload = { updatedAt: now() };

  if (typeof update.studied === 'boolean') {
    payload.studied    = update.studied;
    payload.studiedAt  = update.studied ? now() : null;
  }

  if (update.revisionLevel != null) {
    const key = String(update.revisionLevel);
    payload[`revisions.${key}`] = update.revisionDone ? now() : null;
  }

  await setDoc(ref, payload, { merge: true });
}

/**
 * Seed topics for a chapter from static TOPIC_DATA.
 * Called once when a chapter is first expanded.
 * merge:true ensures existing progress is preserved.
 *
 * legacyStatus: optional — if chapter has old status ('completed', 'revised_N')
 *               auto-populate studied=true (and revisions for revised_N).
 */
export async function seedTopicsForChapter(chapterDocId, topics, legacyStatus) {
  if (!topics || topics.length === 0) return;

  // Determine legacy fill values
  let legacyStudied   = false;
  let legacyRevCount  = 0;

  if (legacyStatus === 'completed') {
    legacyStudied = true;
  } else if (legacyStatus?.startsWith('revised')) {
    legacyStudied  = true;
    const match    = legacyStatus.match(/revised_?(\d)/);
    legacyRevCount = match ? parseInt(match[1], 10) : 1;
  }

  const batch = writeBatch(db);

  topics.forEach((topic, idx) => {
    const ref = topicRef(chapterDocId, topic.slug);

    const revisions = {};
    if (legacyRevCount >= 1) revisions['1'] = serverTimestamp();
    if (legacyRevCount >= 2) revisions['2'] = serverTimestamp();
    if (legacyRevCount >= 3) revisions['3'] = serverTimestamp();

    // Only set default values — merge keeps existing progress intact
    batch.set(ref, {
      slug:        topic.slug,
      topicName:   topic.name,
      topicIndex:  idx,
      type:        topic.type,
      studied:     legacyStudied,
      studiedAt:   legacyStudied ? serverTimestamp() : null,
      revisions,
      updatedAt:   serverTimestamp(),
    }, { merge: true });
  });

  await batch.commit();
}

/**
 * Real-time listener for all topics of a chapter.
 * Returns unsubscribe function.
 *
 * @param {string}   chapterDocId
 * @param {function} callback  - called with { [slug]: topicDoc } map on every update
 */
export function subscribeTopicProgress(chapterDocId, callback) {
  const q = query(topicsCol(chapterDocId), orderBy('topicIndex', 'asc'));
  return onSnapshot(q, snap => {
    const map = {};
    snap.docs.forEach(d => { map[d.id] = d.data(); });
    callback(map);
  });
}

/**
 * Batch-fetch topic progress for multiple chapters at once.
 * Used for subject/overall aggregate calculation.
 *
 * @param {string[]} chapterDocIds
 * @returns {Promise<{ [chapterDocId]: { [slug]: topicDoc } }>}
 */
export async function batchGetTopicProgress(chapterDocIds) {
  const results = {};
  await Promise.all(
    chapterDocIds.map(async id => {
      results[id] = await getTopicProgress(id);
    })
  );
  return results;
}

/**
 * Auto-schedule a chapter for revision when the first topic is marked studied.
 * Sets chapter status to 'completed' if it was 'not_started' or 'in_progress',
 * making it eligible for getDueRevisions / RevisionPage.
 *
 * @param {string} chapterDocId  - the chapter Firestore document ID
 * @param {object} chapterMeta   - { userId, subject, chapterNumber, status }
 */
export async function scheduleRevisionIfNeeded(chapterDocId, chapterMeta) {
  if (!chapterDocId || !chapterMeta?.userId) return;
  const { status } = chapterMeta;
  // Only promote if chapter has not been manually marked as completed/revised yet
  if (!status || status === 'not_started' || status === 'in_progress') {
    try {
      await setDoc(
        doc(db, 'chapters', chapterDocId),
        { status: 'completed', lastUpdated: now() },
        { merge: true }
      );
    } catch (e) {
      console.warn('[scheduleRevisionIfNeeded] Could not update chapter status:', e);
    }
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROUTINE DEFINITIONS  (weekly / daily / once recurring check-in sessions)
// Stored at: users/{uid}/routineDefinitions/{id}
// Schema:
//   title, subject, chapter, topic, daysOfWeek: string[],
//   startTime: 'HH:MM', durationMinutes: number, reminderMinutes: number,
//   repeat: 'weekly'|'daily'|'once', specificDate?: string,
//   isActive: boolean, createdAt, updatedAt
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const routineDefsCol = (uid) => collection(db, 'users', uid, 'routineDefinitions');

export async function createRoutineDefinition(userId, data) {
  const docRef = await addDoc(routineDefsCol(userId), {
    ...data, userId, isActive: true, createdAt: now(), updatedAt: now(),
  });
  return docRef.id;
}

export async function getRoutineDefinitions(userId) {
  const snap = await getDocs(routineDefsCol(userId));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function subscribeToRoutineDefinitions(userId, callback, onError) {
  return onSnapshot(
    routineDefsCol(userId),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export async function updateRoutineDefinition(userId, defId, data) {
  await setDoc(
    doc(db, 'users', userId, 'routineDefinitions', defId),
    { ...data, updatedAt: now() },
    { merge: true }
  );
}

export async function deleteRoutineDefinition(userId, defId) {
  await deleteDoc(doc(db, 'users', userId, 'routineDefinitions', defId));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SESSION LOGS  (per-occurrence history for routine definitions)
// Stored at: users/{uid}/sessionLogs/{logId}
// ID format: routine_{defId}_{date}  — deterministic, prevents duplicate logs
// Schema:
//   routineDefinitionId, date, subject, chapter, topic, title,
//   startTime, durationMinutes, status (completed|missed|skipped|cancelled|in_progress),
//   startedAt?: ISO string, completedAt?: ISO string,
//   actualDurationMinutes?: number, notes?, userId, updatedAt
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const sessionLogsCol = (uid) => collection(db, 'users', uid, 'sessionLogs');

export function getSessionLogId(routineDefId, date) {
  return `routine_${routineDefId}_${date}`;
}

export async function saveSessionLog(userId, data) {
  // data must include: routineDefinitionId, date, status
  const logId = getSessionLogId(data.routineDefinitionId, data.date);
  await setDoc(
    doc(db, 'users', userId, 'sessionLogs', logId),
    { ...data, userId, updatedAt: now() },
    { merge: true }
  );
  return logId;
}

export async function getSessionLog(userId, routineDefId, date) {
  const logId = getSessionLogId(routineDefId, date);
  const snap = await getDoc(doc(db, 'users', userId, 'sessionLogs', logId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getSessionLogsByDateRange(userId, startDate, endDate) {
  const q = query(
    sessionLogsCol(userId),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function subscribeToSessionLogs(userId, callback, onError, days = 90) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const startDate = getBSTDateString(cutoff);
  const q = query(
    sessionLogsCol(userId),
    where('date', '>=', startDate),
    orderBy('date', 'desc')
  );
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    onError
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHECK-IN CENTER STATISTICS
// Aggregates from sessionLogs + schedule entries (for one-offs)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getCheckinCenterStats(userId, days = 30) {
  const today     = getBSTDateString();
  const cutoff    = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const startDate = getBSTDateString(cutoff);

  // Parallel fetch
  const [logs, schedSnap, routineDefs] = await Promise.all([
    getSessionLogsByDateRange(userId, startDate, today),
    getDocs(query(
      collection(db, 'users', userId, 'schedule'),
      where('date', '>=', startDate),
      orderBy('date', 'desc')
    )),
    getRoutineDefinitions(userId),
  ]);

  const schedEntries = schedSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Combine records: session logs + resolved (non-pending) schedule entries
  const allRecords = [
    ...logs,
    ...schedEntries.filter(e => e.status === 'completed' || e.status === 'missed' || e.status === 'skipped'),
  ];

  const total     = allRecords.length;
  const completed = allRecords.filter(r => r.status === 'completed').length;
  const missed    = allRecords.filter(r => r.status === 'missed').length;
  const skipped   = allRecords.filter(r => r.status === 'skipped').length;
  const cancelled = allRecords.filter(r => r.status === 'cancelled').length;

  // Subject-wise breakdown
  const bySubject = {};
  allRecords.forEach(r => {
    const subj = r.subject;
    if (!subj) return;
    if (!bySubject[subj]) bySubject[subj] = { completed: 0, missed: 0, skipped: 0, total: 0 };
    bySubject[subj].total++;
    if (r.status === 'completed') bySubject[subj].completed++;
    else if (r.status === 'missed') bySubject[subj].missed++;
    else if (r.status === 'skipped') bySubject[subj].skipped++;
  });
  // Compute completion rate per subject
  Object.values(bySubject).forEach(s => {
    s.rate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
  });

  // Time stats
  const plannedMinutes = allRecords.reduce((s, r) => s + (r.durationMinutes || 0), 0);
  const actualMinutes  = allRecords
    .filter(r => r.status === 'completed')
    .reduce((s, r) => s + (r.actualDurationMinutes || r.durationMinutes || 0), 0);

  // ── Streak calculation (backwards from yesterday) ─────────────────────────
  // Rules:
  //   - Day with ≥1 completion → streak continues
  //   - Day with scheduled sessions but 0 completions → streak breaks
  //   - Day with NO scheduled sessions at all → neutral (skip, doesn't break streak)
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  
  let streak     = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  let streakBroken = false;

  for (let i = 1; i <= Math.min(days, 90); i++) {
    const d        = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const date     = getBSTDateString(d);
    const dayName  = DAYS[d.getUTCDay()];

    if (streakBroken) break;

    // Completions on this day
    const dayCompleted = allRecords.filter(r => r.date === date && r.status === 'completed').length;
    if (dayCompleted > 0) {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
      continue;
    }

    // Was anything scheduled for this day?
    const hadRoutine  = routineDefs.some(def =>
      def.isActive && (def.daysOfWeek || []).includes(dayName)
    );
    const hadOneOff   = schedEntries.some(e => e.date === date);

    if (hadRoutine || hadOneOff) {
      // Sessions scheduled but nothing completed → break
      streakBroken = true;
    }
    // Else: nothing scheduled → neutral, keep looking back
  }
  streak = streakBroken ? 0 : tempStreak;

  // Weekly heatmap (last 7 days)
  const weeklyMatrix = [];
  for (let i = 6; i >= 0; i--) {
    const d        = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const date     = getBSTDateString(d);
    const dayLabel = DAYS[d.getUTCDay()].slice(0, 3);
    const dayLogs  = allRecords.filter(r => r.date === date);
    weeklyMatrix.push({
      date, dayLabel,
      completed: dayLogs.filter(r => r.status === 'completed').length,
      missed:    dayLogs.filter(r => r.status === 'missed').length,
      total:     dayLogs.length,
    });
  }

  return {
    total, completed, missed, skipped, cancelled,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    missRate:       total > 0 ? Math.round((missed    / total) * 100) : 0,
    bySubject,
    plannedMinutes, actualMinutes,
    streak, bestStreak: Math.max(bestStreak, streak),
    weeklyMatrix,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUET DAILY CHALLENGE — Pure Firebase + OpenRouter AI (Isolated System)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BUET_AI_SYSTEM_PROMPT = `তুমি Zyntra StudyVerse-এর জন্য Saiful-এর ডেডিকেটেড BUET Daily Challenge Generator।
তোমার একমাত্র কাজ: Saiful-এর জন্য প্রতিদিন ঠিক একটি (১টি) হাই-ইল্ড, প্রিসাইজ ও কার্যকর BUET অ্যাডমিশন চ্যালেঞ্জ তৈরি করা।

━━━ SAIFUL-এর প্রোফাইল ও লক্ষ্য ━━━
• নাম: সাইফুল (Saiful) | ব্যাচ: HSC 2027
• ডাবল গোল (Double Goal): 
  ১. HSC-এ Golden A+ (GPA 5.00 — সব বিষয়ে A+)
  ২. BUET Admission Test — অক্টোবর ২০২৭ (টপ র‍্যাংক নিশ্চিত করা)
• সিলেবাস চ্যালেঞ্জ: ৩১ ডিসেম্বর ২০২৬-এর মধ্যে ফুল সিলেবাস কমপ্লিট করা
• HSC বোর্ড পরীক্ষা: ১৫ মার্চ ২০২৭
• BUET রিয়ালিটি: ৬০০ নম্বরের লিখিত পরীক্ষা, ৬০টি প্রশ্ন, ৩ ঘন্টা (প্রতি প্রশ্নে মাত্র ৩ মিনিট)। ৩০-৩৫টি নির্ভুল সমাধান চান্স এনে দেয়।
• ট্রিপল ব্যালেন্স: Physics = Chemistry = Math (সমান গুরুত্ব)। রসায়ন চ্যাপ্টার ৭ (জৈব যৌগ) ও গণিতের ক্যালকুলাস/কনিক্স/স্থিতি-গতিবিদ্যা সবচেয়ে বড় ফাঁদ।
• প্রস্তুতি পদ্ধতি: কনসেপ্ট ক্লিয়ার → মেইন বুক এক্সারসাইজ → ইঞ্জিনিয়ারিং কোশ্চেন ব্যাংক (QB) বারবার প্র্যাকটিস → ক্যালকুলেটর ট্রিকস ও দ্রুত হিসাব।

━━━ সিলেবাস গাইডলাইন (PCM) ━━━
পদার্থবিজ্ঞান ১ম পত্র: ভৌত জগত ও পরিমাপ, ভেক্টর, গতিবিদ্যা, নিউটনিয়ান বলবিদ্যা ও মহাকর্ষ, কাজ শক্তি ও ক্ষমতা, মহাকর্ষ ও অভিকর্ষ, পদার্থের গাঠনিক ধর্ম, পর্যাবৃত্ত গতি, তরঙ্গ, আদর্শ গ্যাস ও গ্যাসের গতিতত্ত্ব।
পদার্থবিজ্ঞান ২য় পত্র: তাপগতিবিদ্যা, স্থির তড়িৎ, চল তড়িৎ, তড়িৎ প্রবাহের চৌম্বক ক্রিয়া, তাড়িতচৌম্বক আবেশ ও পরিবর্তী প্রবাহ, জ্যামিতিক আলোকবিজ্ঞান, ভৌত আলোকবিজ্ঞান, আধুনিক পদার্থবিজ্ঞানের সূচনা, পরমাণু মডেল ও নিউক্লিয়ার পদার্থবিজ্ঞান, সেমিকন্ডাক্টর ও ইলেকট্রনিক্স।
রসায়ন ১ম পত্র: ল্যাবরেটরির নিরাপদ ব্যবহার, গুণগত রসায়ন, পর্যায়বৃত্ত ধর্ম ও রাসায়নিক বন্ধন, রাসায়নিক পরিবর্তন, কর্মমুখী রসায়ন।
রসায়ন ২য় পত্র: পরিবেশ রসায়ন, জৈব রসায়ন (Ch7 - মোস্ট ক্রুশিয়াল), পরিমাণগত রসায়ন, তড়িৎ রসায়ন, অর্থনৈতিক রসায়ন।
উচ্চতর গণিত ১ম পত্র: ম্যাট্রিক্স ও নির্ণায়ক, ভেক্টর, সরলরেখা, বৃত্ত, বিন্যাস ও সমাবেশ, ত্রিকোণমিতিক অনুপাত, সংযুক্ত কোণের ত্রিকোণমিতিক অনুপাত, ফাংশন ও ফাংশনের লেখচিত্র, অন্তরীকরণ, যোগজীকরণ।
উচ্চতর গণিত ২য় পত্র: বাস্তব সংখ্যা ও অসমতা, দ্বিপদী বিন্যাস, জটিল সংখ্যা, বহুপদী ও বহুপদী সমীকরণ, কনিক, বিপরীত ত্রিকোণমিতিক ফাংশন ও ত্রিকোণমিতিক সমীকরণ, স্থিতিবিদ্যা, গতিবিদ্যা, সম্ভাবনা।

━━━ চ্যালেঞ্জের ধরন (CHALLENGE TYPES) ━━━
- speed_math: ক্যালকুলেটর শর্টকাট বা দ্রুত হিসাবের মাধ্যমে নির্দিষ্ট সময়ে সমস্যা সমাধান
- formula_recall: স্মৃতি থেকে চ্যাপ্টারের মূল সূত্র ও শর্তাবলি লেখা এবং যাচাই
- concept_drill: ট্রিকি ও গভীর তাত্ত্বিক প্রশ্ন এবং ফাঁদ এড়ানোর অনুশীলন
- mcq_sprint: কঠোর সময়ের চাপে BUET প্রিলিমিনারি স্টাইলের স্প্রিন্ট
- calculation_tricks: বড় সমীকরণ দ্রুত অনুমানের মাধ্যমে সমাধান কৌশল
- mixed: একাধিক বিষয় বা চ্যাপ্টারের সমন্বয়ে তৈরি চ্যালেঞ্জ

━━━ কঠোর নির্দেশাবলি ━━━
১. ভাষা: সম্পূর্ণ বাংলায় লিখবে (title, description, chapterRef সবকিছু স্পষ্ট এবং সাবলীল বাংলা ভাষায় হবে)।
২. সুনির্দিষ্ট ও এক সিটিং-এ সমাধানযোগ্য কাজ দেবে (duration: 30, 45, বা 60 মিনিট)।
৩. JSON ফরম্যাটের বাইরে কোনো অতিরিক্ত টেক্সট বা মার্কডাউন দেবে না।

━━━ STRICT JSON OUTPUT FORMAT ━━━
{
  "title": "বাংলায় ছোট আকর্ষণীয় শিরোনাম (সর্বোচ্চ ৮ শব্দ, যেমন: ⚡ স্পিড ড্রিল: অন্তরীকরণ ও স্পর্শক)",
  "description": "বাংলায় স্পষ্ট কাজের নির্দেশ — কী করবে এবং কীভাবে দ্রুত সমাধান করবে (১-২ বাক্য)",
  "challengeType": "speed_math|formula_recall|concept_drill|mcq_sprint|calculation_tricks|mixed",
  "subject": "Physics|Chemistry|Math|Mixed",
  "durationMinutes": 30,
  "targetAccuracy": 75,
  "targetProblems": 25,
  "chapterRef": "বাংলায় চ্যাপ্টারের নাম (যেমন: উচ্চতর গণিত ১ম পত্র — অধ্যায় ৯: অন্তরীকরণ)"
}`;

export async function getBuetDailyChallenge(uid, date) {
  if (!uid || !date) return null;
  const snap = await getDoc(doc(db, 'users', uid, 'buetDailyChallenges', date));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function generateBuetDailyChallenge(uid, date, pcmChapters = []) {
  if (!uid || !date) throw new Error('User ID and date required');

  // Check if challenge already exists for this date in Firestore
  const existing = await getBuetDailyChallenge(uid, date);
  if (existing) return existing;

  // Retrieve recent challenges from Firestore to avoid repetition
  let recentChallenges = [];
  try {
    const q = query(
      collection(db, 'users', uid, 'buetDailyChallenges'),
      orderBy('date', 'desc'),
      limit(7)
    );
    const snap = await getDocs(q);
    recentChallenges = snap.docs.map(d => d.data());
  } catch (err) {
    console.warn('[BUET Challenge] Could not fetch recent challenges:', err.message);
  }

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_OPENROUTER_API_KEY is not configured in environment variables');
  }

  const userPrompt = `Student: Saiful | Target: BUET Admission 2027
Date: ${date}
Current PCM Progress summary: ${JSON.stringify(pcmChapters.slice(0, 10))}
Recent 7 Days Challenges (do not duplicate):
${recentChallenges.map(c => `${c.date}: [${c.subject}] ${c.challengeType} — "${c.title}"`).join('\n') || 'None'}

Generate today's BUET Daily Challenge JSON now.`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  'https://zyntra-studyverse.netlify.app',
      'X-Title':       'ZYNTRA StudyVerse',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: BUET_AI_SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('Empty AI response');

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Invalid JSON from AI');
    parsed = JSON.parse(match[0]);
  }

  const challengeData = {
    date,
    title:           String(parsed.title || 'BUET Daily Challenge'),
    description:     String(parsed.description || 'Solve today\'s problems with calculator/speed efficiency.'),
    challengeType:   String(parsed.challengeType || 'mixed'),
    subject:         String(parsed.subject || 'Mixed'),
    durationMinutes: Number(parsed.durationMinutes || 45),
    targetAccuracy:  parsed.targetAccuracy != null ? Number(parsed.targetAccuracy) : 75,
    targetProblems:  parsed.targetProblems != null ? Number(parsed.targetProblems) : 25,
    chapterRef:      parsed.chapterRef != null ? String(parsed.chapterRef) : null,
    status:          'pending',
    startedAt:       null,
    completedAt:     null,
    elapsedSeconds:  null,
    createdAt:       new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', uid, 'buetDailyChallenges', date), challengeData);
  return { id: date, ...challengeData };
}

export async function startBuetDailyChallenge(uid, date) {
  if (!uid || !date) return;
  const challengeRef = doc(db, 'users', uid, 'buetDailyChallenges', date);
  const snap = await getDoc(challengeRef);
  if (!snap.exists()) return;
  const current = snap.data();
  if (current.status !== 'pending') return current;

  const update = {
    status: 'started',
    startedAt: new Date().toISOString(),
  };
  await updateDoc(challengeRef, update);
  return { ...current, ...update };
}

export async function completeBuetDailyChallenge(uid, date, elapsedSeconds) {
  if (!uid || !date) return;
  const challengeRef = doc(db, 'users', uid, 'buetDailyChallenges', date);
  const snap = await getDoc(challengeRef);
  if (!snap.exists()) return;
  const current = snap.data();

  const update = {
    status: 'completed',
    completedAt: new Date().toISOString(),
    elapsedSeconds: elapsedSeconds ? Number(elapsedSeconds) : null,
    startedAt: current.startedAt || new Date().toISOString(),
  };
  await updateDoc(challengeRef, update);
  return { ...current, ...update };
}

export async function getBuetChallengeStats(uid) {
  if (!uid) return { total: 0, completed: 0, missed: 0, rate: 0, totalMinutes: 0, currentStreak: 0, bestStreak: 0, bySubject: {} };
  
  try {
    const q = query(
      collection(db, 'users', uid, 'buetDailyChallenges'),
      orderBy('date', 'asc')
    );
    const snap = await getDocs(q);
    const all = snap.docs.map(d => d.data());

    const generated = all.length;
    const completed = all.filter(c => c.status === 'completed').length;
    const missed    = Math.max(0, generated - completed);
    const rate      = generated > 0 ? Math.round((completed / generated) * 100) : 0;
    const totalMinutes = Math.round(
      all.filter(c => c.status === 'completed')
         .reduce((acc, c) => acc + (c.elapsedSeconds || (c.durationMinutes * 60)), 0) / 60
    );

    // Calculate streak
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    for (const c of all) {
      if (c.status === 'completed') {
        tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }
    currentStreak = tempStreak;

    // Subject breakdown
    const bySubject = {};
    for (const c of all) {
      const s = c.subject || 'Mixed';
      if (!bySubject[s]) bySubject[s] = { total: 0, completed: 0 };
      bySubject[s].total++;
      if (c.status === 'completed') bySubject[s].completed++;
    }

    return {
      total: generated,
      generated,
      completed,
      missed,
      rate,
      totalMinutes,
      currentStreak,
      bestStreak: Math.max(bestStreak, currentStreak),
      bySubject,
    };
  } catch (err) {
    console.error('[BUET Challenge] Stats error:', err.message);
    return { total: 0, generated: 0, completed: 0, missed: 0, rate: 0, totalMinutes: 0, currentStreak: 0, bestStreak: 0, bySubject: {} };
  }
}

