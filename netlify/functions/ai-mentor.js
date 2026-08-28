// ─────────────────────────────────────────────────────────────────────────────
// Netlify Function: ai-mentor
// Pure, secure OpenRouter proxy for Zyntra AI Mentor
//
// Keeps OPENROUTER_API_KEY secure on server side.
// Works seamlessly in Netlify serverless environment with zero heavy dependencies.
// ─────────────────────────────────────────────────────────────────────────────

// Primary: Gemini 2.5 Flash — 1M context window, cheap, fast, great for Bengali
// Fallback: GPT-4.1 — high quality, 1M context
const PRIMARY_MODEL  = 'google/gemini-2.5-flash';
const FALLBACK_MODEL = 'openai/gpt-4.1';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

async function callOpenRouter(apiKey, messages, maxTokens = 2500) {
  const tryModel = async (model) => {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  'https://zyntra-studyverse.netlify.app',
        'X-Title':       'ZYNTRA StudyVerse AI Mentor',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter (${model}) ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenRouter model');
    return { content, modelUsed: model };
  };

  try {
    return await tryModel(PRIMARY_MODEL);
  } catch (primaryErr) {
    console.warn(`[ai-mentor] Primary model (${PRIMARY_MODEL}) failed: ${primaryErr.message}. Trying fallback: ${FALLBACK_MODEL}`);
    return await tryModel(FALLBACK_MODEL);
  }
}

export const handler = async (event) => {
  // CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('[ai-mentor] OPENROUTER_API_KEY environment variable is not set');
      return {
        statusCode: 500,
        headers: CORS,
        body: JSON.stringify({
          error: 'OPENROUTER_API_KEY is not configured in Netlify environment variables.',
        }),
      };
    }

    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'Invalid JSON payload' }),
      };
    }

    const { messages, maxTokens = 2500 } = payload;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'messages array is required' }),
      };
    }

    const result = await callOpenRouter(apiKey, messages, maxTokens);

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        success: true,
        text: result.content,
        modelUsed: result.modelUsed,
      }),
    };
  } catch (err) {
    console.error('[ai-mentor] Error:', err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({
        error: err.message || 'AI request failed',
      }),
    };
  }
};
