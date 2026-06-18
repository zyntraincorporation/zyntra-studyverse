import prisma from '../../db/client.js';

export async function getUserWords(userId, { search, sort, filter, skip, take }) {
  const where = { userId, isArchived: false };

  if (search) {
    where.OR = [
      { word: { contains: search, mode: 'insensitive' } },
      { banglaMeaning: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (filter === 'due')      where.nextReviewAt = { lte: new Date() };
  if (filter === 'mastered') where.masteryLevel = { gte: 80 };
  if (filter === 'hard')     where.difficulty = { gte: 4 };

  const orderBy = sort === 'mastery'   ? { masteryLevel: 'desc' }
                : sort === 'newest'    ? { createdAt: 'desc' }
                : sort === 'due'       ? { nextReviewAt: 'asc' }
                : { createdAt: 'desc' };

  const [words, total] = await Promise.all([
    prisma.vocabularyWord.findMany({ where, orderBy, skip, take }),
    prisma.vocabularyWord.count({ where }),
  ]);

  return { words, total, page: Math.floor(skip / take) + 1 };
}

export async function createWord(userId, data) {
  return prisma.vocabularyWord.create({
    data: { ...data, userId, nextReviewAt: new Date() },
  });
}

export async function updateWord(userId, id, data) {
  return prisma.vocabularyWord.update({
    where: { id, userId },
    data,
  });
}

export async function deleteWord(userId, id) {
  return prisma.vocabularyWord.delete({ where: { id, userId } });
}

export async function getWordById(userId, id) {
  return prisma.vocabularyWord.findFirst({ where: { id, userId } });
}