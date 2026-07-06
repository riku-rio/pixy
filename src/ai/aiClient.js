const { aiConfig } = require("../config/ai");
const { generateGroqReply } = require("./providers/groqProvider");

async function generateAiReply({ messages, provider, model }) {
  const selectedProvider = provider || aiConfig.provider;

  if (selectedProvider === "groq") {
    return generateGroqReply({
      messages,
      model,
    });
  }

  throw new Error(`Unsupported AI provider: ${selectedProvider}`);
}

module.exports = {
  generateAiReply,
};
