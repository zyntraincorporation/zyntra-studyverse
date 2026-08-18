const { z }       = require('zod');
const { lexiLookup, autofillWord } = require('../../ai/vocabularyAI');
const prisma      = require('../../db/client');

const uid = req => req.user?.id || 'saiful';

async function aiLookup(req, res) {
  try {
    const { input, language = 'en' } = z.object({
      input:    z.string().min(1).max(100),
      language: z.enum(['en', 'bn']).default('en'),
    }).parse(req.body);

    const result = await lexiLookup(input, language);

    await prisma.aIQueryHistory.create({
      data: { userId: uid(req), inputWord: input, language, response: result },
    });

    return res.json(result);
  } catch (err) {
    console.error('[aiLookup]', err.message);
    if (err?.errors) return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: 'AI lookup failed. Try again.' });
  }
}

async function aiAutofill(req, res) {
  try {
    const { word } = z.object({ word: z.string().min(1).max(100) }).parse(req.body);
    const result   = await autofillWord(word);
    return res.json(result);
  } catch (err) {
    console.error('[aiAutofill]', err.message);
    return res.status(500).json({ error: 'AI autofill failed. Try again.' });
  }
}

module.exports = { aiLookup, aiAutofill };