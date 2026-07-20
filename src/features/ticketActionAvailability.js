const { PermissionFlagsBits } = require("discord.js");
const { prisma } = require("../config/prisma");
const { getDisabledActionCode } = require("./guildFeatureRules");
const { TICKET_ACTIONS } = require("../utils/tickets/actions/ticketActionTypes");

const ACTION_SELECT_ID = "ticket_control_action";

const ACTION_PREFIXES = Object.freeze({
  [TICKET_ACTIONS.CLOSE_TICKET]: ["ticket_control_close_confirm:"],
  [TICKET_ACTIONS.RENAME_TICKET]: ["ticket_control_rename_modal:"],
  [TICKET_ACTIONS.ESCALATE_TICKET]: [
    "ticket_control_escalate_ai:",
    "ticket_control_escalate_choose:",
    "ticket_control_escalate_role_select:",
    "ticket_control_escalate_ai_modal:",
    "ticket_control_escalate_role_modal:",
  ],
});

const DISABLED_MESSAGES = Object.freeze({
  agent_actions_disabled:
    "That ticket action isn't available right now. Please continue describing what you need here, and the support team can help.",
  close_ticket_disabled:
    "Closing tickets through Pixy isn't available right now. Please leave a message here if you need the support team to close it.",
  rename_review_disabled:
    "Ticket renaming isn't available right now. You can continue using this ticket normally.",
  escalation_disabled:
    "Human escalation isn't available right now. Please continue describing your issue here so the support team can review it.",
});

function getTicketControlAction(interaction) {
  const customId = String(interaction.customId || "");

  if (interaction.isStringSelectMenu?.() && customId === ACTION_SELECT_ID) {
    const selected = interaction.values?.[0];
    if (selected === "close") return TICKET_ACTIONS.CLOSE_TICKET;
    if (selected === "rename") return TICKET_ACTIONS.RENAME_TICKET;
    if (selected === "escalate") return TICKET_ACTIONS.ESCALATE_TICKET;
    return null;
  }

  for (const [action, prefixes] of Object.entries(ACTION_PREFIXES)) {
    if (prefixes.some((prefix) => customId.startsWith(prefix))) return action;
  }

  return null;
}

async function hasConfiguredSupportRoute(guild) {
  await guild.roles.fetch().catch(() => null);

  const routes = await prisma.adminRoute.findMany({
    where: { guildId: guild.id, enabled: true },
    select: { roleId: true },
    take: 25,
  });

  return routes.some(({ roleId }) => roleId !== guild.id && guild.roles.cache.has(roleId));
}

function getNoRoutesMessage(interaction) {
  const userMessage =
    "Human escalation isn't available right now. Please continue describing your issue in this ticket so the support team can still review the conversation here.";

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return userMessage;
  }

  return `${userMessage}\n\nAdministrator note: add at least one support route with \`/pixy-admins action:add\` to enable this option.`;
}

async function getTicketActionAvailability(interaction) {
  const action = getTicketControlAction(interaction);
  if (!action || !interaction.guild || !interaction.channel) return null;

  const ticket = await prisma.ticketChannel.findUnique({
    where: { channelId: interaction.channel.id },
    select: { closed: true },
  });
  if (!ticket || ticket.closed) return null;

  const setting = await prisma.guildSetting.findUnique({
    where: { guildId: interaction.guild.id },
    select: {
      agentActionsEnabled: true,
      closeTicketEnabled: true,
      renameReviewEnabled: true,
      escalationEnabled: true,
    },
  });

  const rejectionCode = getDisabledActionCode(setting, action);
  if (rejectionCode) {
    return { available: false, code: rejectionCode, message: DISABLED_MESSAGES[rejectionCode] };
  }

  if (action === TICKET_ACTIONS.ESCALATE_TICKET && !(await hasConfiguredSupportRoute(interaction.guild))) {
    return { available: false, code: "no_support_routes", message: getNoRoutesMessage(interaction) };
  }

  return { available: true, action };
}

module.exports = {
  DISABLED_MESSAGES,
  getTicketActionAvailability,
};
