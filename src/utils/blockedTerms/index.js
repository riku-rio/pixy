/**
 * Blocked Terms Module
 *
 * This module provides a unified, database-backed blocked-term system
 * for the Pixy Discord bot.
 *
 * Usage:
 *   const { checkBlockedTerms, getUnsafeTicketNameReason, ... } = require("./utils/blockedTerms");
 *
 * All consumers should use this module instead of the old badWords utilities.
 */

const {
  checkBlockedTerms,
  getUnsafeTicketNameReason,
  isSafeTicketName,
  getGuildBlockedTerms,
  addGuildBlockedTerm,
  removeGuildBlockedTerm,
  addGuildAllowedTerm,
  removeGuildAllowedTerm,
  getBlockedTermsStats,
  MAX_GUILD_CUSTOM_TERMS,
} = require("./service");

const {
  normalizeText,
  normalizeTerm,
  tokenize,
  compact,
} = require("./normalization");

const {
  getGlobalTerms,
  getGuildTerms,
  invalidateGuild,
  invalidateGlobal,
  clearAll,
} = require("./cache");

module.exports = {
  // Main service
  checkBlockedTerms,
  getUnsafeTicketNameReason,
  isSafeTicketName,

  // Guild term management
  getGuildBlockedTerms,
  addGuildBlockedTerm,
  removeGuildBlockedTerm,
  addGuildAllowedTerm,
  removeGuildAllowedTerm,
  getBlockedTermsStats,
  MAX_GUILD_CUSTOM_TERMS,

  // Normalization utilities (for testing and advanced use)
  normalizeText,
  normalizeTerm,
  tokenize,
  compact,

  // Cache management
  getGlobalTerms,
  getGuildTerms,
  invalidateGuild,
  invalidateGlobal,
  clearAll,
};
