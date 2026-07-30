const { Events, ChannelType, PermissionFlagsBits } = require("discord.js");
const { prisma } = require("../../config/prisma");
const {
  buildTicketAiStateMessage,
  refreshTicketControlMessage,
  setTicketAiState,
} = require("../../components/ticketAiControls");

function getRequestedState(message) {
  const botId = message.client.user?.id;
  if (!botId) return { matched: false, enabled: null };

  const normalized = String(message.content || "").trim().toLowerCase();
  const regularMention = `<@${botId}>`;
  const nicknameMention = `<@!${botId}>`;

  if (normalized === regularMention || normalized === nicknameMention) {
    return { matched: true, enabled: null };
  }

  if (normalized === `${regularMention} on` || normalized === `${nicknameMention} on`) {
    return { matched: true, enabled: true };
  }

  if (normalized === `${regularMention} off` || normalized === `${nicknameMention} off`) {
    return { matched: true, enabled: false };
  }

  return { matched: false, enabled: null };
}

async function canControlTicketAi(message) {
  if (!message.guild || !message.member) return false;

  if (message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return true;
  }

  const routes = await prisma.adminRoute.findMany({
    where: { guildId: message.guild.id, enabled: true },
    select: { roleId: true },
  });

  return routes.some((route) => message.member.roles.cache.has(route.roleId));
}

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    if (!message.guild || message.author.bot || message.webhookId) return;
    if (message.channel.type !== ChannelType.GuildText) return;

    const request = getRequestedState(message);
    if (!request.matched) return;

    if (!(await canControlTicketAi(message))) {
      await message.reply({
        content: "❌ You do not have permission to change Pixy AI in this ticket.",
        allowedMentions: { parse: [], repliedUser: false },
      });
      return;
    }

    const result = await setTicketAiState({
      guildId: message.guild.id,
      channelId: message.channel.id,
      enabled: request.enabled,
    });

    if (!result.ok) {
      await message.reply({
        content: "❌ This channel is not an open ticket tracked by Pixy AI, so no change was made.",
        allowedMentions: { parse: [], repliedUser: false },
      });
      return;
    }

    const refresh = await refreshTicketControlMessage(
      message.channel,
      result.enabled
    ).catch((error) => {
      console.error("Failed to refresh shared ticket controls:", error);
      return { ok: false, code: "control_refresh_failed" };
    });

    await message.reply({
      content: refresh.ok
        ? buildTicketAiStateMessage(result)
        : `${buildTicketAiStateMessage(result)}\n⚠️ The ticket control menu could not be refreshed, but the AI state change was saved.`,
      allowedMentions: { parse: [], repliedUser: false },
    });
  },
};
