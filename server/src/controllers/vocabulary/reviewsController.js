const { z }            = require('zod');
const revisionService  = require('../../services/vocabulary/revisionService');
const prisma           = require('../../db/client');

const ReviewSchema = z.object({
  wordId:     z.string(),
  mode:       z.enum(['en_to_bn', 'bn_to_en', 'synonym_to_word', 'meaning_to_word']),
  result:     z.enum(['correct', 'incorrect', 'skipped']),
  confidence: z.number().int().min(1).max(5),
  responseMs: z.number().int().optional(),
});

const uid = req => req.user?.id || 'saiful';

async function getYesterdayWords(req, res) {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const end = new Date(yesterday);
    end.setHours(23, 59, 59, 999);
    const words = await prisma.vocabularyWord.findMany({
      where: { userId: uid(req), createdAt: { gte: yesterday, lte: end } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(words);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function submitReview(req, res) {
  try {
    const data   = ReviewSchema.parse(req.body);
    const result = await revisionService.recordReview(uid(req), data);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
}

async function getRevisionQueue(req, res) {
  try {
    const queue = await prisma.vocabularyWord.findMany({
      where: { userId: uid(req), nextReviewAt: { lte: new Date() }, isArchived: false },
      orderBy: [{ nextReviewAt: 'asc' }, { masteryLevel: 'asc' }],
      take: 30,
    });
    res.json(queue);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

module.exports = { getYesterdayWords, submitReview, getRevisionQueue };