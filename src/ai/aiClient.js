const { aiConfig, getGuildAiConfig } = require("../config/ai");
const { getCurrentGuildId } = require("../context/guildContext");
const { reserveGuildAiRequest } = require("../plans/guildUsageService");
const { generateGroqReply } = require("./providers/groqProvider");

function buildQuotaMessage(usage) {
  const resetUnix = Math.floor(usage.resetAt.getTime() / 1000);
  return [
    `This server has used all **${usage.dailyLimit}** Pixy AI requests available today.`,
    `Usage resets <t:${resetUnix}:R>.`,
  ].join("\n");
}

async function generateAiReply({
  messages,
  provider,
  model,
  apiKey,
  guildId,
  skipQuota = false,
} = {}) {
  const resolvedGuildId = guildId || getCurrentGuildId();
  let selectedProvider = provider || aiConfig.provider;
  let selectedModel = model || aiConfig.groq.model;
  let selectedApiKey = apiKey || null;

  if (resolvedGuildId && !selectedApiKey) {
    const guildConfig = await getGuildAiConfig(resolvedGuildId, { requireApiKey: true });
    selectedProvider = guildConfig.provider;
    selectedModel = guildConfig.groq.model;
    selectedApiKey = guildConfig.groq.apiKey;
  }

  if (resolvedGuildId && !skipQuota) {
    const usage = await reserveGuildAiRequest(resolvedGuildId);
    if (!usage.allowed) {
      return {
        text: buildQuotaMessage(usage),
        raw: null,
        usage: null,
        model: selectedModel,
        quotaExceeded: true,
        quota: usage,
      };
    }
  }

  if (selectedProvider === "groq") {
    return generateGroqReply({ messages, model: selectedModel, apiKey: selectedApiKey });
  }

  throw new Error(`Unsupported AI provider: ${selectedProvider}`);
}

module.exports = { generateAiReply };
