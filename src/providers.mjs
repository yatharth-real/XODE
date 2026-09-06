import { CONFIG } from './config.mjs';

let openRouterKeyIndex = 0;

export function getOpenRouterKey() {
  const k1 = CONFIG.keys.openrouter1;
  const k2 = CONFIG.keys.openrouter2;

  if (k1 && k2) {
    openRouterKeyIndex = (openRouterKeyIndex + 1) % 2;
    return openRouterKeyIndex === 0 ? k1 : k2;
  }
  return k1 || k2 || null;
}

export function buildOpenRouterPayload(model, payload, key) {
  return {
    url: `${CONFIG.endpoints.openrouter}/chat/completions`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'http://localhost:4000',
      'X-Title': 'Thursday Router'
    },
    body: JSON.stringify({
      ...payload,
      model
    })
  };
}

export function buildGeminiPayload(model, payload, key) {
  // Use generateContent instead of streamGenerateContent for simple execution
  const action = 'generateContent';
  const url = `${CONFIG.endpoints.gemini}/${model}:${action}?key=${encodeURIComponent(key)}`;

  let systemInstruction = null;
  const contents = [];

  for (const msg of payload.messages || []) {
    if (msg.role === 'system') {
      systemInstruction = { parts: [{ text: msg.content }] };
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }]
      });
    }
  }

  const body = {
    contents,
    generationConfig: {
      maxOutputTokens: payload.max_tokens || 4096,
      temperature: payload.temperature ?? 0.7
    }
  };

  if (systemInstruction) {
    body.systemInstruction = systemInstruction;
  }

  return {
    url,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

export function parseOpenRouterResponse(json) {
  return json.choices?.[0]?.message?.content || '';
}

export function parseGeminiResponse(json) {
  return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
}