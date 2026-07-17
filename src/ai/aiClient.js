const { aiConfig, getGuildAiConfig } = require("../config/ai");
const { getCurrentGuildId } = require("../context/guildContext");
const { generateGroqReply } = require("./providers/groqProvider");

async function generateAiReply({
  messages,
  provider,
  model,
  apiKey,
  guildId,
} = {}) {
  const resolvedGuildId = guildId || getCurrentGuildId();
  let selectedProvider = provider || aiConfig.provider;
  let selectedModel = model || aiConfig.groq.model;
  let selectedApiKey = apiKey || null;

  if (resolvedGuildId && !selectedApiKey) {
    const guildConfig = await getGuildAiConfig(resolvedGuildId, {
      requireApiKey: true,
    });

    selectedProvider = guildConfig.provider;
    selectedModel = guildConfig.groq.model;
    selectedApiKey = guildConfig.groq.apiKey;
  }

  if (selectedProvider === "groq") {
    return generateGroqReply({
      messages,
      model: selectedModel,
      apiKey: selectedApiKey,
    });
  }

  throw new Error(`Unsupported AI provider: ${selectedProvider}`);
}

module.exports = {
  generateAiReply,
};
