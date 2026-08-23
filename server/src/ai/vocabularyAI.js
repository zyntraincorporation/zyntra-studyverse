// ─────────────────────────────────────────────────────────────────────────────
// Vocabulary AI — OpenRouter-powered word lookup and autofill
// ─────────────────────────────────────────────────────────────────────────────
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL          = 'openai/gpt-4o-mini';

function buildLookupPrompt(input, language) {
  return `You are an elite bilingual English-Bangla vocabulary assistant designed for Bangladeshi students (HSC / BUET aspirants).
Given the ${language === 'bn' ? 'Bangla' : 'English'} word/phrase: "${input}"

Guidelines for Bangla content:
- "banglaMeaning": A concise, accurate Bengali meaning / translation (e.g. "খুঁতখুঁতে / নিখুঁত কারিগর").
- "banglaDefinition": A natural, student-friendly, and crystal-clear Bengali definition / explanation. Do NOT provide awkward literal machine translations (e.g., for "Reluctant", provide "কোনো কিছু করতে অনীহা বা অনিচ্ছা থাকা" instead of "অনিচ্ছুক হতে প্রবণ").
- "englishDefinition": A clear, concise English dictionary definition.
- "partOfSpeech": Noun, Verb, Adjective, Adverb, etc.
- "exampleSentence": A natural, high-context example sentence in English.

Respond ONLY in valid JSON with this exact structure:
{
  "word": "English word",
  "banglaMeaning": "Concise Bangla meaning",
  "banglaDefinition": "Natural, student-friendly Bangla definition/explanation",
  "englishDefinition": "English definition",
  "partOfSpeech": "Adjective/Noun/Verb/etc",
  "pronunciation": "/IPA phonetic/",
  "exampleSentence": "Example sentence illustrating the word.",
  "synonyms": ["syn1", "syn2", "syn3"],
  "antonyms": ["ant1", "ant2"],
  "antonymMeaning": "Bangla meaning of antonym"
}
No extra text. No markdown backticks. Pure JSON only.`;
}

function buildAutofillPrompt(word) {
  return `You are an elite vocabulary assistant for Bangladeshi students (HSC / BUET aspirants).
For the English word "${word}", provide comprehensive dictionary details.

Guidelines for Bangla content:
- "banglaMeaning": A concise, accurate Bengali meaning (e.g. "খুঁতখুঁতে / নিখুঁত").
- "banglaDefinition": A natural, student-friendly, and crystal-clear Bengali definition/explanation (e.g. "খুঁটিনাটি বিষয়ের প্রতি অত্যন্ত যত্নশীল; সূক্ষ্মভাবে ও নিখুঁতভাবে কাজ করে এমন।"). Never use stiff machine translation.
- "englishDefinition": Clear English dictionary definition.

Respond ONLY in valid JSON with this exact structure:
{
  "word": "${word}",
  "banglaMeaning": "Concise Bangla meaning",
  "banglaDefinition": "Natural student-friendly Bangla definition",
  "englishDefinition": "English definition",
  "partOfSpeech": "Adjective/Noun/Verb/etc",
  "pronunciation": "/IPA phonetic/",
  "exampleSentence": "Example sentence using the word.",
  "synonyms": ["s1", "s2", "s3"],
  "antonyms": ["a1", "a2"],
  "antonymMeaning": "Bangla meaning of first antonym"
}
Pure JSON only. No markdown, no explanation.`;
}

async function callOpenRouter(prompt) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  'https://zyntra.app',
      'X-Title':       'Zyntra Study Tracker',
    },
    body: JSON.stringify({
      model:       MODEL,
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens:  600,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error: ${response.status} — ${err}`);
  }

  const data  = await response.json();
  const text  = data.choices?.[0]?.message?.content || '{}';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

async function lexiLookup(input, language = 'en') {
  return callOpenRouter(buildLookupPrompt(input, language));
}

async function autofillWord(word) {
  return callOpenRouter(buildAutofillPrompt(word));
}

module.exports = { lexiLookup, autofillWord };