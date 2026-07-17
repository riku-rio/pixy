const { prisma } = require("./prisma");
const {
  decryptCredential,
  isEncryptedCredential,
} = require("../security/credentialEncryption");
const { DEFAULT_GROQ_MODEL } = require("../ai/groqModels");

const defaultAiConfig = Object.freeze({
  provider: "groq",
  groq: Object.freeze({
    model: DEFAULT_GROQ_MODEL,
  }),
  maxOutputTokens: 500,
  temperature: 0.3,
  replyCooldownMs: 3000,
  maxInputChars: 2500,
  recentMessagesLimit: 8,
  agentActionsEnabled: true,
  escalationEnabled: true,
  maxAdminRoutesPerGuild: 10,
  ticketCloseDeleteDelayMs: 2500,
  actionMaxReplyChars: 1000,
  renameReviewEnabled: true,
  escalationNotificationChannelName: "pixy-notifications",
  renameBlockedWords: ["fuck", "fucking", "fuk", "shit", "bitch", "nigga"],
});

// Synchronous application defaults retained for non-guild utility code.
// Guild AI requests must use getGuildAiConfig().
const aiConfig = {
  ...defaultAiConfig,
  groq: {
    model: DEFAULT_GROQ_MODEL,
    apiKey: null,
  },
};

async function getOrCreateGuildSetting(guildId) {
  const normalizedGuildId = String(guildId || "").trim();
  if (!normalizedGuildId) {
    throw new Error("A guild ID is required to load Pixy settings.");
  }

  return prisma.guildSetting.upsert({
    where: { guildId: normalizedGuildId },
    update: {},
    create: { guildId: normalizedGuildId },
  });
}

async function getGuildAiConfig(guildId, { requireApiKey = false } = {}) {
  const setting = await getOrCreateGuildSetting(guildId);
  let apiKey = null;
  let credentialStatus = "missing";

  if (setting.groqApiKeyEncrypted) {
    if (!isEncryptedCredential(setting.groqApiKeyEncrypted)) {
      credentialStatus = "invalid";
    } else {
      try {
        apiKey = decryptCredential(setting.groqApiKeyEncrypted, {
          guildId: setting.guildId,
          credentialType: "groq-api-key",
        });
        credentialStatus = "configured";
      } catch {
        credentialStatus = "invalid";
      }
    }
  }

  if (requireApiKey && !apiKey) {
    const error = new Error(
      credentialStatus === "invalid"
        ? "This server's Groq API key must be replaced in /pixy-settings."
        : "This server must configure a Groq API key in /pixy-settings."
    );
    error.code = credentialStatus === "invalid"
      ? "invalid_guild_groq_api_key"
      : "missing_guild_groq_api_key";
    throw error;
  }

  return {
    ...defaultAiConfig,
    groq: {
      apiKey,
      model: setting.aiModel || DEFAULT_GROQ_MODEL,
    },
    aiReplyEnabled: setting.aiReplyEnabled,
    closeTicketEnabled: setting.closeTicketEnabled,
    renameReviewEnabled: setting.renameReviewEnabled,
    escalationEnabled: setting.escalationEnabled,
    agentActionsEnabled: setting.agentActionsEnabled,
    credentialStatus,
    setting,
  };
}

module.exports = {
  aiConfig,
  defaultAiConfig,
  getGuildAiConfig,
  getOrCreateGuildSetting,
};
