const GroqSDK = require("groq-sdk");
const { aiConfig } = require("../../config/ai");

const Groq = GroqSDK.default || GroqSDK;

async function generateGroqReply({ messages, model, apiKey }) {
  const key = String(apiKey || "").trim();
  if (!key) {
    const error = new Error(
      "This server must configure a Groq API key in /pixy-settings."
    );
    error.code = "missing_guild_groq_api_key";
    throw error;
  }

  // Construct per request so plaintext guild credentials are not retained in
  // an unbounded process-wide cache.
  const groq = new Groq({ apiKey: key });
  const selectedModel = model || aiConfig.groq.model;

  const response = await groq.chat.completions.create({
    model: selectedModel,
    messages,
    temperature: aiConfig.temperature,
    max_completion_tokens: aiConfig.maxOutputTokens,
  });

  const content = response.choices?.[0]?.message?.content?.trim();

  return {
    text: content || "",
    raw: response,
    usage: response.usage || null,
    model: response.model || selectedModel,
  };
}

module.exports = {
  generateGroqReply,
};
