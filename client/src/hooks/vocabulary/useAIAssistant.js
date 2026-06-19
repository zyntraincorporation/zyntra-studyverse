import { useMutation } from '@tanstack/react-query';
import { useStore } from '../../store';

// ── Language Detection ─────────────────────────────────────────────────────────
// Detects if the input string contains Bangla Unicode characters (U+0980–U+09FF)
function detectLanguage(input) {
  const banglaPattern = /[\u0980-\u09FF]/;
  return banglaPattern.test(input.trim()) ? 'bn' : 'en';
}

// ── Field Normalizer ───────────────────────────────────────────────────────────
// The OpenRouter API may return bnMeaning OR banglaMeaning depending on prompt.
// This normalizes everything into a consistent shape used throughout the app.
function normalizeResult(raw, detectedLang) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    word:          raw.word         || raw.input  || '',
    banglaMeaning: raw.banglaMeaning || raw.bnMeaning || raw.meaning || '',
    englishMeaning: raw.englishMeaning || raw.definition || raw.meaning || '',
    pronunciation: raw.pronunciation || raw.phonetic || '',
    partOfSpeech:  raw.partOfSpeech  || raw.pos    || '',
    example:       raw.example       || (raw.sentences?.[0]) || '',
    synonyms:      Array.isArray(raw.synonyms)  ? raw.synonyms  : [],
    antonyms:      Array.isArray(raw.antonyms)  ? raw.antonyms  : [],
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
    ? `You are a bilingual dictionary assistant. The user has given a Bangla word or phrase.
Return a JSON object with EXACTLY these fields:
{
  "word": string (the Bangla word),
  "englishMeaning": string (English translation),
  "banglaMeaning": string (Bangla definition/explanation),
  "pronunciation": string (phonetic in Roman script),
  "partOfSpeech": string,
  "example": string (Bangla example sentence),
  "synonyms": string[] (Bangla synonyms),
  "antonyms": string[] (Bangla antonyms)
}
IMPORTANT: banglaMeaning must NEVER be empty. Respond ONLY with valid JSON, no markdown.`
    : `You are a bilingual dictionary assistant for a Bangladeshi student learning English.
Given an English word or phrase, return a JSON object with EXACTLY these fields:
{
  "word": string,
  "banglaMeaning": string (Bengali/Bangla translation — REQUIRED, must not be empty),
  "englishMeaning": string (English definition),
  "pronunciation": string (IPA phonetic),
  "partOfSpeech": string (noun/verb/adjective etc.),
  "example": string (example sentence in English),
  "synonyms": string[] (2-4 English synonyms),
  "antonyms": string[] (2-4 English antonyms)
}
CRITICAL: banglaMeaning is mandatory. Respond ONLY with valid JSON, no markdown.`;

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
      max_tokens: 400,
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
    ? `You are a vocabulary assistant. The user entered a Bangla word.
Return ONLY a JSON object:
{
  "banglaMeaning": string (Bangla explanation/definition — REQUIRED),
  "englishMeaning": string (English translation),
  "pronunciation": string,
  "partOfSpeech": string,
  "example": string (Bangla example sentence),
  "synonyms": ["word1","word2"],
  "antonyms": ["word1","word2"]
}
Respond ONLY with valid JSON.`
    : `You are a vocabulary assistant for a Bangladeshi student.
For the given English word, return ONLY a JSON object:
{
  "banglaMeaning": string (Bengali meaning — REQUIRED, must never be empty),
  "englishMeaning": string (English definition),
  "pronunciation": string (IPA),
  "partOfSpeech": string,
  "example": string (example sentence),
  "synonyms": ["word1","word2"],
  "antonyms": ["word1","word2"]
}
CRITICAL: banglaMeaning must always be filled. Respond ONLY with valid JSON.`;

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
      max_tokens: 400,
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