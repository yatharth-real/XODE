import express from 'express';
import { modelRegistry, refreshModels } from './discovery.mjs';
import { classifyTask } from './classifier.mjs';
import { routeRequest } from './router.mjs';
import { executeWithFallback } from './execution.mjs';

export const api = express.Router();

// GET /health - Check service status
api.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// GET /models - Returns discovered model registry
api.get('/models', async (req, res) => {
  if (req.query.refresh === 'true') {
    await refreshModels();
  }
  res.json(modelRegistry);
});

// GET /routes - Test classification and candidate scoring
api.get('/routes', (req, res) => {
  const { prompt } = req.query;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt query parameter' });
  }

  const category = classifyTask(prompt);
  const candidates = routeRequest(category);

  res.json({
    prompt_preview: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''),
    classification: category,
    candidates
  });
});

// POST /route - Main routing endpoint
api.post('/route', async (req, res) => {
  try {
    const { prompt, messages, provider, model, temperature, max_tokens } = req.body;

    // Either prompt or messages is required
    let resolvedMessages = messages;
    if (!resolvedMessages && prompt) {
      resolvedMessages = [{ role: 'user', content: prompt }];
    }

    if (!resolvedMessages || !Array.isArray(resolvedMessages) || resolvedMessages.length === 0) {
      return res.status(400).json({ error: 'Must provide prompt (string) or messages (array)' });
    }

    // Use last user message for classification
    const lastUserMsg = resolvedMessages.slice().reverse().find(m => m.role === 'user');
    const textToClassify = lastUserMsg ? lastUserMsg.content : '';

    const category = classifyTask(textToClassify);
    const candidates = routeRequest(category, provider, model);

    if (candidates.length === 0) {
        return res.status(503).json({ error: 'No suitable candidates found or configured keys are missing.' });
    }

    const payload = {
      messages: resolvedMessages,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? 1024
    };

    const result = await executeWithFallback(candidates, payload);

    // Mix metadata with response
    res.json({
      response: result.content,
      metadata: {
        task_category: category,
        selected_provider: result.provider,
        selected_model: result.model,
        reason: result.reason,
        latency_ms: result.latency,
        attempts: result.attempts
      }
    });

  } catch (error) {
    console.error(`[API /route Error]`, error);
    res.status(500).json({ error: error.message });
  }
});