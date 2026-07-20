const { prisma } = require("../config/prisma");
const { TICKET_ACTIONS } = require("../utils/tickets/actions/ticketActionTypes");

function getDisabledActionCode(settings, action) {
  if (!settings) return null;
  if (settings.agentActionsEnabled === false) return "agent_actions_disabled";
  if (action === TICKET_ACTIONS.CLOSE_TICKET && settings.closeTicketEnabled === false) return "close_ticket_disabled";
  if (action === TICKET_ACTIONS.RENAME_TICKET && settings.renameReviewEnabled === false) return "rename_review_disabled";
  if (action === TICKET_ACTIONS.ESCALATE_TICKET && settings.escalationEnabled === false) return "escalation_disabled";
  return null;
}

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

module.exports = { getDisabledActionCode, getGuildActionRejection };
