import { modelRegistry } from './discovery.mjs';
import { CONFIG } from './config.mjs';

// Define preferred models for each task category
const taskPreferences = {
  coding: [
    { provider: 'openrouter', model: 'cohere/north-mini-code:free' },
    { provider: 'openrouter', model: 'qwen/qwen-2.5-72b-instruct:free' },
    { provider: 'gemini', model: 'gemini-2.5-flash' }
  ],
  reasoning: [
    { provider: 'openrouter', model: 'z-ai/glm-5.2:free' },
    { provider: 'openrouter', model: 'deepseek/deepseek-r1:free' },
    { provider: 'gemini', model: 'gemini-2.5-pro' }
  ],
  strategy: [
    { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
    { provider: 'gemini', model: 'gemini-2.5-pro' }
  ],
  audit: [
    { provider: 'openrouter', model: 'nvidia/nemotron-3-ultra-550b-a55b:free' },
    { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' }
  ],
  large_context: [
    { provider: 'gemini', model: 'gemini-2.5-pro' },
    { provider: 'gemini', model: 'gemini-2.5-flash' }
  ],
  fast: [
    { provider: 'openrouter', model: 'minimax/minimax-m3:free' },
    { provider: 'gemini', model: 'gemini-1.5-flash' }
  ],
  general: [
    { provider: 'openrouter', model: 'mistralai/mistral-small-24b-instruct-2501:free' },
    { provider: 'gemini', model: 'gemini-2.5-flash' },
    { provider: 'openrouter', model: 'google/gemma-4-31b-it:free' }
  ]
};

// Ensure a model is available in the registry
function verifyModelAvailability(provider, modelId) {
  const models = modelRegistry[provider] || [];
  // If registry empty (e.g. initialization in progress), loosely allow.
  // Otherwise enforce it exists.
  if (models.length === 0) return true;
  return models.some(m => m.id === modelId);
}

export function routeRequest(taskCategory, manualProvider = null, manualModel = null) {
  const candidates = [];

  // Manual override handling
  if (manualProvider && manualProvider !== 'auto') {
      if (manualModel && manualModel !== 'auto') {
          return [{ provider: manualProvider, model: manualModel, reason: 'manual_override' }];
      } else {
          // Explicit provider but no model, pick first preferred for category
          const preferences = taskPreferences[taskCategory] || taskPreferences.general;
          const matchedPref = preferences.find(p => p.provider === manualProvider);
          if (matchedPref) {
             return [{ provider: manualProvider, model: matchedPref.model, reason: 'manual_override' }];
          }
          // if no preferred match, pick general fallback for that provider
          if (manualProvider === 'gemini') return [{ provider: 'gemini', model: 'gemini-2.5-flash', reason: 'manual_override' }];
          return [{ provider: 'openrouter', model: 'mistralai/mistral-small-24b-instruct-2501:free', reason: 'manual_override' }];
      }
  }

  if (manualModel && manualModel !== 'auto' && !manualProvider) {
      // openrouter:meta-llama/llama-3... format check
      if (manualModel.includes(':')) {
          const parts = manualModel.split(':');
          if (['openrouter', 'gemini'].includes(parts[0])) {
             return [{ provider: parts[0], model: parts.slice(1).join(':'), reason: 'manual_override' }];
          }
      }
      // default to openrouter if not specified but model is
      return [{ provider: 'openrouter', model: manualModel, reason: 'manual_override' }];
  }

  // Get preferred models for the task
  const preferences = taskPreferences[taskCategory] || taskPreferences.general;

  for (const pref of preferences) {
    // Check if we have API keys for this provider
    const hasKey = pref.provider === 'openrouter'
      ? (CONFIG.keys.openrouter1 || CONFIG.keys.openrouter2)
      : CONFIG.keys[pref.provider];

    if (hasKey && verifyModelAvailability(pref.provider, pref.model)) {
      candidates.push({
        ...pref,
        reason: `preferred_for_${taskCategory}`
      });
    }
  }

  // Fallback: If no preferred candidates matched, push general fallbacks
  if (candidates.length === 0) {
      if (CONFIG.keys.openrouter1 || CONFIG.keys.openrouter2) {
          candidates.push({ provider: 'openrouter', model: 'mistralai/mistral-small-24b-instruct-2501:free', reason: 'general_fallback' });
      }
      if (CONFIG.keys.gemini) {
          candidates.push({ provider: 'gemini', model: 'gemini-2.5-flash', reason: 'general_fallback' });
      }
  }

  return candidates;
}