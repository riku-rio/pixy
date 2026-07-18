const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const { prisma } = require("../config/prisma");
const {
  defaultAiConfig,
  getGuildAiConfig,
  getOrCreateGuildSetting,
} = require("../config/ai");
const {
  DEFAULT_GROQ_MODEL,
  validateGroqApiKey,
  validateGroqChatModel,
} = require("../ai/groqModels");
const { encryptCredential } = require("../security/credentialEncryption");
const {
  getBadWordsStats,
  addCustomBadWord,
  removeCustomBadWord,
} = require("../utils/badWords");

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
  API_REMOVE_CONFIRM: "settings_api_remove_confirm:",
  API_REMOVE_CANCEL: "settings_api_remove_cancel:",
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
  PLANS: "plans",
});

const FEATURE_FIELDS = new Set([
  "aiReplyEnabled",
  "closeTicketEnabled",
  "renameReviewEnabled",
  "escalationEnabled",
  "agentActionsEnabled",
]);

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function scoped(prefix, userId) {
  return `${prefix}${userId}`;
}

function responder(interaction) {
  return (payload) => interaction.deferred || interaction.replied
    ? interaction.editReply(payload)
    : interaction.update(payload);
}

async function assertOwnerAndAdmin(interaction, ownerUserId) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This can only be used inside a server.", flags: EPHEMERAL });
    return false;
  }
  if (interaction.user.id !== ownerUserId) {
    await interaction.reply({
      content: "Only the administrator who opened `/pixy-settings` can use this control.",
      flags: EPHEMERAL,
    });
    return false;
  }
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: "You need Administrator permission to use this.", flags: EPHEMERAL });
    return false;
  }
  return true;
}

function buildNavButtons(userId) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(scoped(PREFIX.HOME, userId)).setLabel("Home").setEmoji("🏠").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${PREFIX.NAV}${userId}:${PAGES.HOME}`).setLabel("Back").setEmoji("◀️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(scoped(PREFIX.CLOSE, userId)).setLabel("Close").setEmoji("✖️").setStyle(ButtonStyle.Secondary)
  )];
}

async function buildHomePage(guildId) {
  const setting = await getOrCreateGuildSetting(guildId);
  const badWordsStats = await getBadWordsStats(guildId);
  return new EmbedBuilder()
    .setTitle("🤖 Pixy Settings")
    .setDescription("Configure Pixy AI for your server. Select a category below.")
    .setColor(0x5865f2)
    .addFields(
      {
        name: "📝 Features",
        value: [
          `AI Reply: ${setting.aiReplyEnabled ? "✅" : "❌"}`,
          `Close Ticket: ${setting.closeTicketEnabled ? "✅" : "❌"}`,
          `Rename Review: ${setting.renameReviewEnabled ? "✅" : "❌"}`,
          `Escalation: ${setting.escalationEnabled ? "✅" : "❌"}`,
          `Agent Actions: ${setting.agentActionsEnabled ? "✅" : "❌"}`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "🔑 AI API",
        value: [
          `API Key: ${setting.groqApiKeyEncrypted ? "✅ Configured" : "❌ Required"}`,
          `Model: \`${setting.aiModel || DEFAULT_GROQ_MODEL}\``,
        ].join("\n"),
        inline: true,
      },
      {
        name: "🚫 Bad Words",
        value: `Built-in: ${badWordsStats.builtInCount}\nCustom: ${badWordsStats.customCount}/${badWordsStats.maxCustom}`,
        inline: true,
      },
      { name: "📊 Plans & Usage", value: "Not implemented yet.", inline: true }
    );
}

function buildHomeComponents(userId) {
  return [new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`${PREFIX.NAV}${userId}:home_select`)
      .setPlaceholder("Select a settings category...")
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel("Features").setDescription("Toggle AI features").setEmoji("📝").setValue(PAGES.FEATURES),
        new StringSelectMenuOptionBuilder().setLabel("Escalation").setDescription("View escalation settings").setEmoji("🚨").setValue(PAGES.ESCALATION),
        new StringSelectMenuOptionBuilder().setLabel("AI API").setDescription("Set the Groq key and model").setEmoji("🔑").setValue(PAGES.AIAPI),
        new StringSelectMenuOptionBuilder().setLabel("Bad Words").setDescription("Manage custom blocked words").setEmoji("🚫").setValue(PAGES.BADWORDS),
        new StringSelectMenuOptionBuilder().setLabel("Plans & Usage").setDescription("View current implementation status").setEmoji("📊").setValue(PAGES.PLANS)
      )
  )];
}

async function buildFeaturesPage(guildId) {
  const setting = await getOrCreateGuildSetting(guildId);
  return new EmbedBuilder()
    .setTitle("📝 Feature Settings")
    .setDescription("Toggle Pixy features for this server.")
    .setColor(0x5865f2)
    .addFields(
      { name: "AI Reply", value: setting.aiReplyEnabled ? "✅ Enabled" : "❌ Disabled", inline: true },
      { name: "Close Ticket", value: setting.closeTicketEnabled ? "✅ Enabled" : "❌ Disabled", inline: true },
      { name: "Rename Review", value: setting.renameReviewEnabled ? "✅ Enabled" : "❌ Disabled", inline: true },
      { name: "Escalation", value: setting.escalationEnabled ? "✅ Enabled" : "❌ Disabled", inline: true },
      { name: "Agent Actions", value: setting.agentActionsEnabled ? "✅ Enabled" : "❌ Disabled", inline: true }
    );
}

function buildFeatureComponents(userId) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(scoped(PREFIX.TOGGLE, userId))
        .setPlaceholder("Select a feature to toggle...")
        .addOptions(
          { label: "Toggle AI Reply", value: "aiReplyEnabled" },
          { label: "Toggle Close Ticket", value: "closeTicketEnabled" },
          { label: "Toggle Rename Review", value: "renameReviewEnabled" },
          { label: "Toggle Escalation", value: "escalationEnabled" },
          { label: "Toggle Agent Actions", value: "agentActionsEnabled" }
        )
    ),
    ...buildNavButtons(userId),
  ];
}

async function buildEscalationPage(guildId) {
  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  return new EmbedBuilder()
    .setTitle("🚨 Escalation Settings")
    .setDescription("Use `/pixy-admins` to change escalation routes and channels.")
    .setColor(0xed4245)
    .addFields(
      { name: "Escalation Category", value: config?.escalationCategoryId ? `<#${config.escalationCategoryId}>` : "❌ Not configured", inline: true },
      { name: "Notification Channel", value: config?.escalationNotificationChannelId ? `<#${config.escalationNotificationChannelId}>` : "❌ Not configured", inline: true },
      { name: "Maximum Routes", value: String(config?.maxAdminRoutes || defaultAiConfig.maxAdminRoutesPerGuild), inline: true }
    );
}

function apiStatusLabel(status) {
  if (status === "configured") return "✅ **Configured**";
  if (status === "invalid") return "⚠️ **Invalid — replace required**";
  return "❌ **Required**";
}

async function buildAiApiPage(guildId) {
  const config = await getGuildAiConfig(guildId);
  const isDefault = !config.setting.aiModel;
  const embed = new EmbedBuilder()
    .setTitle("🔑 AI API Settings")
    .setDescription("Configure the Groq credential and type an exact text/chat model ID for this server.")
    .setColor(0xfee75c)
    .addFields(
      { name: "API Key Status", value: apiStatusLabel(config.credentialStatus), inline: true },
      { name: "Current Model", value: `\`${config.groq.model}\``, inline: true },
      { name: "Model Source", value: isDefault ? "Default fallback" : "Server override", inline: true }
    )
    .setFooter({ text: "Typed models are checked against Groq and probed with a minimal chat completion before saving." });

  if (config.credentialStatus !== "configured") {
    embed.addFields({
      name: "⚠️ Setup required",
      value: "AI features cannot run until an administrator adds a valid Groq API key below.",
    });
  }
  return embed;
}

async function buildAiApiComponents(guildId, userId) {
  const config = await getGuildAiConfig(guildId);
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(scoped(PREFIX.API_SET, userId)).setLabel(config.credentialStatus === "configured" ? "Replace API Key" : "Set API Key").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(scoped(PREFIX.API_REMOVE, userId)).setLabel("Remove API Key").setStyle(ButtonStyle.Danger).setDisabled(config.credentialStatus === "missing"),
      new ButtonBuilder().setCustomId(scoped(PREFIX.MODEL_SET, userId)).setLabel("Set Model").setStyle(ButtonStyle.Primary).setDisabled(config.credentialStatus !== "configured"),
      new ButtonBuilder().setCustomId(scoped(PREFIX.MODEL_RESET, userId)).setLabel("Reset Model").setStyle(ButtonStyle.Secondary).setDisabled(!config.setting.aiModel)
    ),
    ...buildNavButtons(userId),
  ];
}

async function buildBadWordsPage(guildId) {
  const stats = await getBadWordsStats(guildId);
  const embed = new EmbedBuilder()
    .setTitle("🚫 Bad Words Settings")
    .setDescription("Manage custom words in addition to Pixy's built-in list.")
    .setColor(0xeb459e)
    .addFields(
      { name: "Built-in", value: String(stats.builtInCount), inline: true },
      { name: "Custom", value: `${stats.customCount}/${stats.maxCustom}`, inline: true },
      { name: "Remaining", value: String(stats.remaining), inline: true }
    );
  if (stats.customWords.length) {
    embed.addFields({ name: "Custom list", value: `\`${stats.customWords.slice(0, 20).join(", ")}\`` });
  }
  return embed;
}

function buildBadWordsComponents(userId) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(scoped(PREFIX.BADWORD_ACTION, userId))
        .setPlaceholder("Select an action...")
        .addOptions(
          { label: "Add Custom Word", value: "add", emoji: "➕" },
          { label: "Remove Custom Word", value: "remove", emoji: "➖" }
        )
    ),
    ...buildNavButtons(userId),
  ];
}

function buildPlansPage() {
  return new EmbedBuilder()
    .setTitle("📊 Plans & Usage")
    .setDescription("Plans, trials, payments, quotas, and plan-based restrictions are not implemented yet.")
    .setColor(0x57f287)
    .addFields({ name: "Current behavior", value: "Every server supplies its own Groq API key. No free trial is provided." });
}

async function renderPage(page, guildId, userId) {
  if (page === PAGES.FEATURES) return { embeds: [await buildFeaturesPage(guildId)], components: buildFeatureComponents(userId) };
  if (page === PAGES.ESCALATION) return { embeds: [await buildEscalationPage(guildId)], components: buildNavButtons(userId) };
  if (page === PAGES.AIAPI) return { embeds: [await buildAiApiPage(guildId)], components: await buildAiApiComponents(guildId, userId) };
  if (page === PAGES.BADWORDS) return { embeds: [await buildBadWordsPage(guildId)], components: buildBadWordsComponents(userId) };
  if (page === PAGES.PLANS) return { embeds: [buildPlansPage()], components: buildNavButtons(userId) };
  return { embeds: [await buildHomePage(guildId)], components: buildHomeComponents(userId) };
}

function buildApiKeyModal(userId) {
  const modal = new ModalBuilder().setCustomId(scoped(PREFIX.API_MODAL, userId)).setTitle("Set Groq API Key");
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId("groq_api_key")
      .setLabel("Groq API key")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(10)
      .setMaxLength(256)
      .setPlaceholder("gsk_...")
  ));
  return modal;
}

function buildModelModal(userId) {
  const modal = new ModalBuilder().setCustomId(scoped(PREFIX.MODEL_MODAL, userId)).setTitle("Set Groq Model");
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId("groq_model")
      .setLabel("Exact Groq model ID")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(2)
      .setMaxLength(200)
      .setPlaceholder("Example: openai/gpt-oss-120b")
  ));
  return modal;
}

function getModelValidationMessage(error) {
  if (error?.code === "model_not_found") return "That model is not available to this server's Groq API key.";
  if (error?.code === "model_inactive") return "That Groq model is currently inactive or unavailable.";
  if (error?.code === "audio_model") return "That model is for audio, transcription, or text-to-speech. Pixy requires a text/chat model.";
  if (error?.code === "moderation_model") return "That model is a moderation or guard model. It cannot be used for Pixy's ticket replies.";
  if (error?.code === "image_model") return "That model is image-only or vision-generation focused. Pixy requires a text/chat model.";
  if (error?.code === "embedding_model") return "That model is an embedding or reranking model. Pixy requires a text/chat completion model.";
  if (error?.code === "system_model") return "That Groq system/compound model is not allowed for this setting.";
  if (error?.code === "not_chat_compatible") return "Groq exposes that model, but it did not accept a normal text chat-completion request.";
  const status = error?.status || error?.response?.status;
  if (status === 401) return "Groq rejected this server's API key. Replace the key and try again.";
  if (status === 403) return "This model is blocked by the Groq project or organization permissions for this key.";
  if (status === 429) return "Groq is rate-limiting model verification. The current model was not changed.";
  return "Pixy could not verify that model as an available text/chat model. The current model was not changed.";
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("Configure Pixy AI settings for this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  guildOnly: true,
  userPermissions: [PermissionFlagsBits.Administrator],

  async execute(interaction) {
    if (!interaction.guild || !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: "You need Administrator permission in a server to use this command.", flags: EPHEMERAL });
      return;
    }
    await getOrCreateGuildSetting(interaction.guild.id);
    await interaction.reply({ ...(await renderPage(PAGES.HOME, interaction.guild.id, interaction.user.id)), flags: EPHEMERAL });
  },

  selectMenuHandlers: [
    {
      customIdPrefix: PREFIX.NAV,
      type: "string",
      async execute(interaction) {
        const [userId] = interaction.customId.slice(PREFIX.NAV.length).split(":");
        if (!(await assertOwnerAndAdmin(interaction, userId))) return;
        await interaction.deferUpdate();
        await interaction.editReply(await renderPage(interaction.values?.[0] || PAGES.HOME, interaction.guild.id, userId));
      },
    },
    {
      customIdPrefix: PREFIX.TOGGLE,
      type: "string",
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.TOGGLE.length);
        if (!(await assertOwnerAndAdmin(interaction, userId))) return;
        const field = interaction.values?.[0];
        if (!FEATURE_FIELDS.has(field)) {
          await interaction.reply({ content: "Invalid feature setting.", flags: EPHEMERAL });
          return;
        }
        await interaction.deferUpdate();
        const setting = await getOrCreateGuildSetting(interaction.guild.id);
        await prisma.guildSetting.update({ where: { guildId: interaction.guild.id }, data: { [field]: !setting[field] } });
        await interaction.editReply(await renderPage(PAGES.FEATURES, interaction.guild.id, userId));
      },
    },
    {
      customIdPrefix: PREFIX.BADWORD_ACTION,
      type: "string",
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.BADWORD_ACTION.length);
        if (!(await assertOwnerAndAdmin(interaction, userId))) return;
        if (interaction.values?.[0] === "add") {
          const modal = new ModalBuilder().setCustomId(scoped(PREFIX.BADWORD_MODAL, userId)).setTitle("Add Custom Bad Word");
          modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("word").setLabel("Word to add").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)
          ));
          await interaction.showModal(modal);
          return;
        }
        await interaction.deferUpdate();
        const stats = await getBadWordsStats(interaction.guild.id);
        if (!stats.customWords.length) {
          await interaction.editReply({ content: "No custom words to remove.", embeds: [], components: buildNavButtons(userId) });
          return;
        }
        const menu = new StringSelectMenuBuilder()
          .setCustomId(scoped(PREFIX.BADWORD_REMOVE, userId))
          .setPlaceholder("Select a word to remove...")
          .addOptions(stats.customWords.slice(0, 25).map((word) => ({ label: word, value: word })));
        await interaction.editReply({ content: "Select a custom word to remove:", embeds: [], components: [new ActionRowBuilder().addComponents(menu), ...buildNavButtons(userId)] });
      },
    },
    {
      customIdPrefix: PREFIX.BADWORD_REMOVE,
      type: "string",
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.BADWORD_REMOVE.length);
        if (!(await assertOwnerAndAdmin(interaction, userId))) return;
        await interaction.deferUpdate();
        await removeCustomBadWord(interaction.guild.id, interaction.values?.[0]);
        await interaction.editReply(await renderPage(PAGES.BADWORDS, interaction.guild.id, userId));
      },
    },
  ],

  buttonHandlers: [
    {
      customIdPrefix: PREFIX.HOME,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.HOME.length);
        if (!(await assertOwnerAndAdmin(interaction, userId))) return;
        await interaction.deferUpdate();
        await interaction.editReply(await renderPage(PAGES.HOME, interaction.guild.id, userId));
      },
    },
    {
      customIdPrefix: PREFIX.NAV,
      async execute(interaction) {
        const [userId, page] = interaction.customId.slice(PREFIX.NAV.length).split(":");
        if (!(await assertOwnerAndAdmin(interaction, userId))) return;
        await interaction.deferUpdate();
        await interaction.editReply(await renderPage(page, interaction.guild.id, userId));
      },
    },
    {
      customIdPrefix: PREFIX.API_SET,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.API_SET.length);
        if (!(await assertOwnerAndAdmin(interaction, userId))) return;
        await interaction.showModal(buildApiKeyModal(userId));
      },
    },
    {
      customIdPrefix: PREFIX.MODEL_SET,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.MODEL_SET.length);
        if (!(await assertOwnerAndAdmin(interaction, userId))) return;
        await interaction.showModal(buildModelModal(userId));
      },
    },
    {
      customIdPrefix: PREFIX.API_REMOVE,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.API_REMOVE.length);
        if (!(await assertOwnerAndAdmin(interaction, userId))) return;
        await interaction.reply({
          content: "Remove this server's Groq API key? AI features will stop until a new key is added.",
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(scoped(PREFIX.API_REMOVE_CONFIRM, userId)).setLabel("Remove API Key").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(scoped(PREFIX.API_REMOVE_CANCEL, userId)).setLabel("Cancel").setStyle(ButtonStyle.Secondary)
          )],
          flags: EPHEMERAL,
        });
      },
    },
    {
      customIdPrefix: PREFIX.API_REMOVE_CONFIRM,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.API_REMOVE_CONFIRM.length);
        if (!(await assertOwnerAndAdmin(interaction, userId))) return;
        await interaction.deferUpdate();
        await prisma.guildSetting.update({ where: { guildId: interaction.guild.id }, data: { groqApiKeyEncrypted: null, aiModel: null } });
        await interaction.editReply({ content: "Groq API key removed. AI features are now unavailable for this server.", embeds: [], components: [] });
      },
    },
    {
      customIdPrefix: PREFIX.API_REMOVE_CANCEL,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.API_REMOVE_CANCEL.length);
        if (!(await assertOwnerAndAdmin(interaction, userId))) return;
        await interaction.update({ content: "Cancelled. The API key was not changed.", components: [] });
      },
    },
    {
      customIdPrefix: PREFIX.MODEL_RESET,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.MODEL_RESET.length);
        if (!(await assertOwnerAndAdmin(interaction, userId))) return;
        await interaction.deferUpdate();
        await prisma.guildSetting.update({ where: { guildId: interaction.guild.id }, data: { aiModel: null } });
        await interaction.editReply(await renderPage(PAGES.AIAPI, interaction.guild.id, userId));
      },
    },
    {
      customIdPrefix: PREFIX.CLOSE,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.CLOSE.length);
        if (!(await assertOwnerAndAdmin(interaction, userId))) return;
        await responder(interaction)({ content: "Settings panel closed.", embeds: [], components: [] });
      },
    },
  ],

  modalHandlers: [
    {
      customIdPrefix: PREFIX.API_MODAL,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.API_MODAL.length);
        if (!(await assertOwnerAndAdmin(interaction, userId))) return;
        await interaction.deferReply({ flags: EPHEMERAL });
        const apiKey = cleanText(interaction.fields.getTextInputValue("groq_api_key"));
        try {
          const validation = await validateGroqApiKey(apiKey);
          const encrypted = encryptCredential(apiKey, {
            guildId: interaction.guild.id,
            credentialType: "groq-api-key",
          });
          const current = await getOrCreateGuildSetting(interaction.guild.id);
          const currentStillAvailable = current.aiModel && validation.modelIds.includes(current.aiModel);
          await prisma.guildSetting.update({
            where: { guildId: interaction.guild.id },
            data: {
              groqApiKeyEncrypted: encrypted,
              aiModel: currentStillAvailable ? current.aiModel : null,
            },
          });
          await interaction.editReply({
            content: "Groq API key validated, encrypted, and saved.",
            ...(await renderPage(PAGES.AIAPI, interaction.guild.id, userId)),
          });
        } catch (error) {
          const status = error?.status || error?.response?.status;
          const message = status === 401
            ? "Groq rejected that API key. Check it and try again."
            : status === 429
              ? "Groq is rate-limiting validation. Your existing settings were not changed."
              : "Pixy could not validate that Groq API key. Your existing settings were not changed.";
          await interaction.editReply({ content: message });
        }
      },
    },
    {
      customIdPrefix: PREFIX.MODEL_MODAL,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.MODEL_MODAL.length);
        if (!(await assertOwnerAndAdmin(interaction, userId))) return;
        await interaction.deferReply({ flags: EPHEMERAL });
        const modelId = cleanText(interaction.fields.getTextInputValue("groq_model"));
        try {
          const config = await getGuildAiConfig(interaction.guild.id, { requireApiKey: true });
          await validateGroqChatModel({ apiKey: config.groq.apiKey, modelId });
          await prisma.guildSetting.update({ where: { guildId: interaction.guild.id }, data: { aiModel: modelId } });
          await interaction.editReply({
            content: `Model verified and saved: \`${modelId}\`.`,
            ...(await renderPage(PAGES.AIAPI, interaction.guild.id, userId)),
          });
        } catch (error) {
          await interaction.editReply({ content: getModelValidationMessage(error) });
        }
      },
    },
    {
      customIdPrefix: PREFIX.BADWORD_MODAL,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.BADWORD_MODAL.length);
        if (!(await assertOwnerAndAdmin(interaction, userId))) return;
        const result = await addCustomBadWord(interaction.guild.id, cleanText(interaction.fields.getTextInputValue("word")));
        if (!result.ok) {
          await interaction.reply({ content: `Could not add that word: ${result.code}.`, flags: EPHEMERAL });
          return;
        }
        await interaction.reply({ content: "Custom word added.", ...(await renderPage(PAGES.BADWORDS, interaction.guild.id, userId)), flags: EPHEMERAL });
      },
    },
  ],
};
