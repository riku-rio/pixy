/**
 * Ticket rename safety validation.
 *
 * This module uses the shared blocked-terms service for all safety checks.
 * It no longer maintains its own separate list of blocked words.
 */

const { getUnsafeTicketNameReason } = require("../../blockedTerms");

/**
 * Check if a ticket name is unsafe.
 *
 * @param {string} guildId - The guild ID to check against.
 * @param {string} value - The proposed ticket name.
 * @returns {Promise<boolean>} True if unsafe, false if safe.
 */
async function isUnsafeTicketName(guildId, value) {
  const reason = await getUnsafeTicketNameReason(guildId, value);
  return reason !== null;
}

/**
 * Get the reason a ticket name is unsafe.
 *
 * @param {string} guildId - The guild ID to check against.
 * @param {string} value - The proposed ticket name.
 * @returns {Promise<Object|null>} Reason object if unsafe, null if safe.
 */
async function getUnsafeTicketNameReasonForGuild(guildId, value) {
  return getUnsafeTicketNameReason(guildId, value);
}

module.exports = {
  isUnsafeTicketName,
  getUnsafeTicketNameReason: getUnsafeTicketNameReasonForGuild,
};
