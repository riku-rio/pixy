const { Events, ChannelType } = require("discord.js");
const { prisma } = require("../../config/prisma");

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
          closed: false,
          status: "open",
        },
        update: {
          closed: false,
          status: "open",
          closedByAi: false,
          closedAt: null,
          renamedByAiAt: null,
          lastAiAction: null,
          lastAiActionAt: null,
        },
      });

      await channel.send(
        [
          "Hello 👋 I'm Pixy AI. Ask your question here and I'll try to help while the support team reviews your ticket.",
          "",
          "مرحبًا 👋 أنا Pixy AI. اكتب سؤالك هنا وسأحاول مساعدتك أثناء مراجعة فريق الدعم للتذكرة.",
        ].join("\n")
      );
    } catch (error) {
      console.error("ChannelCreate ticket handler failed:", error);
    }
  },
};
