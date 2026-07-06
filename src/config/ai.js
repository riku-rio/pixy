const aiConfig = {
  provider: process.env.AI_PROVIDER || "groq",

  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
  },

  maxOutputTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS || 500),
  temperature: Number(process.env.AI_TEMPERATURE || 0.3),
  replyCooldownMs: Number(process.env.AI_REPLY_COOLDOWN_MS || 3000),
  maxInputChars: Number(process.env.AI_MAX_INPUT_CHARS || 2500),
  recentMessagesLimit: Number(process.env.AI_RECENT_MESSAGES_LIMIT || 8),
};

module.exports = { aiConfig };
