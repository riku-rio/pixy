const { Events, ChannelType } = require("discord.js");
const { prisma } = require("../../config/prisma");
const {
  loadGuildEntitlementState,
} = require("../../billing/entitlementService");
const {
  buildTicketControlPayload,
} = require("../../components/ticketAiControls");

async function trackTicketChannel(channel, options = {}) {
  const client = options.client || prisma;
  const loadEntitlement =
    options.loadEntitlement || loadGuildEntitlementState;

  if (!channel.guild) return { tracked: false, code: "missing_guild" };
  if (channel.type !== ChannelType.GuildText) {
    return { tracked: false, code: "unsupported_channel_type" };
  }

  const config = await client.guildConfig.findUnique({
    where: { guildId: channel.guild.id },
  });

  if (!config?.enabled || !config.ticketCategoryId) {
    return { tracked: false, code: "ticket_category_not_configured" };
  }
  if (channel.parentId !== config.ticketCategoryId) {
    return { tracked: false, code: "outside_ticket_category" };
  }

  const ignored = await client.guildIgnoredChannel.findUnique({
    where: {
      guildId_channelId: {
        guildId: channel.guild.id,
        channelId: channel.id,
      },
    },
  });
  if (ignored) return { tracked: false, code: "ignored_channel" };

  const entitlement = await loadEntitlement(channel.guild.id, { client });

  await client.ticketChannel.upsert({
    where: { channelId: channel.id },
    create: {
      guildId: channel.guild.id,
      channelId: channel.id,
      closed: false,
      status: "open",
      aiEnabled: true,
    },
    update: {
      closed: false,
      status: "open",
      aiEnabled: true,
      closedByAi: false,
      closedAt: null,
      renamedByAiAt: null,
      lastAiAction: null,
      lastAiActionAt: null,
      escalated: false,
      escalatedAt: null,
      escalatedRoleId: null,
      escalationReason: null,
    },
  });

  const payload = buildTicketControlPayload(true, {
    plan: entitlement.plan,
  });
  await channel.send(payload);

  return {
    tracked: true,
    plan: entitlement.plan,
    payload,
  };
}

const channelCreateEvent = {
  name: Events.ChannelCreate,

  async execute(channel) {
    try {
      await trackTicketChannel(channel);
    } catch (error) {
      console.error("ChannelCreate ticket handler failed:", error);
    }
  },
};

module.exports = Object.assign(channelCreateEvent, {
  trackTicketChannel,
});
