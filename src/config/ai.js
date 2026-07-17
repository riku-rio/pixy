const { prisma } = require("./prisma");

const defaultAiConfig = {
  provider: "groq",

  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: "openai/gpt-oss-120b",
  },

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

  renameBlockedWords: [
    "fuck", "fucking", "fuk", "shit", "bitch", "nigga"
  ],
};

// Legacy config for backward compatibility
const aiConfig = {
  ...defaultAiConfig,
  groq: {
    ...defaultAiConfig.groq,
    apiKey: process.env.GROQ_API_KEY || defaultAiConfig.groq.apiKey,
    model: process.env.GROQ_MODEL || defaultAiConfig.groq.model,
  },
  maxOutputTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS || defaultAiConfig.maxOutputTokens),
  temperature: Number(process.env.AI_TEMPERATURE || defaultAiConfig.temperature),
  replyCooldownMs: Number(process.env.AI_REPLY_COOLDOWN_MS || defaultAiConfig.replyCooldownMs),
  maxInputChars: Number(process.env.AI_MAX_INPUT_CHARS || defaultAiConfig.maxInputChars),
  recentMessagesLimit: Number(process.env.AI_RECENT_MESSAGES_LIMIT || defaultAiConfig.recentMessagesLimit),
  agentActionsEnabled:
    String(process.env.AI_AGENT_ACTIONS_ENABLED || "true").toLowerCase() !== "false",
  escalationEnabled:
    String(process.env.AI_ESCALATION_ENABLED || "true").toLowerCase() !== "false",
  maxAdminRoutesPerGuild: Number(process.env.ADMIN_ROUTES_MAX_PER_GUILD || defaultAiConfig.maxAdminRoutesPerGuild),
  ticketCloseDeleteDelayMs: Number(
    process.env.AI_TICKET_CLOSE_DELETE_DELAY_MS || defaultAiConfig.ticketCloseDeleteDelayMs
  ),
  actionMaxReplyChars: Number(process.env.AI_ACTION_MAX_REPLY_CHARS || defaultAiConfig.actionMaxReplyChars),
  renameReviewEnabled:
    String(process.env.AI_RENAME_REVIEW_ENABLED || "true").toLowerCase() !== "false",
  escalationNotificationChannelName:
    process.env.AI_ESCALATION_NOTIFICATION_CHANNEL_NAME || defaultAiConfig.escalationNotificationChannelName,
  renameBlockedWords:
    String(process.env.AI_RENAME_BLOCKED_WORDS || "")
      .split(",")
      .map((word) => word.trim().toLowerCase())
      .filter(Boolean),
};

/**
 * Get guild-specific AI configuration
 * Falls back to global defaults from .env when no guild setting exists
 */
async function getGuildAiConfig(guildId) {
  let guildSetting = null;

  if (guildId) {
    guildSetting = await prisma.guildSetting.findUnique({
      where: { guildId },
    });
  }

  return {
    ...aiConfig,
    // Guild-specific overrides
    groq: {
      apiKey: guildSetting?.groqApiKey || aiConfig.groq.apiKey,
      model: guildSetting?.aiModel || aiConfig.groq.model,
    },
    agentActionsEnabled: guildSetting?.agentActionsEnabled ?? aiConfig.agentActionsEnabled,
    escalationEnabled: guildSetting?.escalationEnabled ?? aiConfig.escalationEnabled,
    renameReviewEnabled: guildSetting?.renameReviewEnabled ?? aiConfig.renameReviewEnabled,
    closeTicketEnabled: guildSetting?.closeTicketEnabled ?? true,
    aiReplyEnabled: guildSetting?.aiReplyEnabled ?? true,
    // Feature flags from guild settings
    _guildSetting: guildSetting,
  };
}

/**
 * Get or create a guild setting record
 */
async function getOrCreateGuildSetting(guildId) {
  let setting = await prisma.guildSetting.findUnique({
    where: { guildId },
  });

  if (!setting) {
    setting = await prisma.guildSetting.create({
      data: {
        guildId,
      },
    });
  }

  return setting;
}

module.exports = { aiConfig, defaultAiConfig, getGuildAiConfig, getOrCreateGuildSetting };
