import {
    getOpenRouterKey,
    buildOpenRouterPayload,
    buildGeminiPayload,
    parseOpenRouterResponse,
    parseGeminiResponse
} from './providers.mjs';
import { CONFIG } from './config.mjs';

const TIMEOUT_MS = 30000; // 30 seconds

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function executeWithFallback(candidates, payload) {
  const attempts = [];
  const startTotal = performance.now();

  for (const candidate of candidates) {
    const { provider, model, reason } = candidate;
    const startCandidate = performance.now();

    try {
      let outgoing, key, parser;

      if (provider === 'openrouter') {
        key = getOpenRouterKey();
        if (!key) throw new Error('No OpenRouter key available');
        outgoing = buildOpenRouterPayload(model, payload, key);
        parser = parseOpenRouterResponse;
      } else if (provider === 'gemini') {
        key = CONFIG.keys.gemini;
        if (!key) throw new Error('No Gemini key available');
        outgoing = buildGeminiPayload(model, payload, key);
        parser = parseGeminiResponse;
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      const res = await fetchWithTimeout(outgoing.url, {
        method: 'POST',
        headers: outgoing.headers,
        body: outgoing.body
      });

      if (res.status === 429 || res.status === 404 || res.status >= 500) {
        const text = await res.text().catch(() => '');
        throw new Error(`Upstream HTTP ${res.status}: ${text}`);
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Upstream error HTTP ${res.status}: ${errText}`);
      }

      const json = await res.json();
      const content = parser(json);

      if (!content) {
        throw new Error('Model returned an empty response body');
      }

      const latency = Math.floor(performance.now() - startCandidate);

      attempts.push({ provider, model, status: 'success', latency });

      return {
        content,
        provider,
        model,
        reason,
        latency: Math.floor(performance.now() - startTotal),
        attempts
      };

    } catch (err) {
      console.warn(`[Execution] Candidate ${provider}:${model} failed: ${err.message}`);
      attempts.push({
        provider,
        model,
        status: 'error',
        error: err.message,
        latency: Math.floor(performance.now() - startCandidate)
      });
    }
  }

  throw new Error(`All ${candidates.length} candidates failed. Details: ${JSON.stringify(attempts)}`);
}