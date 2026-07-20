const { Events } = require("discord.js");
const { prisma } = require("../config/prisma");

module.exports = {
  name: Events.GuildDelete,
  async execute(guild) {
    if (!guild?.id) return;
    const guildId = guild.id;
    try {
      await prisma.$transaction([
        prisma.aiUsageLog.deleteMany({ where: { guildId } }),
        prisma.ticketChannel.deleteMany({ where: { guildId } }),
        prisma.learnedAnswer.deleteMany({ where: { guildId } }),
        prisma.adminRoute.deleteMany({ where: { guildId } }),
        prisma.guildIgnoredChannel.deleteMany({ where: { guildId } }),
        prisma.guildBlockedTerm.deleteMany({ where: { guildId } }),
        prisma.guildAllowedTerm.deleteMany({ where: { guildId } }),
        prisma.guildSetting.deleteMany({ where: { guildId } }),
        prisma.guildConfig.deleteMany({ where: { guildId } }),
      ]);
      console.log(`Deleted stored Pixy data for removed guild ${guildId}.`);
    } catch (error) {
      console.error(`Failed to delete stored data for removed guild ${guildId}:`, error);
    }
  },
};
