import { z } from 'zod';
import * as revisionService from '../../services/vocabulary/revisionService.js';
import prisma from '../../db/client.js';

const ReviewSchema = z.object({
  wordId:     z.string(),
  mode:       z.enum(['en_to_bn', 'bn_to_en', 'synonym_to_word', 'meaning_to_word']),
  result:     z.enum(['correct', 'incorrect', 'skipped']),
  confidence: z.number().int().min(1).max(5),
  responseMs: z.number().int().optional(),
});

export async function getYesterdayWords(req, res) {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const end = new Date(yesterday);
    end.setHours(23, 59, 59, 999);

    const words = await prisma.vocabularyWord.findMany({
      where: {
        userId: req.userId,
        createdAt: { gte: yesterday, lte: end },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(words);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function submitReview(req, res) {
  try {
    const data = ReviewSchema.parse(req.body);
    const result = await revisionService.recordReview(req.userId, data);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
}

export async function getRevisionQueue(req, res) {
  try {
    const now = new Date();
    const queue = await prisma.vocabularyWord.findMany({
      where: {
        userId: req.userId,
        nextReviewAt: { lte: now },
        isArchived: false,
      },
      orderBy: [{ nextReviewAt: 'asc' }, { masteryLevel: 'asc' }],
      take: 30,
    });
    res.json(queue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}