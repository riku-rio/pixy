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
const { defaultAiConfig, getOrCreateGuildSetting } = require("../config/ai");
const { DEFAULT_GROQ_MODEL } = require("../ai/groqModels");
const { getBadWordsStats, addCustomBadWord, removeCustomBadWord } = require("../utils/badWords");
const { getGuildDailyUsage } = require("../plans/guildUsageService");
const configurationPanel = require("../components/guildConfigurationPanel");

const EPHEMERAL = 64;
const PREFIX = {
  HOME: "settings_home:", BACK: "settings_back:", NAV: "settings_nav:", TOGGLE: "settings_toggle:", CLOSE: "settings_close:",
  BADWORD_ACTION: "settings_badwords_action:", BADWORD_REMOVE: "settings_badwords_remove:", BADWORD_MODAL: "settings_badwords_modal:",
};
const PAGES = { HOME: "home", FEATURES: "features", ESCALATION: "escalation", AIAPI: "aiapi", BADWORDS: "badwords", PLANS: "plans" };
const FEATURE_FIELDS = new Set(["aiReplyEnabled", "closeTicketEnabled", "renameReviewEnabled", "escalationEnabled", "agentActionsEnabled"]);
const scoped = (prefix, userId) => `${prefix}${userId}`;

async function assertOwner(interaction, userId) {
  if (!interaction.guild || interaction.user.id !== userId || !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: "Only the administrator who opened /pixy-settings can use this control.", flags: EPHEMERAL });
    return false;
  }
  return true;
}
function nav(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(scoped(PREFIX.HOME, userId)).setLabel("Home").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(scoped(PREFIX.BACK, userId)).setLabel("Back").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(scoped(PREFIX.CLOSE, userId)).setLabel("Close").setStyle(ButtonStyle.Secondary)
  );
}
async function home(guildId) {
  const [setting, stats, config, routeCount, usage] = await Promise.all([
    getOrCreateGuildSetting(guildId), getBadWordsStats(guildId), prisma.guildConfig.findUnique({ where: { guildId } }),
    prisma.adminRoute.count({ where: { guildId, enabled: true } }), getGuildDailyUsage(guildId),
  ]);
  return new EmbedBuilder().setTitle("🤖 Pixy Settings").setColor(0x5865f2).setDescription("Configure Pixy AI for your server.").addFields(
    { name: "📝 Features", value: `AI Reply: ${setting.aiReplyEnabled ? "✅" : "❌"}\nClose: ${setting.closeTicketEnabled ? "✅" : "❌"}\nRename: ${setting.renameReviewEnabled ? "✅" : "❌"}`, inline: true },
    { name: "🚨 Escalation Settings", value: `Feature: ${setting.escalationEnabled ? "✅ Enabled" : "❌ Disabled"}\nCategory: ${config?.escalationCategoryId ? `<#${config.escalationCategoryId}>` : "Not configured"}\nNotifications: ${config?.escalationNotificationChannelId ? `<#${config.escalationNotificationChannelId}>` : "Not configured"}\nRoutes: ${routeCount}/${config?.maxAdminRoutes || defaultAiConfig.maxAdminRoutesPerGuild}`, inline: true },
    { name: "🔑 AI API", value: `API Key: ${setting.groqApiKeyEncrypted ? "✅ Configured" : "❌ Required"}\nModel: \`${setting.aiModel || DEFAULT_GROQ_MODEL}\``, inline: true },
    { name: "🚫 Bad Words", value: `Built-in: ${stats.builtInCount}\nCustom: ${stats.customCount}/${stats.maxCustom}`, inline: true },
    { name: "📊 Plans & Usage", value: `Daily allowance: ${usage.dailyLimit.toLocaleString()}\nUsed today: ${usage.used.toLocaleString()}\nRemaining: ${usage.remaining.toLocaleString()}`, inline: true }
  );
}
function homeComponents(userId) {
  return [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`${PREFIX.NAV}${userId}`).setPlaceholder("Select a settings category...").addOptions(
    { label: "Features", value: PAGES.FEATURES, emoji: "📝" }, { label: "Escalation", value: PAGES.ESCALATION, emoji: "🚨" },
    { label: "AI API", value: PAGES.AIAPI, emoji: "🔑" }, { label: "Bad Words", value: PAGES.BADWORDS, emoji: "🚫" },
    { label: "Plans & Usage", value: PAGES.PLANS, emoji: "📊" }
  ))];
}
async function features(guildId) {
  const s = await getOrCreateGuildSetting(guildId);
  return new EmbedBuilder().setTitle("📝 Feature Settings").setColor(0x5865f2).addFields(
    ...Array.from(FEATURE_FIELDS).map((field) => ({ name: field, value: s[field] ? "✅ Enabled" : "❌ Disabled", inline: true }))
  );
}
function featureComponents(userId) {
  return [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(scoped(PREFIX.TOGGLE, userId)).setPlaceholder("Select a feature to toggle...").addOptions(
    ...Array.from(FEATURE_FIELDS).map((field) => ({ label: `Toggle ${field}`, value: field }))
  )), nav(userId)];
}
async function escalation(guildId) {
  const [config, setting, routeCount] = await Promise.all([
    prisma.guildConfig.findUnique({ where: { guildId } }), getOrCreateGuildSetting(guildId), prisma.adminRoute.count({ where: { guildId, enabled: true } }),
  ]);
  return new EmbedBuilder().setTitle("🚨 Escalation Settings").setColor(0xed4245).setDescription("Use /pixy-admins to change escalation routes and channels.").addFields(
    { name: "Feature", value: setting.escalationEnabled ? "✅ Enabled" : "❌ Disabled", inline: true },
    { name: "Category", value: config?.escalationCategoryId ? `<#${config.escalationCategoryId}>` : "Not configured", inline: true },
    { name: "Notifications", value: config?.escalationNotificationChannelId ? `<#${config.escalationNotificationChannelId}>` : "Not configured", inline: true },
    { name: "Routes", value: `${routeCount}/${config?.maxAdminRoutes || defaultAiConfig.maxAdminRoutesPerGuild}`, inline: true }
  );
}
async function badwords(guildId) {
  const s = await getBadWordsStats(guildId);
  const e = new EmbedBuilder().setTitle("🚫 Bad Words Settings").setColor(0xeb459e).addFields(
    { name: "Built-in", value: String(s.builtInCount), inline: true }, { name: "Custom", value: `${s.customCount}/${s.maxCustom}`, inline: true }
  );
  if (s.customWords.length) e.addFields({ name: "Custom list", value: `\`${s.customWords.slice(0, 20).join(", ")}\`` });
  return e;
}
function badwordComponents(userId) {
  return [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(scoped(PREFIX.BADWORD_ACTION, userId)).setPlaceholder("Select an action...").addOptions(
    { label: "Add Custom Word", value: "add" }, { label: "Remove Custom Word", value: "remove" }
  )), nav(userId)];
}
async function render(page, guildId, userId) {
  if (page === PAGES.AIAPI) return configurationPanel.renderAiApi(guildId, userId, "settings");
  if (page === PAGES.PLANS) return configurationPanel.renderPlans(guildId, userId, "settings");
  if (page === PAGES.FEATURES) return { content: null, embeds: [await features(guildId)], components: featureComponents(userId) };
  if (page === PAGES.ESCALATION) return { content: null, embeds: [await escalation(guildId)], components: [nav(userId)] };
  if (page === PAGES.BADWORDS) return { content: null, embeds: [await badwords(guildId)], components: badwordComponents(userId) };
  return { content: null, embeds: [await home(guildId)], components: homeComponents(userId) };
}

async function returnHome(interaction, userId) {
  if (!(await assertOwner(interaction, userId))) return;
  await interaction.update(await render(PAGES.HOME, interaction.guild.id, userId));
}

module.exports = {
  data: new SlashCommandBuilder().setName("settings").setDescription("Configure Pixy AI settings for this server.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  guildOnly: true, userPermissions: [PermissionFlagsBits.Administrator],
  async execute(interaction) { await getOrCreateGuildSetting(interaction.guild.id); await interaction.reply({ ...(await render(PAGES.HOME, interaction.guild.id, interaction.user.id)), flags: EPHEMERAL }); },
  selectMenuHandlers: [
    { customIdPrefix: PREFIX.NAV, type: "string", async execute(interaction) { const userId = interaction.customId.slice(PREFIX.NAV.length); if (!(await assertOwner(interaction, userId))) return; await interaction.deferUpdate(); await interaction.editReply(await render(interaction.values[0], interaction.guild.id, userId)); } },
    { customIdPrefix: PREFIX.TOGGLE, type: "string", async execute(interaction) { const userId = interaction.customId.slice(PREFIX.TOGGLE.length); if (!(await assertOwner(interaction, userId))) return; const field = interaction.values[0]; if (!FEATURE_FIELDS.has(field)) return; const s = await getOrCreateGuildSetting(interaction.guild.id); await prisma.guildSetting.update({ where: { guildId: interaction.guild.id }, data: { [field]: !s[field] } }); await interaction.update(await render(PAGES.FEATURES, interaction.guild.id, userId)); } },
    { customIdPrefix: PREFIX.BADWORD_ACTION, type: "string", async execute(interaction) { const userId = interaction.customId.slice(PREFIX.BADWORD_ACTION.length); if (!(await assertOwner(interaction, userId))) return; if (interaction.values[0] === "add") { const modal = new ModalBuilder().setCustomId(scoped(PREFIX.BADWORD_MODAL, userId)).setTitle("Add Custom Bad Word").addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("word").setLabel("Word to add").setStyle(TextInputStyle.Short).setRequired(true))); return interaction.showModal(modal); } const stats = await getBadWordsStats(interaction.guild.id); if (!stats.customWords.length) return interaction.update({ content: "No custom words to remove.", embeds: [], components: [nav(userId)] }); const menu = new StringSelectMenuBuilder().setCustomId(scoped(PREFIX.BADWORD_REMOVE, userId)).setPlaceholder("Select a word...").addOptions(stats.customWords.slice(0, 25).map((word) => ({ label: word, value: word }))); return interaction.update({ content: "Select a word to remove:", embeds: [], components: [new ActionRowBuilder().addComponents(menu), nav(userId)] }); } },
    { customIdPrefix: PREFIX.BADWORD_REMOVE, type: "string", async execute(interaction) { const userId = interaction.customId.slice(PREFIX.BADWORD_REMOVE.length); if (!(await assertOwner(interaction, userId))) return; await removeCustomBadWord(interaction.guild.id, interaction.values[0]); await interaction.update(await render(PAGES.BADWORDS, interaction.guild.id, userId)); } },
  ],
  buttonHandlers: [
    { customIdPrefix: PREFIX.HOME, async execute(interaction) { returnHome(interaction, interaction.customId.slice(PREFIX.HOME.length)); } },
    { customIdPrefix: PREFIX.BACK, async execute(interaction) { returnHome(interaction, interaction.customId.slice(PREFIX.BACK.length)); } },
    { customIdPrefix: PREFIX.CLOSE, async execute(interaction) { const userId = interaction.customId.slice(PREFIX.CLOSE.length); if (!(await assertOwner(interaction, userId))) return; await interaction.update({ content: "Settings panel closed.", embeds: [], components: [] }); } },
    { customIdPrefix: "guild_config:settings:home:", async execute(interaction) { returnHome(interaction, interaction.customId.split(":")[3]); } },
    { customIdPrefix: "guild_config:settings:back:", async execute(interaction) { returnHome(interaction, interaction.customId.split(":")[3]); } },
  ],
  modalHandlers: [{ customIdPrefix: PREFIX.BADWORD_MODAL, async execute(interaction) { const userId = interaction.customId.slice(PREFIX.BADWORD_MODAL.length); if (!(await assertOwner(interaction, userId))) return; const result = await addCustomBadWord(interaction.guild.id, interaction.fields.getTextInputValue("word").trim()); await interaction.reply({ content: result.ok ? "Custom word added." : `Could not add that word: ${result.code}.`, ...(await render(PAGES.BADWORDS, interaction.guild.id, userId)), flags: EPHEMERAL }); } }],
};
