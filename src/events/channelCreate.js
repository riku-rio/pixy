const { Events, ChannelType } = require("discord.js");
const { prisma } = require("../config/prisma");

module.exports = {
  name: Events.ChannelCreate,

  async execute(channel) {
    try {
      if (!channel.guild) return;
      if (channel.type !== ChannelType.GuildText) return;

      const config = await prisma.guildConfig.findUnique({
        where: {
          guildId: channel.guild.id,
        },
      });

      if (!config?.enabled || !config.ticketCategoryId) return;

      if (channel.parentId !== config.ticketCategoryId) return;

      await prisma.ticketChannel.upsert({
        where: {
          channelId: channel.id,
        },
        create: {
          guildId: channel.guild.id,
          channelId: channel.id,
        },
        update: {
          closed: false,
        },
      });

      await channel.send("Hello 👋");
    } catch (error) {
      console.error("ChannelCreate ticket handler failed:", error);
    }
  },
};
