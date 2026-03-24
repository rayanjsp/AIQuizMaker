module.exports = {
  JWT_EXPIRY: '24h',
  QUIZ_MIN_QUESTIONS: 5,
  QUIZ_MAX_QUESTIONS: 30,
  PROVIDER_CONFIG: {
    deepseek:   { baseURL: 'https://api.deepseek.com',         defaultModel: 'deepseek-chat',                         envKey: 'DEEPSEEK_API_KEY' },
    openai:     { baseURL: null,                                defaultModel: 'gpt-4o-mini',                           envKey: 'OPENAI_API_KEY' },
    openrouter: { baseURL: 'https://openrouter.ai/api/v1',     defaultModel: 'meta-llama/llama-3.3-8b-instruct:free', envKey: 'OPENROUTER_API_KEY' },
  },
  VALID_PROVIDERS: ['deepseek', 'openai', 'openrouter'],
  RATE_LIMIT_AUTH: { windowMs: 15 * 60 * 1000, max: 10 },
  RATE_LIMIT_GENERATE: { windowMs: 60 * 60 * 1000, max: 20 },
};
