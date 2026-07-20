/**
 * Blocked terms matching service.
 *
 * This is the single authoritative service for all text safety checks.
 * It combines:
 * - Global blocked terms from the BlockedTerm table
 * - Guild-specific blocked terms from the GuildBlockedTerm table
 * - Guild-specific allowed terms (exceptions) from the GuildAllowedTerm table
 *
 * Matching modes:
 * - "token": matches a complete normalized token (word)
 * - "phrase": matches a normalized multi-token phrase
 * - "substring": matches a substring within the compact text (for long, unambiguous terms only)
 *
 * The service applies guild allow terms before blocked terms, meaning
 * allow terms can override global or guild blocked terms for false-positive exceptions.
 */

const { normalizeText, normalizeTerm, tokenize, compact, matchToken, matchPhrase, matchSubstring, applyMatch, checkTextAgainstTerms } = require("./normalization");
const {
  getGlobalTerms,
  getGuildTerms,
  invalidateGuild,
  invalidateGlobal,
} = require("./cache");
const { prisma } = require("../../config/prisma");

// Maximum custom terms per guild (preserves existing limit)
const MAX_GUILD_CUSTOM_TERMS = 100;

/**
 * Check text for blocked terms using the shared service.
 *
 * This is the main entry point for all consumers. It:
 * 1. Loads global enabled terms (cached)
 * 2. Loads guild-specific blocked and allowed terms (cached)
 * 3. Applies guild allowed terms before blocked terms
 * 4. Returns the first match with full metadata
 *
 * @param {string} guildId - The guild ID to check against.
 * @param {string} text - The text to check.
 * @returns {Promise<Object|null>} Match result or null if no match.
 */
async function checkBlockedTerms(guildId, text) {
  const [globalTerms, guildData] = await Promise.all([
    getGlobalTerms(),
    guildId ? getGuildTerms(guildId) : Promise.resolve({ blocked: [], allowed: [] }),
  ]);

  // Build allowed terms set
  const allowedTerms = new Set(
    guildData.allowed.map((t) => t.normalizedTerm)
  );

  // Check guild-specific terms first (they can be more specific)
  if (guildData.blocked.length > 0) {
    const guildResult = checkTextAgainstTerms(text, guildData.blocked, allowedTerms);
    if (guildResult) {
      return { ...guildResult, source: "guild" };
    }
  }

  // Then check global terms
  const globalResult = checkTextAgainstTerms(text, globalTerms, allowedTerms);
  return globalResult;
}

/**
 * Check if text is safe for ticket naming.
 * Returns null if safe, or a reason object if unsafe.
 *
 * @param {string} guildId - The guild ID.
 * @param {string} text - The proposed ticket name.
 * @returns {Promise<Object|null>} Reason object if unsafe, null if safe.
 */
async function getUnsafeTicketNameReason(guildId, text) {
  const result = await checkBlockedTerms(guildId, text);
  if (!result) return null;

  return {
    reason: result.matchType === "substring" ? "blocked_word_obfuscated" : "blocked_word",
    term: result.term,
    category: result.category,
    severity: result.severity,
    matchType: result.matchType,
    source: result.source,
  };
}

/**
 * Check if a ticket name is safe.
 *
 * @param {string} guildId - The guild ID.
 * @param {string} text - The proposed ticket name.
 * @returns {Promise<boolean>} True if safe, false if unsafe.
 */
async function isSafeTicketName(guildId, text) {
  const reason = await getUnsafeTicketNameReason(guildId, text);
  return reason === null;
}

/**
 * Get all custom blocked terms for a guild.
 *
 * @param {string} guildId - The guild ID.
 * @returns {Promise<Array>} Array of guild blocked terms.
 */
async function getGuildBlockedTerms(guildId) {
  const { blocked } = await getGuildTerms(guildId);
  return blocked;
}

/**
 * Add a custom blocked term to a guild.
 *
 * @param {string} guildId - The guild ID.
 * @param {string} term - The term to add.
 * @returns {Promise<Object>} Result with ok status and count.
 */
async function addGuildBlockedTerm(guildId, term) {
  const normalized = normalizeTerm(term);

  if (!normalized) {
    return { ok: false, code: "empty_term" };
  }

  // Check if this term is already a global blocked term
  const globalTerms = await getGlobalTerms();
  const isGlobal = globalTerms.some((t) => t.normalizedTerm === normalized);
  if (isGlobal) {
    return { ok: false, code: "already_global" };
  }

  const { blocked } = await getGuildTerms(guildId);

  // Check if already exists for this guild
  if (blocked.some((t) => t.normalizedTerm === normalized)) {
    return { ok: false, code: "already_exists" };
  }

  // Check custom term limit
  if (blocked.length >= MAX_GUILD_CUSTOM_TERMS) {
    return { ok: false, code: "max_reached", max: MAX_GUILD_CUSTOM_TERMS };
  }

  // Add the term
  await prisma.guildBlockedTerm.create({
    data: {
      guildId,
      term: term.trim(),
      normalizedTerm: normalized,
      category: "custom",
      severity: "medium",
      matchType: "token",
      enabled: true,
    },
  });

  // Invalidate cache
  invalidateGuild(guildId);

  return { ok: true, count: blocked.length + 1 };
}

/**
 * Remove a custom blocked term from a guild.
 *
 * @param {string} guildId - The guild ID.
 * @param {string} term - The term to remove.
 * @returns {Promise<Object>} Result with ok status and count.
 */
async function removeGuildBlockedTerm(guildId, term) {
  const normalized = normalizeTerm(term);

  if (!normalized) {
    return { ok: false, code: "empty_term" };
  }

  const { blocked } = await getGuildTerms(guildId);
  const existing = blocked.find((t) => t.normalizedTerm === normalized);

  if (!existing) {
    return { ok: false, code: "not_found" };
  }

  await prisma.guildBlockedTerm.delete({
    where: { id: existing.id },
  });

  // Invalidate cache
  invalidateGuild(guildId);

  return { ok: true, count: blocked.length - 1 };
}

/**
 * Add a guild allow term (false-positive exception).
 *
 * @param {string} guildId - The guild ID.
 * @param {string} term - The term to allow.
 * @param {string} [reason] - Optional reason for the exception.
 * @returns {Promise<Object>} Result with ok status.
 */
async function addGuildAllowedTerm(guildId, term, reason) {
  const normalized = normalizeTerm(term);

  if (!normalized) {
    return { ok: false, code: "empty_term" };
  }

  // Check if already exists
  const existing = await prisma.guildAllowedTerm.findUnique({
    where: { guildId_normalizedTerm: { guildId, normalizedTerm: normalized } },
  });

  if (existing) {
    return { ok: false, code: "already_exists" };
  }

  await prisma.guildAllowedTerm.create({
    data: {
      guildId,
      term: term.trim(),
      normalizedTerm: normalized,
      reason,
    },
  });

  // Invalidate cache
  invalidateGuild(guildId);

  return { ok: true };
}

/**
 * Remove a guild allow term.
 *
 * @param {string} guildId - The guild ID.
 * @param {string} term - The term to remove from allowed list.
 * @returns {Promise<Object>} Result with ok status.
 */
async function removeGuildAllowedTerm(guildId, term) {
  const normalized = normalizeTerm(term);

  if (!normalized) {
    return { ok: false, code: "empty_term" };
  }

  const existing = await prisma.guildAllowedTerm.findUnique({
    where: { guildId_normalizedTerm: { guildId, normalizedTerm: normalized } },
  });

  if (!existing) {
    return { ok: false, code: "not_found" };
  }

  await prisma.guildAllowedTerm.delete({
    where: { id: existing.id },
  });

  // Invalidate cache
  invalidateGuild(guildId);

  return { ok: true };
}

/**
 * Get blocked terms statistics for a guild.
 *
 * @param {string} guildId - The guild ID.
 * @returns {Promise<Object>} Stats object.
 */
async function getBlockedTermsStats(guildId) {
  const [globalTerms, guildData] = await Promise.all([
    getGlobalTerms(),
    guildId ? getGuildTerms(guildId) : Promise.resolve({ blocked: [], allowed: [] }),
  ]);

  // Count global terms by category
  const globalByCategory = {};
  for (const term of globalTerms) {
    globalByCategory[term.category] = (globalByCategory[term.category] || 0) + 1;
  }

  return {
    globalCount: globalTerms.length,
    globalByCategory,
    guildBlockedCount: guildData.blocked.length,
    guildAllowedCount: guildData.allowed.length,
    maxGuildCustom: MAX_GUILD_CUSTOM_TERMS,
    remaining: MAX_GUILD_CUSTOM_TERMS - guildData.blocked.length,
    guildBlockedTerms: guildData.blocked.map((t) => t.term),
    guildAllowedTerms: guildData.allowed.map((t) => t.term),
  };
}

module.exports = {
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
  // Exported for testing
  normalizeText,
  normalizeTerm,
  tokenize,
  compact,
  matchToken,
  matchPhrase,
  matchSubstring,
  applyMatch,
  checkTextAgainstTerms,
  invalidateGuild,
  invalidateGlobal,
};
