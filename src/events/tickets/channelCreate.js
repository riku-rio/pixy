const { Events, ChannelType } = require("discord.js");
const { prisma } = require("../../config/prisma");
const {
  buildTicketControlContent,
  buildCombinedTicketControlComponents,
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

      await channel.send({
        content: buildTicketControlContent(true),
        components: buildCombinedTicketControlComponents(true),
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      console.error("ChannelCreate ticket handler failed:", error);
    }
  },
};
