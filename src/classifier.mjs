export function classifyTask(prompt) {
  const lowerPrompt = prompt.toLowerCase();

  // 1. Coding Tasks
  const codeMarkers = ['```', 'function ', 'class ', 'def ', 'import ', 'export ', 'const ', 'interface ', 'refactor', 'code', 'script'];
  const codeMatches = codeMarkers.filter(m => lowerPrompt.includes(m)).length;
  if (codeMatches >= 2 || (codeMatches >= 1 && prompt.length > 250)) {
    return 'coding';
  }

  // 2. Reasoning / Math Tasks
  const reasoningTerms = ['prove', 'proof', 'theorem', 'derivation', 'formal logic', 'induction', 'contradiction', 'probability', 'calculate', 'solve'];
  if (reasoningTerms.some(term => lowerPrompt.includes(term))) {
    return 'reasoning';
  }

  // 3. Strategy / Architecture Tasks
  const strategyMarkers = ['strategy', 'architecture', 'trade-off', 'monolith', 'microservice', 'distributed', 'system design'];
  if (strategyMarkers.some(m => lowerPrompt.includes(m))) {
    return 'strategy';
  }

  // 4. Audit / Security Tasks
  const auditMarkers = ['audit', 'bottleneck', 'security', 'vulnerability', 'adversary', 'attack', 'risk'];
  if (auditMarkers.some(m => lowerPrompt.includes(m))) {
    return 'audit';
  }

  // 5. Large Context / Document Summary
  if (prompt.length > 6000 || lowerPrompt.includes('summarize this document')) {
    return 'large_context';
  }

  // 6. Fast QA
  if (prompt.length < 140) {
    return 'fast';
  }

  return 'general';
}