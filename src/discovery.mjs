import { CONFIG } from './config.mjs';
import { getOpenRouterKey } from './providers.mjs';

// In-memory model registry
export const modelRegistry = {
  openrouter: [],
  gemini: []
};

// Fallback static list in case discovery fails or to initialize quickly
const defaultOpenRouterModels = [
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron 3 Ultra (Free)' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)' },
  { id: 'minimax/minimax-m3:free', name: 'MiniMax M3 Speed (Free)' },
  { id: 'cohere/north-mini-code:free', name: 'Cohere North Code (Free)' },
  { id: 'z-ai/glm-5.2:free', name: 'GLM 5.2 Reasoning (Free)' },
  { id: 'google/gemma-4-31b-it:free', name: 'Google Gemma 4 (Free)' },
  { id: 'mistralai/mistral-small-24b-instruct-2501:free', name: 'Mistral Small 24B (Free)' }
];

const defaultGeminiModels = [
  { id: 'gemini-2.5-flash', name: 'Google Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'Google Gemini 2.5 Pro' },
  { id: 'gemini-1.5-pro', name: 'Google Gemini 1.5 Pro' },
  { id: 'gemini-1.5-flash', name: 'Google Gemini 1.5 Flash' }
];

export async function refreshModels() {
  await Promise.all([
    fetchOpenRouterModels(),
    fetchGeminiModels()
  ]);
  return modelRegistry;
}

async function fetchOpenRouterModels() {
  const key = getOpenRouterKey();
  if (!key) {
    console.warn('No OpenRouter key found. Using default OpenRouter models.');
    modelRegistry.openrouter = defaultOpenRouterModels;
    return;
  }

  try {
    const res = await fetch(`${CONFIG.endpoints.openrouter}/models`, {
      headers: {
        'Authorization': `Bearer ${key}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      // Filter for free models for safety/default as in original, or keep all
      // We will keep all but mark them
      modelRegistry.openrouter = data.data.map(m => ({
        id: m.id,
        name: m.name,
        context_length: m.context_length,
        pricing: m.pricing
      }));
    } else {
      console.warn(`OpenRouter models API failed (${res.status}). Using defaults.`);
      modelRegistry.openrouter = defaultOpenRouterModels;
    }
  } catch (err) {
    console.warn(`Failed to fetch OpenRouter models: ${err.message}. Using defaults.`);
    modelRegistry.openrouter = defaultOpenRouterModels;
  }
}

async function fetchGeminiModels() {
  const key = CONFIG.keys.gemini;
  if (!key) {
    console.warn('No Gemini key found. Using default Gemini models.');
    modelRegistry.gemini = defaultGeminiModels;
    return;
  }

  try {
    // Note: models endpoint is GET https://generativelanguage.googleapis.com/v1beta/models?key=...
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      modelRegistry.gemini = data.models
        .filter(m => m.supportedGenerationMethods.includes('generateContent'))
        .map(m => ({
          id: m.name.replace('models/', ''),
          name: m.displayName,
          version: m.version
        }));
    } else {
      console.warn(`Gemini models API failed (${res.status}). Using defaults.`);
      modelRegistry.gemini = defaultGeminiModels;
    }
  } catch (err) {
    console.warn(`Failed to fetch Gemini models: ${err.message}. Using defaults.`);
    modelRegistry.gemini = defaultGeminiModels;
  }
}

// Initialize on load
refreshModels().catch(console.error);
