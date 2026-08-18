const { z } = require('zod');
const wordsService = require('../../services/vocabulary/wordsService');

const WordSchema = z.object({
  word:           z.string().min(1).max(100),
  banglaMeaning:  z.string().min(1),
  pronunciation:  z.string().optional(),
  synonyms:       z.array(z.string()).optional(),
  antonyms:       z.array(z.string()).optional(),
  antonymMeaning: z.string().optional(),
  notes:          z.string().optional(),
  difficulty:     z.number().int().min(1).max(5).optional(),
  tags:           z.array(z.string()).optional(),
});

async function getWords(req, res) {
  try {
    const { search, sort, filter, page = 1, limit = 20 } = req.query;
    const words = await wordsService.getUserWords(req.user?.id || 'saiful', {
      search, sort, filter,
      skip: (page - 1) * limit,
      take: parseInt(limit),
    });
    res.json(words);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function createWord(req, res) {
  try {
    const data = WordSchema.parse(req.body);
    const word = await wordsService.createWord(req.user?.id || 'saiful', data);
    res.status(201).json(word);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
}

async function updateWord(req, res) {
  try {
    const data = WordSchema.partial().parse(req.body);
    const word = await wordsService.updateWord(req.user?.id || 'saiful', req.params.id, data);
    res.json(word);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function deleteWord(req, res) {
  try {
    await wordsService.deleteWord(req.user?.id || 'saiful', req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function getWordById(req, res) {
  try {
    const word = await wordsService.getWordById(req.user?.id || 'saiful', req.params.id);
    if (!word) return res.status(404).json({ error: 'Word not found' });
    res.json(word);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

module.exports = { getWords, createWord, updateWord, deleteWord, getWordById };