import { useMutation } from '@tanstack/react-query';
import { useStore } from '../../store';

// Lexi AI Lookup — calls OpenRouter directly from the client
// Requires VITE_OPENROUTER_API_KEY in .env
async function openRouterLookup(input, language) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('VITE_OPENROUTER_API_KEY not set');

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
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: `You are a vocabulary assistant. Given an English word or phrase, return a JSON object with:
{ "word": string, "definition": string, "bnMeaning": string (Bengali), "example": string, "synonyms": string[], "antonyms": string[], "partOfSpeech": string }
Respond ONLY with valid JSON, no markdown.`,
        },
        { role: 'user', content: `Word: ${input}. Language context: ${language || 'English'}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(text);
}

async function openRouterAutofill(word) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('VITE_OPENROUTER_API_KEY not set');

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
        {
          role: 'system',
          content: `You are a vocabulary assistant for a Bangladeshi student. For the given English word, return a JSON object:
{ "bnMeaning": string, "definition": string, "example": string, "synonyms": ["word1","word2"], "antonyms": ["word1","word2"], "difficulty": "easy"|"medium"|"hard", "topic": string }
Respond ONLY with valid JSON.`,
        },
        { role: 'user', content: `Word: ${word}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(text);
}

export function useLexiLookup() {
  const { setLexiResult, setLexiLoading } = useStore();
  return useMutation({
    mutationFn: ({ input, language }) => openRouterLookup(input, language),
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