const GroqSDK = require("groq-sdk");
const { aiConfig } = require("../../config/ai");

const Groq = GroqSDK.default || GroqSDK;

let client;

function getGroqClient() {
  if (!aiConfig.groq.apiKey) {
    throw new Error("Missing GROQ_API_KEY in environment variables.");
  }

  if (!client) {
    client = new Groq({
      apiKey: aiConfig.groq.apiKey,
    });
  }

  return client;
}

async function generateGroqReply({ messages, model }) {
  const groq = getGroqClient();

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
