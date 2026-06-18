import prisma from '../../db/client.js';

// Spaced Repetition Intervals (days)
const INTERVALS = [1, 3, 7, 14, 30, 60];

function getNextInterval(currentInterval, result, confidence) {
  const idx = INTERVALS.indexOf(currentInterval);
  const base = idx === -1 ? 0 : idx;

  if (result === 'correct' && confidence >= 4) {
    return INTERVALS[Math.min(base + 1, INTERVALS.length - 1)];
  } else if (result === 'correct' && confidence >= 2) {
    return INTERVALS[base]; // hold
  } else {
    // failed or low confidence → reset to 1d
    return INTERVALS[0];
  }
}

function calcMastery(correct, total) {
  if (total === 0) return 0;
  return Math.min(100, Math.round((correct / total) * 100));
}

export async function recordReview(userId, { wordId, mode, result, confidence, responseMs }) {
  const word = await prisma.vocabularyWord.findFirst({ where: { id: wordId, userId } });
  if (!word) throw new Error('Word not found');

  const isCorrect = result === 'correct';
  const newCorrect = word.correctCount + (isCorrect ? 1 : 0);
  const newFail    = word.failCount + (isCorrect ? 0 : 1);
  const newTotal   = word.totalReviews + 1;
  const newStreak  = isCorrect ? word.correctStreak + 1 : 0;
  const newInterval = getNextInterval(word.reviewInterval, result, confidence);
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  const [review, updatedWord] = await prisma.$transaction([
    prisma.vocabularyReview.create({
      data: { wordId, userId, mode, result, confidence, responseMs },
    }),
    prisma.vocabularyWord.update({
      where: { id: wordId },
      data: {
        correctCount:  newCorrect,
        failCount:     newFail,
        totalReviews:  newTotal,
        correctStreak: newStreak,
        reviewInterval: newInterval,
        nextReviewAt,
        lastReviewedAt: new Date(),
        masteryLevel:   calcMastery(newCorrect, newTotal),
      },
    }),
  ]);

  return { review, word: updatedWord };
}