import prisma from '../../db/client.js';

export async function getWeeklyComparison(userId) {
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);

  const [thisWeekWords, lastWeekWords, thisWeekReviews, lastWeekReviews] =
    await Promise.all([
      prisma.vocabularyWord.count({
        where: { userId, createdAt: { gte: thisWeekStart } },
      }),
      prisma.vocabularyWord.count({
        where: { userId, createdAt: { gte: lastWeekStart, lt: lastWeekEnd } },
      }),
      prisma.vocabularyReview.count({
        where: { userId, reviewedAt: { gte: thisWeekStart } },
      }),
      prisma.vocabularyReview.count({
        where: { userId, reviewedAt: { gte: lastWeekStart, lt: lastWeekEnd } },
      }),
    ]);

  const thisWeekCorrect = await prisma.vocabularyReview.count({
    where: { userId, result: 'correct', reviewedAt: { gte: thisWeekStart } },
  });
  const lastWeekCorrect = await prisma.vocabularyReview.count({
    where: { userId, result: 'correct', reviewedAt: { gte: lastWeekStart, lt: lastWeekEnd } },
  });

  return {
    thisWeek: {
      wordsLearned: thisWeekWords,
      revisions: thisWeekReviews,
      successRate: thisWeekReviews > 0
        ? Math.round((thisWeekCorrect / thisWeekReviews) * 100) : 0,
    },
    lastWeek: {
      wordsLearned: lastWeekWords,
      revisions: lastWeekReviews,
      successRate: lastWeekReviews > 0
        ? Math.round((lastWeekCorrect / lastWeekReviews) * 100) : 0,
    },
    delta: {
      words:    thisWeekWords - lastWeekWords,
      revisions: thisWeekReviews - lastWeekReviews,
    },
  };
}

export async function getMonthlyAnalytics(userId) {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const [totalWords, totalReviews, hardestWords, mostFailedWords] = await Promise.all([
    prisma.vocabularyWord.count({ where: { userId, createdAt: { gte: start } } }),
    prisma.vocabularyReview.count({ where: { userId, reviewedAt: { gte: start } } }),
    prisma.vocabularyWord.findMany({
      where: { userId },
      orderBy: { failCount: 'desc' },
      take: 5,
      select: { word: true, failCount: true, masteryLevel: true },
    }),
    prisma.vocabularyWord.findMany({
      where: { userId, totalReviews: { gt: 0 } },
      orderBy: { masteryLevel: 'asc' },
      take: 5,
      select: { word: true, masteryLevel: true, totalReviews: true },
    }),
  ]);

  // Daily consistency (count unique days with at least 1 review this month)
  const reviews = await prisma.vocabularyReview.findMany({
    where: { userId, reviewedAt: { gte: start } },
    select: { reviewedAt: true },
  });
  const activeDays = new Set(
    reviews.map(r => r.reviewedAt.toISOString().split('T')[0])
  ).size;

  return { totalWords, totalReviews, hardestWords, mostFailedWords, activeDays };
}

export async function getHeatmapData(userId) {
  const start = new Date();
  start.setMonth(start.getMonth() - 3);

  const reviews = await prisma.vocabularyReview.groupBy({
    by: ['reviewedAt'],
    where: { userId, reviewedAt: { gte: start } },
    _count: true,
  });

  // Aggregate by date
  const map = {};
  for (const r of reviews) {
    const day = r.reviewedAt.toISOString().split('T')[0];
    map[day] = (map[day] || 0) + r._count;
  }
  return map;
}