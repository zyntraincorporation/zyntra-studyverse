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
  const q    = query(col('chapters'), where('userId', '==', userId), orderBy('subject'), orderBy('chapterNumber'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateChapter(userId, subject, chapterNumber, data) {
  const id = `${userId}_${subject}_${chapterNumber}`;
  await setDoc(ref('chapters', id), {
    ...data, userId, subject, chapterNumber, lastUpdated: now(),
  }, { merge: true });
}

export async function bulkUpdateChapters(userId, updates) {
  const batch = writeBatch(db);
  updates.forEach(u => {
    const id = `${userId}_${u.subject}_${u.chapterNumber}`;
    batch.set(ref('chapters', id), { ...u, userId, lastUpdated: now() }, { merge: true });
  });
  await batch.commit();
}

export async function seedChapters(userId, chapters) {
  const batch = writeBatch(db);
  chapters.forEach(ch => {
    const id = `${userId}_${ch.subject}_${ch.chapterNumber}`;
    batch.set(ref('chapters', id), {
      userId,
      subject:        ch.subject,
      chapterNumber:  ch.chapterNumber,
      chapterName:    ch.chapterName,
      status:         ch.status || 'not_started',
      completedTopics: ch.completedTopics || 0,
      totalTopics:    ch.totalTopics || null,
      lastUpdated:    now(),
    }, { merge: true });
  });
  await batch.commit();
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
  const today = getBSTDateString();
  // Get all chapters with a completed/revised status
  const chapQ = query(
    col('chapters'),
    where('userId', '==', userId),
    where('status', 'in', REVISED_STATUSES)
  );
  const chapSnap = await getDocs(chapQ);
  const chapters = chapSnap.docs.map(d => ({ id: d.id, ...d.data() }));

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
export async function sendMessage(senderId, text, mediaUrl = null, mediaType = null, replyTo = null) {
  const expiresAt = new Date(Date.now() + messageTTLMs);
  await addDoc(collection(db, 'chat', chatRoomId, 'messages'), {
    senderId, text: text || null, mediaUrl, mediaType,
    ...(replyTo ? { replyTo } : {}),
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
  // Subscribe to user doc to get lastReadAt, then count messages after it
  const userUnsub = onSnapshot(doc(db, 'users', userId), async (snap) => {
    if (!snap.exists()) { callback(0); return; }
    const lastReadAt = snap.data().chatLastReadAt;
    if (!lastReadAt) {
      // Never read — count recent messages not from this user
      const q = query(
        collection(db, 'chat', chatRoomId, 'messages'),
        where('senderId', '!=', userId),
        orderBy('senderId'),
        orderBy('createdAt', 'desc'),
        limit(99)
      );
      try {
        const s = await getDocs(q);
        callback(s.size);
      } catch { callback(0); }
      return;
    }
    // Count messages after lastReadAt that aren't from this user
    const q = query(
      collection(db, 'chat', chatRoomId, 'messages'),
      where('senderId', '!=', userId),
      where('createdAt', '>', lastReadAt),
      orderBy('senderId'),
      orderBy('createdAt', 'asc'),
      limit(99)
    );
    try {
      const s = await getDocs(q);
      callback(s.size);
    } catch (err) {
      // Fallback if composite index not ready
      console.warn('[chat] unread count query failed, using 0:', err);
      callback(0);
    }
  });
  return userUnsub;
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
// CHAT (conditional unlock system)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const { chatRoomId, chatUnlockMinutes, chatWindowMinutes, messageTTLMs } = COUPLE_CONFIG;

export function subscribeToChatRoom(callback) {
  return onSnapshot(ref('chat', chatRoomId), snap => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : { unlocked: false });
  });
}

export async function updateChatStudyMinutes(userId, displayName, minutesOrObj) {
  // Accept both a raw number (legacy) and the new { total, custom, timer } object
  const eligible = typeof minutesOrObj === 'object'
    ? Math.min(minutesOrObj.custom ?? 0, 120) + (minutesOrObj.timer ?? 0)
    : minutesOrObj; // legacy callers pass a plain number — treat as-is

  const fieldKey = `${userId}_minutes`;
  const nameKey  = `${userId}_name`;
  const roomRef  = ref('chat', chatRoomId);
  await runTransaction(db, async (tx) => {
    const room = await tx.get(roomRef);
    const data = room.exists() ? room.data() : {};
    const updatedData = { ...data, [fieldKey]: eligible, [nameKey]: displayName };

    // Collect all user minute entries
    const allMinuteKeys = Object.keys(updatedData).filter(k => k.endsWith('_minutes'));
    const allMet        = allMinuteKeys.length >= 2 && allMinuteKeys.every(k => (updatedData[k] || 0) >= chatUnlockMinutes);

    if (allMet && !data.unlocked) {
      const now  = new Date();
      const exp  = new Date(now.getTime() + chatWindowMinutes * 60 * 1000);
      updatedData.unlocked    = true;
      updatedData.unlockedAt  = Timestamp.fromDate(now);
      updatedData.expiresAt   = Timestamp.fromDate(exp);
    } else if (data.unlocked) {
      const expiresAt = data.expiresAt?.toDate?.();
      if (expiresAt && new Date() > expiresAt) {
        updatedData.unlocked = false;
        updatedData.unlockedAt = null;
        updatedData.expiresAt  = null;
      }
    }
    tx.set(roomRef, updatedData, { merge: true });
  });
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

export async function updateScheduleEntry(userId, entryId, data) {
  await setDoc(doc(db, 'users', userId, 'schedule', entryId), { ...data, updatedAt: now() }, { merge: true });
}

export async function deleteScheduleEntry(userId, entryId) {
  await deleteDoc(doc(db, 'users', userId, 'schedule', entryId));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI ANALYSIS (calls OpenRouter directly from client)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function generateAndSaveAIReport(userId, days = 7) {
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

  const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  const userMessage = `সাইফুলের গত ${days} দিনের data:
Scheduled sessions: ${stats.summary.totalCompleted}/${stats.summary.totalScheduled}
Extra study: ${stats.summary.totalExtraMin} min | Streak: ${stats.streak}d
Subject stats: ${JSON.stringify(stats.subjectDistribution)}
Chapter progress: ${JSON.stringify(chapterSummary)}
Daily log: ${JSON.stringify(stats.byDay.map(d => ({ date: d.date, completed: d.completedSessions, missed: d.missedSessions, extra: d.extraStudyMinutes })))}`;

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
