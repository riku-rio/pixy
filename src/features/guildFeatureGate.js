const {
  getGuildAgentActionAvailability,
  getGuildTicketActionAvailability,
} = require("../billing/entitlementService");

async function getGuildActionAvailability(guildId, action, options = {}) {
  if (!guildId) {
    return {
      available: false,
      code: "invalid_guild",
      action,
    };
  }

  return getGuildTicketActionAvailability(guildId, action, options);
}

async function getGuildActionRejection(guildId, action, options = {}) {
  const availability = await getGuildActionAvailability(
    guildId,
    action,
    options
  );
  return availability.available ? null : availability.code;
}

async function getGuildAgentActionRejection(guildId, options = {}) {
  if (!guildId) return "invalid_guild";
  const availability = await getGuildAgentActionAvailability(guildId, options);
  return availability.available ? null : availability.code;
}

module.exports = {
  getGuildActionAvailability,
  getGuildActionRejection,
  getGuildAgentActionRejection,
};
