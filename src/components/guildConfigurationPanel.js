const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { prisma } = require("../config/prisma");
const { getGuildAiConfig, getOrCreateGuildSetting } = require("../config/ai");
const { DEFAULT_GROQ_MODEL, validateGroqApiKey, validateGroqChatModel } = require("../ai/groqModels");
const { encryptCredential } = require("../security/credentialEncryption");
const { activateGuildTrial } = require("../plans/guildPlanService");
const { getGuildDailyUsage } = require("../plans/guildUsageService");
const { PLAN_STATES } = require("../plans/planConstants");

const EPHEMERAL = 64;
const PREFIX = "guild_config:";
const PAGES = Object.freeze({ AIAPI: "aiapi", PLANS: "plans", COMPLETE: "complete" });

function id(mode, action, userId, extra = "") {
  return `${PREFIX}${mode}:${action}:${userId}${extra ? `:${extra}` : ""}`;
}
function parse(customId) {
  const [mode, action, userId, extra] = customId.slice(PREFIX.length).split(":");
  return { mode, action, userId, extra };
}
async function assertOwner(interaction, userId) {
  if (!interaction.guild || interaction.user.id !== userId || !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: "Only the administrator who opened this panel can use it.", flags: EPHEMERAL });
    return false;
  }
  return true;
}
function nav(mode, page, userId, configured = true) {
  if (mode === "setup") {
    const backPage = page === PAGES.PLANS || page === PAGES.COMPLETE ? PAGES.AIAPI : "category";
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(id(mode, "nav", userId, backPage)).setLabel("Back").setStyle(ButtonStyle.Secondary)
    );
    if (page !== PAGES.COMPLETE) {
      const nextPage = page === PAGES.AIAPI ? PAGES.PLANS : PAGES.COMPLETE;
      row.addComponents(
        new ButtonBuilder().setCustomId(id(mode, "nav", userId, nextPage)).setLabel("Next").setStyle(ButtonStyle.Primary).setDisabled(page === PAGES.AIAPI && !configured)
      );
    }
    return row;
  }
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(id(mode, "home", userId)).setLabel("Home").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(id(mode, "back", userId)).setLabel("Back").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(id(mode, "close", userId)).setLabel("Close").setStyle(ButtonStyle.Secondary)
  );
}

async function renderAiApi(guildId, userId, mode = "settings") {
  const config = await getGuildAiConfig(guildId);
  const configured = config.credentialStatus === "configured";
  const embed = new EmbedBuilder()
    .setTitle("🔑 AI API Settings")
    .setDescription("Add this server's Groq API key and choose an exact text/chat model ID.")
    .setColor(0xfee75c)
    .addFields(
      { name: "API Key", value: configured ? "✅ Configured" : config.credentialStatus === "invalid" ? "⚠️ Invalid" : "❌ Required", inline: true },
      { name: "Model", value: `\`${config.groq.model}\``, inline: true },
      { name: "Source", value: config.setting.aiModel ? "Server override" : "Default", inline: true }
    );
  const controls = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(id(mode, "api_set", userId)).setLabel(configured ? "Replace API Key" : "Set API Key").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(id(mode, "api_remove", userId)).setLabel("Remove API Key").setStyle(ButtonStyle.Danger).setDisabled(!config.setting.groqApiKeyEncrypted),
    new ButtonBuilder().setCustomId(id(mode, "model_set", userId)).setLabel("Set Model").setStyle(ButtonStyle.Primary).setDisabled(!configured),
    new ButtonBuilder().setCustomId(id(mode, "model_reset", userId)).setLabel("Reset Model").setStyle(ButtonStyle.Secondary).setDisabled(!config.setting.aiModel)
  );
  return { content: null, embeds: [embed], components: [controls, nav(mode, PAGES.AIAPI, userId, configured)] };
}

async function renderPlans(guildId, userId, mode = "settings") {
  const [usage, config] = await Promise.all([
    getGuildDailyUsage(guildId),
    getGuildAiConfig(guildId),
  ]);
  const active = usage.state === PLAN_STATES.TRIAL_ACTIVE;
  const expired = usage.state === PLAN_STATES.FREE_TRIAL_EXPIRED;
  const fields = [
    { name: "Access", value: active ? "7-Day Free Trial" : "Free", inline: true },
    { name: "Daily allowance", value: usage.dailyLimit.toLocaleString(), inline: true },
    { name: "Used today", value: `${usage.used.toLocaleString()} / ${usage.dailyLimit.toLocaleString()}`, inline: true },
    { name: "Remaining", value: usage.remaining.toLocaleString(), inline: true },
    { name: "Daily reset", value: `<t:${Math.floor(usage.resetAt.getTime() / 1000)}:R>`, inline: true },
  ];
  if (active) {
    fields.push(
      { name: "Trial day", value: `${usage.trialDay} of 7`, inline: true },
      { name: "Trial ends", value: `<t:${Math.floor(usage.trialEndsAt.getTime() / 1000)}:R>`, inline: true }
    );
  } else if (expired) {
    fields.push({ name: "Trial status", value: "Ended — paid plans are coming later.", inline: false });
  } else {
    fields.push({ name: "Trial status", value: "Not activated", inline: false });
  }
  const embed = new EmbedBuilder().setTitle("📊 Plans & Usage").setColor(0x57f287).addFields(fields)
    .setFooter({ text: "Pixy limits accepted AI requests. Groq project, model, token, and organization limits still apply." });
  const components = [];
  if (usage.canActivate) {
    components.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId(id(mode, "plan_select", userId)).setPlaceholder("Select a plan action...").addOptions({
        label: "Activate 7-Day Free Trial",
        description: config.credentialStatus === "configured" ? "Increase the Pixy allowance to 1,000 requests/day" : "Configure a Groq API key first",
        value: "activate_trial",
      }).setDisabled(config.credentialStatus !== "configured")
    ));
  }
  components.push(nav(mode, PAGES.PLANS, userId, true));
  return { content: null, embeds: [embed], components };
}

async function renderComplete(guildId, userId) {
  const [config, usage, guildConfig] = await Promise.all([
    getGuildAiConfig(guildId),
    getGuildDailyUsage(guildId),
    prisma.guildConfig.findUnique({ where: { guildId } }),
  ]);
  return {
    content: null,
    embeds: [new EmbedBuilder().setTitle("✅ Pixy Setup Complete").setColor(0x57f287).addFields(
      { name: "Ticket category", value: guildConfig?.ticketCategoryId ? `<#${guildConfig.ticketCategoryId}>` : "Not configured", inline: true },
      { name: "Groq API", value: config.credentialStatus === "configured" ? "Configured" : "Missing", inline: true },
      { name: "Model", value: `\`${config.groq.model}\``, inline: true },
      { name: "Access", value: usage.state === PLAN_STATES.TRIAL_ACTIVE ? "7-Day Trial" : "Free", inline: true },
      { name: "Daily allowance", value: usage.dailyLimit.toLocaleString(), inline: true }
    ).setFooter({ text: "You can change these settings later with /pixy-settings." })],
    components: [nav("setup", PAGES.COMPLETE, userId, true)],
  };
}

async function render(page, guildId, userId, mode = "settings") {
  if (page === PAGES.PLANS) return renderPlans(guildId, userId, mode);
  if (page === PAGES.COMPLETE) return renderComplete(guildId, userId);
  return renderAiApi(guildId, userId, mode);
}

function apiModal(mode, userId) {
  return new ModalBuilder().setCustomId(id(mode, "api_modal", userId)).setTitle("Set Groq API Key").addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("groq_api_key").setLabel("Groq API key").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("gsk_..."))
  );
}
function modelModal(mode, userId) {
  return new ModalBuilder().setCustomId(id(mode, "model_modal", userId)).setTitle("Set Groq Model").addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("groq_model").setLabel("Exact Groq model ID").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder(DEFAULT_GROQ_MODEL))
  );
}

const selectMenuHandlers = [{
  customIdPrefix: PREFIX,
  type: "string",
  async execute(interaction) {
    const info = parse(interaction.customId);
    if (!(await assertOwner(interaction, info.userId))) return;
    if (info.action !== "plan_select" || interaction.values?.[0] !== "activate_trial") return;
    const embed = new EmbedBuilder().setTitle("Confirm 7-Day Free Trial").setColor(0xfee75c).setDescription([
      "The trial starts immediately and can be activated only once for this server.",
      "For exactly seven days, Pixy allows up to **1,000 accepted AI requests per UTC day**.",
      "After it ends, Pixy continues working with **100 requests per UTC day**.",
      "This server's own Groq API key is always used, and Groq's upstream limits still apply.",
      "Removing the API key does not pause or extend the trial. Paid plans are not implemented yet.",
    ].join("\n\n"));
    await interaction.update({ content: null, embeds: [embed], components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(id(info.mode, "trial_confirm", info.userId)).setLabel("Confirm Activation").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(id(info.mode, "trial_cancel", info.userId)).setLabel("Cancel").setStyle(ButtonStyle.Secondary)
    )] });
  },
}];

const buttonHandlers = [{
  customIdPrefix: PREFIX,
  async execute(interaction) {
    const info = parse(interaction.customId);
    if (!(await assertOwner(interaction, info.userId))) return;
    if (info.action === "api_set") return interaction.showModal(apiModal(info.mode, info.userId));
    if (info.action === "model_set") return interaction.showModal(modelModal(info.mode, info.userId));
    if (info.action === "close") return interaction.update({ content: "Settings panel closed.", embeds: [], components: [] });

    await interaction.deferUpdate();

    if (info.action === "api_remove") {
      await prisma.guildSetting.update({ where: { guildId: interaction.guild.id }, data: { groqApiKeyEncrypted: null, aiModel: null } });
      return interaction.editReply(await render(PAGES.AIAPI, interaction.guild.id, info.userId, info.mode));
    }
    if (info.action === "model_reset") {
      await prisma.guildSetting.update({ where: { guildId: interaction.guild.id }, data: { aiModel: null } });
      return interaction.editReply(await render(PAGES.AIAPI, interaction.guild.id, info.userId, info.mode));
    }
    if (info.action === "trial_confirm") {
      const result = await activateGuildTrial(interaction.guild.id);
      const content = result.ok ? "The 7-day free trial is now active." : `The trial could not be activated: ${result.code}.`;
      return interaction.editReply({ ...(await render(PAGES.PLANS, interaction.guild.id, info.userId, info.mode)), content });
    }
    if (info.action === "trial_cancel") {
      return interaction.editReply(await render(PAGES.PLANS, interaction.guild.id, info.userId, info.mode));
    }
    if (info.action === "nav") {
      return interaction.editReply(await render(info.extra, interaction.guild.id, info.userId, info.mode));
    }
  },
}];

const modalHandlers = [{
  customIdPrefix: PREFIX,
  async execute(interaction) {
    const info = parse(interaction.customId);
    if (!(await assertOwner(interaction, info.userId))) return;
    await interaction.deferReply({ flags: EPHEMERAL });
    if (info.action === "api_modal") {
      const apiKey = interaction.fields.getTextInputValue("groq_api_key").trim();
      try {
        const validation = await validateGroqApiKey(apiKey);
        const encrypted = encryptCredential(apiKey, { guildId: interaction.guild.id, credentialType: "groq-api-key" });
        const current = await getOrCreateGuildSetting(interaction.guild.id);
        await prisma.guildSetting.update({ where: { guildId: interaction.guild.id }, data: { groqApiKeyEncrypted: encrypted, aiModel: current.aiModel && validation.modelIds.includes(current.aiModel) ? current.aiModel : null } });
        return interaction.editReply({ content: "Groq API key validated, encrypted, and saved.", ...(await render(PAGES.AIAPI, interaction.guild.id, info.userId, info.mode)) });
      } catch (error) {
        return interaction.editReply({ content: error?.status === 401 ? "Groq rejected that API key." : "Pixy could not validate that API key." });
      }
    }
    if (info.action === "model_modal") {
      const modelId = interaction.fields.getTextInputValue("groq_model").trim();
      try {
        const config = await getGuildAiConfig(interaction.guild.id, { requireApiKey: true });
        await validateGroqChatModel({ apiKey: config.groq.apiKey, modelId });
        await prisma.guildSetting.update({ where: { guildId: interaction.guild.id }, data: { aiModel: modelId } });
        return interaction.editReply({ content: `Model verified and saved: \`${modelId}\`.`, ...(await render(PAGES.AIAPI, interaction.guild.id, info.userId, info.mode)) });
      } catch (error) {
        return interaction.editReply({ content: error?.message || "Pixy could not verify that model." });
      }
    }
  },
}];

module.exports = { PREFIX, PAGES, render, renderAiApi, renderPlans, renderComplete, selectMenuHandlers, buttonHandlers, modalHandlers };