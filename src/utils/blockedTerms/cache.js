/**
 * Caching layer for blocked terms.
 *
 * This module provides an in-memory cache with TTL-based expiration
 * and manual invalidation support. The cache ensures that normal
 * ticket-name checks don't query every blocked row repeatedly.
 *
 * Cache keys:
 * - "global" -> all enabled BlockedTerm records
 * - "guild:{guildId}" -> guild-specific blocked and allowed terms
 *
 * The cache is cleared on process restart (by design), which is safe
 * because the source of truth is always the database.
 */

const { prisma } = require("../../config/prisma");

// Cache TTL in milliseconds (5 minutes)
const DEFAULT_TTL_MS = 5 * 60 * 1000;

// In-memory cache store
const cache = new Map();

/**
 * Get a cached value or fetch it using the provided function.
 *
 * @param {string} key - The cache key.
 * @param {Function} fetchFn - Async function to fetch the data if not cached.
 * @param {number} [ttlMs=DEFAULT_TTL_MS] - Time-to-live in milliseconds.
 * @returns {Promise<any>} The cached or freshly fetched data.
 */
async function getOrFetch(key, fetchFn, ttlMs = DEFAULT_TTL_MS) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < ttlMs) {
    return entry.data;
  }

  const data = await fetchFn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

/**
 * Invalidate a specific cache key.
 *
 * @param {string} key - The cache key to invalidate.
 */
function invalidate(key) {
  cache.delete(key);
}

/**
 * Invalidate all guild-specific cache entries for a given guild.
 *
 * @param {string} guildId - The guild ID.
 */
function invalidateGuild(guildId) {
  invalidate(`guild:${guildId}`);
}

/**
 * Invalidate the global cache.
 */
function invalidateGlobal() {
  invalidate("global");
}

/**
 * Clear all cache entries.
 */
function clearAll() {
  cache.clear();
}

/**
 * Get cache stats for debugging.
 *
 * @returns {Object} Cache statistics.
 */
function getStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

/**
 * Fetch all enabled global blocked terms from the database.
 *
 * @returns {Promise<Array>} Array of enabled BlockedTerm records.
 */
async function fetchGlobalTerms() {
  return prisma.blockedTerm.findMany({
    where: { enabled: true },
    orderBy: [{ category: "asc" }, { term: "asc" }],
  });
}

/**
 * Fetch guild-specific blocked and allowed terms.
 *
 * @param {string} guildId - The guild ID.
 * @returns {Promise<Object>} Object with blocked and allowed term arrays.
 */
async function fetchGuildTerms(guildId) {
  const [blocked, allowed] = await Promise.all([
    prisma.guildBlockedTerm.findMany({
      where: { guildId, enabled: true },
      orderBy: { term: "asc" },
    }),
    prisma.guildAllowedTerm.findMany({
      where: { guildId },
      orderBy: { term: "asc" },
    }),
  ]);

  return { blocked, allowed };
}

/**
 * Get all enabled global blocked terms (cached).
 *
 * @returns {Promise<Array>} Array of enabled BlockedTerm records.
 */
async function getGlobalTerms() {
  return getOrFetch("global", fetchGlobalTerms);
}

/**
 * Get guild-specific blocked and allowed terms (cached).
 *
 * @param {string} guildId - The guild ID.
 * @returns {Promise<Object>} Object with blocked and allowed term arrays.
 */
async function getGuildTerms(guildId) {
  return getOrFetch(`guild:${guildId}`, () => fetchGuildTerms(guildId));
}

module.exports = {
  getOrFetch,
  invalidate,
  invalidateGuild,
  invalidateGlobal,
  clearAll,
  getStats,
  getGlobalTerms,
  getGuildTerms,
  fetchGlobalTerms,
  fetchGuildTerms,
  DEFAULT_TTL_MS,
};
