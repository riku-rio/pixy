const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { prisma } = require("../config/prisma");
const { defaultAiConfig, getGuildAiConfig, getOrCreateGuildSetting } = require("../config/ai");
const { DEFAULT_GROQ_MODEL, validateGroqApiKey, validateGroqChatModel } = require("../ai/groqModels");
const { encryptCredential } = require("../security/credentialEncryption");
const { getBadWordsStats, addCustomBadWord, removeCustomBadWord } = require("../utils/badWords");

const EPHEMERAL = 64;
const PREFIX = {
  HOME: "settings_home:",
  NAV: "settings_nav:",
  TOGGLE: "settings_toggle:",
  CLOSE: "settings_close:",
  BADWORD_ACTION: "settings_badwords_action:",
  BADWORD_REMOVE: "settings_badwords_remove:",
  BADWORD_MODAL: "settings_badwords_modal:",
  API_SET: "settings_api_set:",
  API_MODAL: "settings_api_modal:",
  API_REMOVE: "settings_api_remove:",
  MODEL_SET: "settings_model_set:",
  MODEL_MODAL: "settings_model_modal:",
  MODEL_RESET: "settings_model_reset:",
};
const PAGES = Object.freeze({
  HOME: "home",
  FEATURES: "features",
  ESCALATION: "escalation",
  AIAPI: "aiapi",
  BADWORDS: "badwords",
});
const FEATURES = Object.freeze([
  { field: "aiReplyEnabled", label: "AI Reply", description: "Allow automatic AI replies inside tickets" },
  { field: "closeTicketEnabled", label: "Close Ticket", description: "Allow Pixy to close tickets" },
  { field: "renameReviewEnabled", label: "Rename Review", description: "Allow AI-assisted ticket renaming" },
  { field: "escalationEnabled", label: "Escalation", description: "Allow ticket escalation" },
  { field: "agentActionsEnabled", label: "Agent Actions", description: "Allow AI-requested ticket actions" },
]);
const FEATURE_FIELDS = new Set(FEATURES.map((feature) => feature.field));
const scoped = (prefix, userId) => `${prefix}${userId}`;
const cleanText = (value) => String(value || "").replace(/\s+/g, " ").trim();

async function assertOwner(interaction, userId) {
  if (!interaction.guild || interaction.user.id !== userId || !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: "Only the administrator who opened /pixy-settings can use this control.", flags: EPHEMERAL });
    return false;
  }
  return true;
}

function navigation(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(scoped(PREFIX.HOME, userId)).setLabel("Home").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(scoped(PREFIX.CLOSE, userId)).setLabel("Close").setStyle(ButtonStyle.Secondary)
  );
}

async function renderHome(guildId, userId) {
  const setting = await getOrCreateGuildSetting(guildId);
  const enabledCount = FEATURES.filter((feature) => setting[feature.field]).length;
  return {
    content: null,
    embeds: [new EmbedBuilder()
      .setTitle("🤖 Pixy Settings")
      .setColor(0x5865f2)
      .setDescription("Configure the features and server-owned Groq connection used by Pixy.")
      .addFields(
        { name: "Features", value: `${enabledCount}/${FEATURES.length} enabled`, inline: true },
        { name: "Groq API", value: setting.groqApiKeyEncrypted ? "Configured" : "Required", inline: true },
        { name: "Model", value: `\`${setting.aiModel || DEFAULT_GROQ_MODEL}\``, inline: true }
      )],
    components: [new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(scoped(PREFIX.NAV, userId))
        .setPlaceholder("Select a settings category...")
        .addOptions(
          { label: "Features", description: "Enable or disable Pixy features", value: PAGES.FEATURES },
          { label: "Escalation", description: "View escalation configuration", value: PAGES.ESCALATION },
          { label: "AI API", description: "Manage the Groq API key and model", value: PAGES.AIAPI },
          { label: "Bad Words", description: "Manage custom blocked words", value: PAGES.BADWORDS }
        )
    )],
  };
}

async function renderFeatures(guildId, userId) {
  const setting = await getOrCreateGuildSetting(guildId);
  return {
    content: null,
    embeds: [new EmbedBuilder()
      .setTitle("📝 Feature Settings")
      .setColor(0x5865f2)
      .setDescription("Disabled features are blocked at execution time, including actions requested by the AI.")
      .addFields(...FEATURES.map((feature) => ({
        name: feature.label,
        value: setting[feature.field] ? "✅ Enabled" : "❌ Disabled",
        inline: true,
      })))],
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(scoped(PREFIX.TOGGLE, userId))
          .setPlaceholder("Select a feature to toggle...")
          .addOptions(...FEATURES.map((feature) => ({
            label: `Toggle ${feature.label}`,
            description: feature.description,
            value: feature.field,
          })))
      ),
      navigation(userId),
    ],
  };
}

async function renderEscalation(guildId, userId) {
  const [config, setting, routeCount] = await Promise.all([
    prisma.guildConfig.findUnique({ where: { guildId } }),
    getOrCreateGuildSetting(guildId),
    prisma.adminRoute.count({ where: { guildId, enabled: true } }),
  ]);
  return {
    content: null,
    embeds: [new EmbedBuilder()
      .setTitle("🚨 Escalation Settings")
      .setColor(0xed4245)
      .setDescription("Use /pixy-admins to configure routes and channels.")
      .addFields(
        { name: "Feature", value: setting.escalationEnabled ? "✅ Enabled" : "❌ Disabled", inline: true },
        { name: "Category", value: config?.escalationCategoryId ? `<#${config.escalationCategoryId}>` : "Not configured", inline: true },
        { name: "Notifications", value: config?.escalationNotificationChannelId ? `<#${config.escalationNotificationChannelId}>` : "Not configured", inline: true },
        { name: "Routes", value: `${routeCount}/${config?.maxAdminRoutes || defaultAiConfig.maxAdminRoutesPerGuild}`, inline: true }
      )],
    components: [navigation(userId)],
  };
}

async function renderAiApi(guildId, userId) {
  const config = await getGuildAiConfig(guildId);
  const configured = config.credentialStatus === "configured";
  return {
    content: null,
    embeds: [new EmbedBuilder()
      .setTitle("🔑 AI API Settings")
      .setColor(0xfee75c)
      .setDescription("Every server supplies its own Groq API key. Pixy has no trial, payment, subscription, or usage quota system.")
      .addFields(
        { name: "API Key", value: configured ? "✅ Configured" : config.credentialStatus === "invalid" ? "⚠️ Invalid" : "❌ Required", inline: true },
        { name: "Model", value: `\`${config.groq.model}\``, inline: true },
        { name: "Source", value: config.setting.aiModel ? "Server override" : "Default", inline: true }
      )],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(scoped(PREFIX.API_SET, userId)).setLabel(configured ? "Replace API Key" : "Set API Key").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(scoped(PREFIX.API_REMOVE, userId)).setLabel("Remove API Key").setStyle(ButtonStyle.Danger).setDisabled(!config.setting.groqApiKeyEncrypted),
        new ButtonBuilder().setCustomId(scoped(PREFIX.MODEL_SET, userId)).setLabel("Set Model").setStyle(ButtonStyle.Primary).setDisabled(!configured),
        new ButtonBuilder().setCustomId(scoped(PREFIX.MODEL_RESET, userId)).setLabel("Reset Model").setStyle(ButtonStyle.Secondary).setDisabled(!config.setting.aiModel)
      ),
      navigation(userId),
    ],
  };
}

async function renderBadWords(guildId, userId) {
  const stats = await getBadWordsStats(guildId);
  const embed = new EmbedBuilder()
    .setTitle("🛡️ Bad Words Settings")
    .setColor(0xeb459e)
    .addFields(
      { name: "Built-in", value: String(stats.builtInCount), inline: true },
      { name: "Custom", value: `${stats.customCount}/${stats.maxCustom}`, inline: true }
    );
  if (stats.customWords.length) embed.addFields({ name: "Custom list", value: `\`${stats.customWords.slice(0, 20).join(", ")}\`` });
  return {
    content: null,
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(scoped(PREFIX.BADWORD_ACTION, userId))
          .setPlaceholder("Select an action...")
          .addOptions(
            { label: "Add Custom Word", value: "add" },
            { label: "Remove Custom Word", value: "remove" }
          )
      ),
      navigation(userId),
    ],
  };
}

async function render(page, guildId, userId) {
  if (page === PAGES.FEATURES) return renderFeatures(guildId, userId);
  if (page === PAGES.ESCALATION) return renderEscalation(guildId, userId);
  if (page === PAGES.AIAPI) return renderAiApi(guildId, userId);
  if (page === PAGES.BADWORDS) return renderBadWords(guildId, userId);
  return renderHome(guildId, userId);
}

function apiModal(userId) {
  return new ModalBuilder().setCustomId(scoped(PREFIX.API_MODAL, userId)).setTitle("Set Groq API Key").addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("groq_api_key").setLabel("Groq API key").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("gsk_..."))
  );
}

function modelModal(userId) {
  return new ModalBuilder().setCustomId(scoped(PREFIX.MODEL_MODAL, userId)).setTitle("Set Groq Model").addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("groq_model").setLabel("Exact Groq model ID").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder(DEFAULT_GROQ_MODEL))
  );
}

module.exports = {
  data: new SlashCommandBuilder().setName("settings").setDescription("Configure Pixy AI settings for this server.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  guildOnly: true,
  userPermissions: [PermissionFlagsBits.Administrator],

  async execute(interaction) {
    await getOrCreateGuildSetting(interaction.guild.id);
    await interaction.reply({ ...(await render(PAGES.HOME, interaction.guild.id, interaction.user.id)), flags: EPHEMERAL });
  },

  selectMenuHandlers: [
    {
      customIdPrefix: PREFIX.NAV,
      type: "string",
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.NAV.length);
        if (!(await assertOwner(interaction, userId))) return;
        await interaction.deferUpdate();
        await interaction.editReply(await render(interaction.values[0], interaction.guild.id, userId));
      },
    },
    {
      customIdPrefix: PREFIX.TOGGLE,
      type: "string",
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.TOGGLE.length);
        if (!(await assertOwner(interaction, userId))) return;
        const field = interaction.values[0];
        if (!FEATURE_FIELDS.has(field)) return;
        const setting = await getOrCreateGuildSetting(interaction.guild.id);
        const enabled = !setting[field];
        await prisma.$transaction(async (tx) => {
          await tx.guildSetting.update({ where: { guildId: interaction.guild.id }, data: { [field]: enabled } });
          if (field === "aiReplyEnabled") {
            await tx.guildConfig.updateMany({ where: { guildId: interaction.guild.id }, data: { aiEnabled: enabled } });
          }
        });
        await interaction.update(await render(PAGES.FEATURES, interaction.guild.id, userId));
      },
    },
    {
      customIdPrefix: PREFIX.BADWORD_ACTION,
      type: "string",
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.BADWORD_ACTION.length);
        if (!(await assertOwner(interaction, userId))) return;
        if (interaction.values[0] === "add") {
          return interaction.showModal(new ModalBuilder().setCustomId(scoped(PREFIX.BADWORD_MODAL, userId)).setTitle("Add Custom Bad Word").addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("word").setLabel("Word to add").setStyle(TextInputStyle.Short).setRequired(true))
          ));
        }
        const stats = await getBadWordsStats(interaction.guild.id);
        if (!stats.customWords.length) return interaction.update({ content: "No custom words to remove.", embeds: [], components: [navigation(userId)] });
        const menu = new StringSelectMenuBuilder().setCustomId(scoped(PREFIX.BADWORD_REMOVE, userId)).setPlaceholder("Select a word to remove...").addOptions(stats.customWords.slice(0, 25).map((word) => ({ label: word, value: word })));
        return interaction.update({ content: "Select a custom word to remove:", embeds: [], components: [new ActionRowBuilder().addComponents(menu), navigation(userId)] });
      },
    },
    {
      customIdPrefix: PREFIX.BADWORD_REMOVE,
      type: "string",
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.BADWORD_REMOVE.length);
        if (!(await assertOwner(interaction, userId))) return;
        await removeCustomBadWord(interaction.guild.id, interaction.values[0]);
        await interaction.update(await render(PAGES.BADWORDS, interaction.guild.id, userId));
      },
    },
  ],

  buttonHandlers: [
    { customIdPrefix: PREFIX.HOME, async execute(interaction) { const userId = interaction.customId.slice(PREFIX.HOME.length); if (await assertOwner(interaction, userId)) await interaction.update(await render(PAGES.HOME, interaction.guild.id, userId)); } },
    { customIdPrefix: PREFIX.CLOSE, async execute(interaction) { const userId = interaction.customId.slice(PREFIX.CLOSE.length); if (await assertOwner(interaction, userId)) await interaction.update({ content: "Settings panel closed.", embeds: [], components: [] }); } },
    { customIdPrefix: PREFIX.API_SET, async execute(interaction) { const userId = interaction.customId.slice(PREFIX.API_SET.length); if (await assertOwner(interaction, userId)) await interaction.showModal(apiModal(userId)); } },
    { customIdPrefix: PREFIX.MODEL_SET, async execute(interaction) { const userId = interaction.customId.slice(PREFIX.MODEL_SET.length); if (await assertOwner(interaction, userId)) await interaction.showModal(modelModal(userId)); } },
    {
      customIdPrefix: PREFIX.API_REMOVE,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.API_REMOVE.length);
        if (!(await assertOwner(interaction, userId))) return;
        await prisma.guildSetting.update({ where: { guildId: interaction.guild.id }, data: { groqApiKeyEncrypted: null, aiModel: null } });
        await interaction.update({ content: "Groq API key removed.", ...(await render(PAGES.AIAPI, interaction.guild.id, userId)) });
      },
    },
    {
      customIdPrefix: PREFIX.MODEL_RESET,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.MODEL_RESET.length);
        if (!(await assertOwner(interaction, userId))) return;
        await prisma.guildSetting.update({ where: { guildId: interaction.guild.id }, data: { aiModel: null } });
        await interaction.update(await render(PAGES.AIAPI, interaction.guild.id, userId));
      },
    },
  ],

  modalHandlers: [
    {
      customIdPrefix: PREFIX.API_MODAL,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.API_MODAL.length);
        if (!(await assertOwner(interaction, userId))) return;
        await interaction.deferReply({ flags: EPHEMERAL });
        const apiKey = cleanText(interaction.fields.getTextInputValue("groq_api_key"));
        try {
          const validation = await validateGroqApiKey(apiKey);
          const encrypted = encryptCredential(apiKey, { guildId: interaction.guild.id, credentialType: "groq-api-key" });
          const current = await getOrCreateGuildSetting(interaction.guild.id);
          await prisma.guildSetting.update({ where: { guildId: interaction.guild.id }, data: { groqApiKeyEncrypted: encrypted, aiModel: current.aiModel && validation.modelIds.includes(current.aiModel) ? current.aiModel : null } });
          await interaction.editReply({ content: "Groq API key validated, encrypted, and saved.", ...(await render(PAGES.AIAPI, interaction.guild.id, userId)) });
        } catch (error) {
          await interaction.editReply({ content: error?.status === 401 ? "Groq rejected that API key." : "Pixy could not validate that API key." });
        }
      },
    },
    {
      customIdPrefix: PREFIX.MODEL_MODAL,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.MODEL_MODAL.length);
        if (!(await assertOwner(interaction, userId))) return;
        await interaction.deferReply({ flags: EPHEMERAL });
        const modelId = cleanText(interaction.fields.getTextInputValue("groq_model"));
        try {
          const config = await getGuildAiConfig(interaction.guild.id, { requireApiKey: true });
          await validateGroqChatModel({ apiKey: config.groq.apiKey, modelId });
          await prisma.guildSetting.update({ where: { guildId: interaction.guild.id }, data: { aiModel: modelId } });
          await interaction.editReply({ content: `Model verified and saved: \`${modelId}\`.`, ...(await render(PAGES.AIAPI, interaction.guild.id, userId)) });
        } catch (error) {
          await interaction.editReply({ content: error?.message || "Pixy could not verify that model." });
        }
      },
    },
    {
      customIdPrefix: PREFIX.BADWORD_MODAL,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.BADWORD_MODAL.length);
        if (!(await assertOwner(interaction, userId))) return;
        const result = await addCustomBadWord(interaction.guild.id, cleanText(interaction.fields.getTextInputValue("word")));
        await interaction.reply({ content: result.ok ? "Custom word added." : `Could not add that word: ${result.code}.`, ...(await render(PAGES.BADWORDS, interaction.guild.id, userId)), flags: EPHEMERAL });
      },
    },
  ],
};
