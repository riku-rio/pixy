const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const { BILLING_PLANS } = require("../billing/constants");
const { hasPremiumEntitlement } = require("../billing/billingService");
const {
  loadGuildEntitlementState,
} = require("../billing/entitlementService");
const { prisma } = require("../config/prisma");
const ticketControls = require("./ticketControls");

const EPHEMERAL = 64;
const ACTION_SELECT_ID = "ticket_control_action";
const AI_ON_VALUE = "ai_on";
const AI_OFF_VALUE = "ai_off";

function resolveTicketControlRenderState(options = {}) {
  let plan = options.plan || null;

  if (!plan && options.premiumEntitled === false) {
    plan = BILLING_PLANS.EXPIRED;
  } else if (!plan && options.premiumEntitled === true) {
    plan = BILLING_PLANS.TRIAL;
  }

  const premiumEntitled = plan
    ? hasPremiumEntitlement(plan)
    : options.premiumEntitled !== false;

  return {
    plan: plan || (premiumEntitled ? BILLING_PLANS.TRIAL : BILLING_PLANS.EXPIRED),
    premiumEntitled,
  };
}

function buildTicketControlContent(aiEnabled = true, options = {}) {
  const { premiumEntitled } = resolveTicketControlRenderState(options);

  return [
    "Hello 👋 I'm Pixy AI. Ask your question here and I'll try to help while the support team reviews your ticket.",
    "",
    premiumEntitled ? "**Ticket Actions**" : "**Pixy AI Control**",
    premiumEntitled
      ? "Use the menu below if you want to escalate, rename, close, pause, or resume Pixy AI."
      : "Pixy Pro ticket actions are unavailable, but server staff can still pause or resume automatic AI replies.",
    "",
    aiEnabled
      ? "🤖 **Pixy AI is ON** — staff can pause or resume automatic replies at any time."
      : "⏸️ **Pixy AI is OFF** — staff can pause or resume automatic replies at any time.",
  ].join("\n");
}

function buildTicketAiOption(aiEnabled = true) {
  return new StringSelectMenuOptionBuilder()
    .setLabel(aiEnabled ? "Turn Pixy AI Off" : "Turn Pixy AI On")
    .setDescription(
      aiEnabled
        ? "Pause automatic AI replies in this ticket."
        : "Resume automatic AI replies in this ticket."
    )
    .setValue(aiEnabled ? AI_OFF_VALUE : AI_ON_VALUE)
    .setEmoji(aiEnabled ? "⏸️" : "▶️");
}

function buildAiOnlyTicketControlComponents(aiEnabled = true) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(ACTION_SELECT_ID)
    .setPlaceholder("Select a Pixy AI action...")
    .addOptions(buildTicketAiOption(aiEnabled));

  return [new ActionRowBuilder().addComponents(selectMenu)];
}

function buildCombinedTicketControlComponents(aiEnabled = true, options = {}) {
  const { premiumEntitled } = resolveTicketControlRenderState(options);

  if (!premiumEntitled) {
    return buildAiOnlyTicketControlComponents(aiEnabled);
  }

  const rows = ticketControls.buildTicketControlPanelComponents();
  const selectMenu = rows?.[0]?.components?.[0];
  const aiOption = buildTicketAiOption(aiEnabled);

  if (!selectMenu) return rows;

  const resetIndex = Array.isArray(selectMenu.options)
    ? selectMenu.options.findIndex((option) => option?.data?.value === "reset")
    : -1;

  if (typeof selectMenu.spliceOptions === "function") {
    selectMenu.spliceOptions(
      resetIndex >= 0 ? resetIndex : selectMenu.options.length,
      0,
      aiOption
    );
  } else {
    selectMenu.addOptions(aiOption);
  }

  return rows;
}

function buildTicketControlPayload(aiEnabled = true, options = {}) {
  return {
    content: buildTicketControlContent(aiEnabled, options),
    components: buildCombinedTicketControlComponents(aiEnabled, options),
    allowedMentions: { parse: [] },
  };
}

function buildTicketAiStateMessage({ enabled, previousEnabled, changed }) {
  if (!changed) {
    return enabled
      ? "ℹ️ **Pixy AI is already ON** — automatic replies are active in this ticket."
      : "ℹ️ **Pixy AI is already OFF** — Pixy will not reply automatically in this ticket.";
  }

  return enabled
    ? "✅ **Pixy AI was OFF and is now ON** — automatic replies have resumed."
    : "✅ **Pixy AI was ON and is now OFF** — staff and users can continue without automatic AI replies.";
}

async function canControlTicketAi(subject) {
  if (!subject?.guild || !subject?.member) return false;

  if (subject.member.permissions?.has(PermissionFlagsBits.ManageChannels)) {
    return true;
  }

  const routes = await prisma.adminRoute.findMany({
    where: {
      guildId: subject.guild.id,
      enabled: true,
    },
    select: { roleId: true },
  });

  return routes.some((route) => subject.member.roles?.cache?.has(route.roleId));
}

async function setTicketAiState({ guildId, channelId, enabled }) {
  const ticket = await prisma.ticketChannel.findUnique({
    where: { channelId },
  });

  if (!ticket || ticket.guildId !== guildId || ticket.closed) {
    return { ok: false, code: "ticket_not_open" };
  }

  const previousEnabled = ticket.aiEnabled !== false;
  const nextEnabled = typeof enabled === "boolean" ? enabled : !previousEnabled;
  const changed = nextEnabled !== previousEnabled;

  if (!changed) {
    return {
      ok: true,
      ticket,
      previousEnabled,
      enabled: nextEnabled,
      changed: false,
    };
  }

  const updated = await prisma.ticketChannel.update({
    where: { channelId },
    data: { aiEnabled: nextEnabled },
  });

  return {
    ok: true,
    ticket: updated,
    previousEnabled,
    enabled: nextEnabled,
    changed: true,
  };
}

function isTicketControlMessage(message) {
  if (!message?.author?.bot) return false;

  return message.components?.some((row) =>
    row.components?.some((component) => component.customId === ACTION_SELECT_ID)
  );
}

async function findTicketControlMessage(channel) {
  if (!channel?.messages?.fetch) return null;

  let before;

  for (let page = 0; page < 10; page += 1) {
    const batch = await channel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {}),
    });

    const found = batch.find(isTicketControlMessage);
    if (found) return found;
    if (batch.size < 100) break;

    const oldest = Array.from(batch.values()).reduce((current, message) => {
      if (!current || message.createdTimestamp < current.createdTimestamp) {
        return message;
      }
      return current;
    }, null);

    before = oldest?.id;
    if (!before) break;
  }

  return null;
}

async function refreshTicketControlMessage(channel, aiEnabled, options = {}) {
  const controlMessage = await findTicketControlMessage(channel);
  if (!controlMessage) return { ok: false, code: "control_message_not_found" };

  await controlMessage.edit(buildTicketControlPayload(aiEnabled, options));

  return { ok: true, message: controlMessage };
}

function installTicketAiSelectHandler() {
  const actionHandler = ticketControls.selectMenuHandlers?.find(
    (handler) => handler.customId === ACTION_SELECT_ID
  );

  if (!actionHandler || actionHandler.__pixyAiToggleWrapped) return;

  const originalExecute = actionHandler.execute.bind(actionHandler);

  actionHandler.execute = async function executeWithAiToggle(interaction) {
    const action = interaction.values?.[0];

    if (action !== AI_ON_VALUE && action !== AI_OFF_VALUE) {
      return originalExecute(interaction);
    }

    if (!interaction.guild || !interaction.channel) {
      await interaction.reply({
        content: "This control only works inside a server ticket channel.",
        flags: EPHEMERAL,
      });
      return;
    }

    if (!(await canControlTicketAi(interaction))) {
      await interaction.reply({
        content: "Only server staff configured for Pixy support can change the AI state in this ticket.",
        flags: EPHEMERAL,
      });
      return;
    }

    const result = await setTicketAiState({
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      enabled: action === AI_ON_VALUE,
    });

    if (!result.ok) {
      await interaction.reply({
        content: "This ticket is no longer open or is not tracked by Pixy AI.",
        flags: EPHEMERAL,
      });
      return;
    }

    const entitlement = await loadGuildEntitlementState(interaction.guild.id);

    await interaction.update(
      buildTicketControlPayload(result.enabled, { plan: entitlement.plan })
    );

    await interaction.followUp({
      content: buildTicketAiStateMessage(result),
      allowedMentions: { parse: [] },
    });
  };

  actionHandler.__pixyAiToggleWrapped = true;
}

installTicketAiSelectHandler();

module.exports = {
  name: "ticketAiControls",
  ACTION_SELECT_ID,
  AI_ON_VALUE,
  AI_OFF_VALUE,
  buildAiOnlyTicketControlComponents,
  buildTicketAiOption,
  buildTicketControlContent,
  buildCombinedTicketControlComponents,
  buildTicketControlPayload,
  buildTicketAiStateMessage,
  canControlTicketAi,
  findTicketControlMessage,
  isTicketControlMessage,
  refreshTicketControlMessage,
  resolveTicketControlRenderState,
  setTicketAiState,
};
