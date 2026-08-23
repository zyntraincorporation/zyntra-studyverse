import { useMutation } from '@tanstack/react-query';
import { useStore } from '../../store';

// ── Language Detection ─────────────────────────────────────────────────────────
// Detects if the input string contains Bangla Unicode characters (U+0980–U+09FF)
function detectLanguage(input) {
  const banglaPattern = /[\u0980-\u09FF]/;
  return banglaPattern.test(input.trim()) ? 'bn' : 'en';
}

// ── Field Normalizer ───────────────────────────────────────────────────────────
// Normalizes raw AI output into a canonical shape across the entire application.
function normalizeResult(raw, detectedLang) {
  if (!raw || typeof raw !== 'object') return null;

  const rawBanglaDef = raw.banglaDefinition || raw.banglaMeaning || raw.bnMeaning || raw.meaning || '';
  const rawBanglaMean = raw.banglaMeaning || raw.banglaDefinition || raw.bnMeaning || raw.meaning || '';
  const rawEnglishDef = raw.englishDefinition || raw.englishMeaning || raw.definition || raw.meaning || '';
  const rawExample = raw.exampleSentence || raw.example || (raw.sentences?.[0]) || '';
  const rawPos = raw.partOfSpeech || raw.pos || '';

  return {
    word:              raw.word              || raw.input  || '',
    banglaMeaning:     rawBanglaMean,
    banglaDefinition:  rawBanglaDef,
    englishDefinition: rawEnglishDef,
    englishMeaning:    rawEnglishDef,
    pronunciation:     raw.pronunciation     || raw.phonetic || '',
    partOfSpeech:      rawPos,
    exampleSentence:   rawExample,
    example:           rawExample,
    synonyms:          Array.isArray(raw.synonyms)  ? raw.synonyms  : (typeof raw.synonyms === 'string' ? raw.synonyms.split(',').map(s => s.trim()).filter(Boolean) : []),
    antonyms:          Array.isArray(raw.antonyms)  ? raw.antonyms  : (typeof raw.antonyms === 'string' ? raw.antonyms.split(',').map(s => s.trim()).filter(Boolean) : []),
    antonymMeaning:    raw.antonymMeaning    || '',
    detectedLang,
  };
}

// ── Lexi Lookup (AI Assistant panel) ──────────────────────────────────────────
async function openRouterLookup(input) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('VITE_OPENROUTER_API_KEY not set');

  const lang = detectLanguage(input);
  const isBangla = lang === 'bn';

  const systemPrompt = isBangla
    ? `You are an elite bilingual English-Bangla vocabulary assistant for Bangladeshi students (HSC/BUET aspirants).
The user entered a Bangla word or phrase.
Return a pure JSON object with EXACTLY these fields:
{
  "word": string (corresponding English vocabulary word),
  "banglaMeaning": string (সংক্ষিপ্ত ও স্পষ্ট বাংলা অর্থ),
  "banglaDefinition": string (সহজবোধ্য, স্বাভাবিক ও প্রাঞ্জল বাংলা সংজ্ঞা/ব্যাখ্যা — ভুলেও যান্ত্রিক অনুবাদ করবে না),
  "englishDefinition": string (accurate English dictionary definition),
  "pronunciation": string (IPA phonetic /prəˌnʌnsiˈeɪʃn/),
  "partOfSpeech": string (Noun / Verb / Adjective / Adverb etc.),
  "exampleSentence": string (a natural, contextual example sentence in English),
  "synonyms": string[] (2-4 English synonyms),
  "antonyms": string[] (1-3 English antonyms),
  "antonymMeaning": string (বাংলা অর্থ of antonyms)
}
CRITICAL: "banglaDefinition" and "banglaMeaning" must be natural, student-friendly, and never empty. Pure JSON only, no markdown.`
    : `You are an elite bilingual English-Bangla vocabulary assistant for Bangladeshi students (HSC/BUET aspirants).
Given an English word, provide comprehensive, natural dictionary details.

Guidelines:
- "banglaMeaning": Concise, accurate Bangla meaning (e.g. "খুঁতখুঁতে / নিখুঁত কারিগর").
- "banglaDefinition": Natural, student-friendly, and crystal-clear Bangla definition / explanation (e.g. "খুঁটিনাটি বিষয়ের প্রতি অত্যন্ত যত্নশীল; সূক্ষ্মভাবে ও নিখুঁতভাবে কাজ করে এমন।"). Do NOT provide awkward literal machine translations (e.g. for "Reluctant", write "কোনো কিছু করতে অনীহা বা অনিচ্ছা থাকা", not "অনিচ্ছুক হতে প্রবণ").
- "englishDefinition": Clear, concise English dictionary definition.
- "partOfSpeech": Part of speech (e.g. Adjective, Noun, Verb, Adverb).
- "exampleSentence": A high-quality contextual example sentence in English.

Return a pure JSON object with EXACTLY these fields:
{
  "word": string (the English word),
  "banglaMeaning": string (concise Bangla meaning),
  "banglaDefinition": string (natural student-friendly Bangla definition — REQUIRED),
  "englishDefinition": string (English definition — REQUIRED),
  "pronunciation": string (IPA phonetic),
  "partOfSpeech": string,
  "exampleSentence": string,
  "synonyms": string[] (2-4 synonyms),
  "antonyms": string[] (1-3 antonyms),
  "antonymMeaning": string (Bangla meaning of first antonym)
}
CRITICAL: "banglaDefinition" and "englishDefinition" must be high quality and non-empty. Respond ONLY with valid JSON.`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://zyntra-studyverse.netlify.app',
      'X-Title': 'ZYNTRA StudyVerse',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      max_tokens: 500,
      temperature: 0.25,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: input.trim() },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim() || '{}';
  // Strip possible markdown code fences
  const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  const parsed = JSON.parse(clean);
  return normalizeResult(parsed, lang);
}

// ── AI Autofill (WordForge) ────────────────────────────────────────────────────
async function openRouterAutofill(word) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('VITE_OPENROUTER_API_KEY not set');

  const lang = detectLanguage(word);
  const isBangla = lang === 'bn';

  const systemPrompt = isBangla
    ? `You are a vocabulary assistant for Bangladeshi students (HSC/BUET aspirants).
The user entered a Bangla word.
Return ONLY a JSON object:
{
  "word": string (corresponding English word),
  "banglaMeaning": string (সংক্ষিপ্ত বাংলা অর্থ),
  "banglaDefinition": string (স্বাভাবিক ও সহজবোধ্য প্রাঞ্জল বাংলা সংজ্ঞা/ব্যাখ্যা — REQUIRED),
  "englishDefinition": string (English definition — REQUIRED),
  "pronunciation": string (IPA),
  "partOfSpeech": string,
  "exampleSentence": string (English example sentence),
  "synonyms": ["word1","word2"],
  "antonyms": ["word1","word2"],
  "antonymMeaning": string (বাংলা অর্থ of antonym)
}
CRITICAL: banglaDefinition must be natural student-friendly Bangla. Respond ONLY with valid JSON.`
    : `You are an elite vocabulary assistant for Bangladeshi students (HSC/BUET aspirants).
For the given English word, provide comprehensive dictionary details.

Guidelines for Bangla content:
- "banglaMeaning": Concise, accurate Bangla meaning (e.g. "খুঁতখুঁতে / নিখুঁত").
- "banglaDefinition": Natural, student-friendly, and crystal-clear Bangla definition/explanation (e.g. "খুঁটিনাটি বিষয়ের প্রতি অত্যন্ত যত্নশীল; সূক্ষ্মভাবে ও নিখুঁতভাবে কাজ করে এমন।"). Never use awkward literal machine translations (e.g., for "Reluctant", write "কোনো কিছু করতে অনীহা বা অনিচ্ছা থাকা", not "অনিচ্ছুক হতে প্রবণ").
- "englishDefinition": Clear English dictionary definition.
- "partOfSpeech": Adjective, Noun, Verb, Adverb, etc.
- "exampleSentence": Natural, high-context example sentence in English.

Return ONLY a JSON object:
{
  "word": "${word.trim()}",
  "banglaMeaning": string (concise Bangla meaning — REQUIRED),
  "banglaDefinition": string (natural student-friendly Bangla definition — REQUIRED, must never be empty),
  "englishDefinition": string (English definition — REQUIRED, must never be empty),
  "pronunciation": string (IPA phonetic),
  "partOfSpeech": string (e.g. Adjective / Noun / Verb / Adverb),
  "exampleSentence": string (example sentence),
  "synonyms": ["word1", "word2", "word3"],
  "antonyms": ["word1", "word2"],
  "antonymMeaning": string (Bangla meaning of first antonym)
}
CRITICAL: "banglaDefinition" and "englishDefinition" must always be filled. Respond ONLY with valid JSON.`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://zyntra-studyverse.netlify.app',
      'X-Title': 'ZYNTRA StudyVerse',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      max_tokens: 500,
      temperature: 0.25,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: word.trim() },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim() || '{}';
  const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  const parsed = JSON.parse(clean);
  return normalizeResult(parsed, lang);
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

export function useLexiLookup() {
  const { setLexiResult, setLexiLoading } = useStore();
  return useMutation({
    mutationFn: ({ input }) => openRouterLookup(input),
    onMutate:   () => setLexiLoading(true),
    onSuccess:  (data) => { setLexiResult(data); setLexiLoading(false); },
    onError:    () => setLexiLoading(false),
  });
}

export function useAIAutofill() {
  return useMutation({
    mutationFn: (word) => openRouterAutofill(word),
  });
}