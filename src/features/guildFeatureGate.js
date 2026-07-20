const { prisma } = require("../config/prisma");
const { getDisabledActionCode } = require("./guildFeatureRules");

async function getGuildActionRejection(guildId, action) {
  if (!guildId) return "invalid_guild";
  const settings = await prisma.guildSetting.findUnique({
    where: { guildId },
    select: {
      closeTicketEnabled: true,
      renameReviewEnabled: true,
      escalationEnabled: true,
      agentActionsEnabled: true,
    },
  });
  return getDisabledActionCode(settings, action);
}

module.exports = { getGuildActionRejection };
