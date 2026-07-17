const GroqSDK = require("groq-sdk");
const { aiConfig } = require("../../config/ai");

const Groq = GroqSDK.default || GroqSDK;

const clients = new Map();

function getGroqClient(apiKey) {
  const effectiveKey = apiKey || aiConfig.groq.apiKey;

  if (!effectiveKey) {
    throw new Error("Missing GROQ_API_KEY in environment variables or guild settings.");
  }

  // Use cached client for same API key
  if (!clients.has(effectiveKey)) {
    clients.set(effectiveKey, new Groq({ apiKey: effectiveKey }));
  }

  return clients.get(effectiveKey);
}

async function generateGroqReply({ messages, model, apiKey }) {
  const groq = getGroqClient(apiKey);

  const response = await groq.chat.completions.create({
    model: model || aiConfig.groq.model,
    messages,
    temperature: aiConfig.temperature,
    max_completion_tokens: aiConfig.maxOutputTokens,
  });

  const content = response.choices?.[0]?.message?.content?.trim();

  return {
    text: content || "",
    raw: response,
    usage: response.usage || null,
    model: response.model || model || aiConfig.groq.model,
  };
}

module.exports = {
  generateGroqReply,
};
