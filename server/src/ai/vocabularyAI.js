// server/src/ai/vocabularyAI.js

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4o-mini';

function buildLookupPrompt(input, language) {
  return `You are a bilingual English-Bangla vocabulary assistant.
Given the ${language === 'bn' ? 'Bangla' : 'English'} word/phrase: "${input}"

Respond ONLY in valid JSON with this exact structure:
{
  "word": "English word",
  "banglaMeaning": "Bangla meaning",
  "pronunciation": "phonetic pronunciation",
  "synonyms": ["syn1", "syn2", "syn3"],
  "antonyms": ["ant1", "ant2"],
  "antonymMeaning": "Bangla meaning of first antonym",
  "sentences": [
    "Example sentence 1.",
    "Example sentence 2.",
    "Example sentence 3."
  ]
}
No extra text. No markdown backticks. Pure JSON only.`;
}

function buildAutofillPrompt(word) {
  return `You are a vocabulary assistant. For the English word "${word}", respond ONLY in valid JSON:
{
  "banglaMeaning": "Bangla meaning",
  "pronunciation": "phonetic pronunciation",
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
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://zyntra.app',   // তোমার Netlify URL দাও
      'X-Title': 'Zyntra Study Tracker',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error: ${response.status} — ${err}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '{}';

  // Strip accidental markdown fences
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export async function lexiLookup(input, language = 'en') {
  return callOpenRouter(buildLookupPrompt(input, language));
}

export async function autofillWord(word) {
  return callOpenRouter(buildAutofillPrompt(word));
}