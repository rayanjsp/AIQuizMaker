module.exports = {
  JWT_EXPIRY: '24h',
  QUIZ_MIN_QUESTIONS: 5,
  QUIZ_MAX_QUESTIONS: 30,
  PROVIDER_CONFIG: {
    deepseek:   { baseURL: 'https://api.deepseek.com',         defaultModel: 'deepseek-chat',                         envKey: 'DEEPSEEK_API_KEY' },
    openai:     { baseURL: null,                                defaultModel: 'gpt-4o-mini',                           envKey: 'OPENAI_API_KEY' },
    openrouter: { baseURL: 'https://openrouter.ai/api/v1',     defaultModel: 'meta-llama/llama-3.3-8b-instruct:free', envKey: 'OPENROUTER_API_KEY' },
    groq:       { baseURL: 'https://api.groq.com/openai/v1',   defaultModel: 'llama-3.3-70b-versatile',               envKey: 'GROQ_API_KEY' },
    mistral:    { baseURL: 'https://api.mistral.ai/v1',        defaultModel: 'mistral-small-latest',                  envKey: 'MISTRAL_API_KEY' },
    together:   { baseURL: 'https://api.together.xyz/v1',      defaultModel: 'meta-llama/Llama-3-8b-chat-hf',         envKey: 'TOGETHER_API_KEY' },
    grok:       { baseURL: 'https://api.x.ai/v1',              defaultModel: 'grok-2-latest',                         envKey: 'XAI_API_KEY' },
    // Anthropic utilise son propre SDK (pas OpenAI-compatible) — géré séparément dans aiService.js
    anthropic:  { baseURL: null,                                defaultModel: 'claude-3-5-haiku-latest',               envKey: 'ANTHROPIC_API_KEY' },
    // custom : n'importe quel provider compatible OpenAI — voir AI_BASE_URL, AI_API_KEY, AI_MODEL dans .env
    custom:     { baseURL: null,                                defaultModel: null,                                    envKey: 'AI_API_KEY' },
  },
  VALID_PROVIDERS: ['deepseek', 'openai', 'openrouter', 'groq', 'mistral', 'together', 'grok', 'anthropic', 'custom'],
  // Providers inclus dans l'auto-détection (custom exclu car nécessite AI_BASE_URL et AI_MODEL)
  AUTO_DETECT_PROVIDERS: ['deepseek', 'openai', 'openrouter', 'groq', 'mistral', 'together', 'grok', 'anthropic'],
  RATE_LIMIT_AUTH: { windowMs: 15 * 60 * 1000, max: 10 },
  RATE_LIMIT_GENERATE: { windowMs: 60 * 60 * 1000, max: 20 },
};
