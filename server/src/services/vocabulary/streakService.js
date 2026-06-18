import prisma from '../../db/client.js';

export async function getStreakInfo(userId) {
  const reviews = await prisma.vocabularyReview.findMany({
    where: { userId },
    select: { reviewedAt: true },
    orderBy: { reviewedAt: 'desc' },
  });

  const days = [...new Set(
    reviews.map(r => r.reviewedAt.toISOString().split('T')[0])
  )].sort().reverse();

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate = null;

  for (const day of days) {
    const date = new Date(day);
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diff = (prevDate - date) / (1000 * 60 * 60 * 24);
      tempStreak = diff === 1 ? tempStreak + 1 : 1;
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;
    prevDate = date;
  }

  // Current streak: must include today or yesterday
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (days[0] === today || days[0] === yesterday) {
    let streak = 0;
    let cursor = new Date(days[0]);
    for (const d of days) {
      const diff = (cursor - new Date(d)) / (1000 * 60 * 60 * 24);
      if (diff <= 1) { streak++; cursor = new Date(d); }
      else break;
    }
    currentStreak = streak;
  }

  return {
    currentStreak,
    longestStreak,
    totalActiveDays: days.length,
    lastActivityDate: days[0] || null,
  };
}