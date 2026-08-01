const { Events, ChannelType } = require("discord.js");
const { prisma } = require("../../config/prisma");
const {
  loadGuildEntitlementState,
} = require("../../billing/entitlementService");
const {
  buildTicketControlPayload,
} = require("../../components/ticketAiControls");

module.exports = {
  name: Events.ChannelCreate,

  async execute(channel) {
    try {
      if (!channel.guild) return;
      if (channel.type !== ChannelType.GuildText) return;

      const config = await prisma.guildConfig.findUnique({
        where: { guildId: channel.guild.id },
      });

      if (!config?.enabled || !config.ticketCategoryId) return;
      if (channel.parentId !== config.ticketCategoryId) return;

      const ignored = await prisma.guildIgnoredChannel.findUnique({
        where: {
          guildId_channelId: {
            guildId: channel.guild.id,
            channelId: channel.id,
          },
        },
      });
      if (ignored) return;

      const entitlement = await loadGuildEntitlementState(channel.guild.id);

      await prisma.ticketChannel.upsert({
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

      await channel.send(
        buildTicketControlPayload(true, { plan: entitlement.plan })
      );
    } catch (error) {
      console.error("ChannelCreate ticket handler failed:", error);
    }
  },
};
