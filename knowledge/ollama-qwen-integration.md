# Pattern: Ollama / Qwen Local Provider Integration

## Context
ICoder Plus — AI Development Platform
Mac Mini M4 server, Ollama local inference

## Problem
Need local AI provider alongside cloud providers (OpenAI, Anthropic, DeepSeek).
Local model = no data leaves server, works offline, no API costs.

## Solution
Add `ollama` as 4th provider in backend AI gateway.

## Backend — aiRoutes.js
```javascript
// Handler
async function handleOllama(messages) {
  const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:72b';

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false
    }),
    signal: AbortSignal.timeout(120000)  // ← CRITICAL: 72B model is slow
  });

  const data = await response.json();
  return {
    success: true,
    response: data.message?.content || '',
    usage: {
      prompt_tokens: data.prompt_eval_count || 0,
      completion_tokens: data.eval_count || 0,
      total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
    }
  };
}

// Health check
async function testOllama() {
  const response = await fetch('http://localhost:11434/api/tags',
    { signal: AbortSignal.timeout(5000) }
  );
  const data = await response.json();
  return data.models?.some(m => m.name.includes('qwen')) || false;
}

// Router
case 'ollama':
  result = await handleOllama(messages);
  break;
```

## Frontend — AIService.ts
```typescript
// Add to provider type
type Provider = 'openai' | 'anthropic' | 'deepseek' | 'ollama';

// Add to mapping
private mapAssistantToProvider(assistant: string) {
  const mapping = {
    'Dashka':   'openai',
    'Claude':   'anthropic',
    'DeepSeek': 'deepseek',
    'Qwen':     'ollama'    // ← NEW
  };
}

// Add method
async sendToQwen(message: string): Promise<AIResponse> {
  return this.sendMessageToBackend('ollama', [{
    role: 'system',
    content: 'Ты Qwen — локальный инженер Solar ERP. Работаешь на Mac Mini M4 через Ollama. Отвечай кратко и по делу.',
    timestamp: Date.now()
  }, {
    role: 'user', content: message, timestamp: Date.now()
  }]);
}
```

## Frontend — types/index.ts
```typescript
export type AgentType = 'dashka' | 'claudy' | 'qwen';  // add 'qwen'
```

## Frontend — AIAssistant.tsx
```tsx
// Add to AGENTS array
{ id: 'qwen', label: 'Qwen', emoji: '⚡',
  description: 'Local engineer — Qwen2.5 72B on Mac M4',
  color: 'bg-emerald-600' }
```

## Key Learnings
- Timeout 120000ms (2 min) is REQUIRED — 72B model first tokens are slow
- Use `/api/tags` endpoint to detect if Qwen model is loaded
- Mock fallback prevents UI crash when Ollama is down
- `stream: false` simplifies response handling vs streaming
- Model name check: `m.name.includes('qwen')` — works for qwen2.5:72b

## Environment Variables (.env)
```
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:72b
```

## Architecture Result
```
ICoder Frontend
      │
ICoder Backend AI Gateway
      ├── OpenAI    (Dashka — architect)
      ├── Anthropic (Claude — engineer)
      ├── DeepSeek  (optimizer)
      └── Ollama    (Qwen — local engineer)  ← NEW
```
