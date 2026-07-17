const { prisma } = require("../config/prisma");
const { badWords: builtInBadWords } = require("../config/badWords");

const MAX_CUSTOM_BAD_WORDS = 100;

/**
 * Check if a word is in the built-in bad words list
 */
function isBuiltInBadWord(word) {
  const normalized = String(word || "")
    .toLowerCase()
    .trim();
  return builtInBadWords.includes(normalized);
}

/**
 * Get all custom bad words for a guild
 */
async function getGuildCustomBadWords(guildId) {
  const setting = await prisma.guildSetting.findUnique({
    where: { guildId },
  });

  if (!setting?.customBadWords) return [];

  try {
    const parsed = JSON.parse(setting.customBadWords);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Get combined bad words (built-in + guild custom)
 */
async function getGuildBadWords(guildId) {
  const customWords = await getGuildCustomBadWords(guildId);
  return [...builtInBadWords, ...customWords];
}

/**
 * Check if a word is bad (built-in or guild custom)
 */
async function isBadWord(guildId, word) {
  const normalized = String(word || "")
    .toLowerCase()
    .trim();

  if (isBuiltInBadWord(normalized)) return true;

  const customWords = await getGuildCustomBadWords(guildId);
  return customWords.includes(normalized);
}

/**
 * Add a custom bad word to a guild
 */
async function addCustomBadWord(guildId, word) {
  const normalized = String(word || "")
    .toLowerCase()
    .trim();

  if (!normalized) {
    return { ok: false, code: "empty_word" };
  }

  if (isBuiltInBadWord(normalized)) {
    return { ok: false, code: "already_builtin" };
  }

  const customWords = await getGuildCustomBadWords(guildId);

  if (customWords.includes(normalized)) {
    return { ok: false, code: "already_exists" };
  }

  if (customWords.length >= MAX_CUSTOM_BAD_WORDS) {
    return { ok: false, code: "max_reached", max: MAX_CUSTOM_BAD_WORDS };
  }

  customWords.push(normalized);

  await prisma.guildSetting.upsert({
    where: { guildId },
    create: {
      guildId,
      customBadWords: JSON.stringify(customWords),
    },
    update: {
      customBadWords: JSON.stringify(customWords),
    },
  });

  return { ok: true, count: customWords.length };
}

/**
 * Remove a custom bad word from a guild
 */
async function removeCustomBadWord(guildId, word) {
  const normalized = String(word || "")
    .toLowerCase()
    .trim();

  if (!normalized) {
    return { ok: false, code: "empty_word" };
  }

  const customWords = await getGuildCustomBadWords(guildId);
  const index = customWords.indexOf(normalized);

  if (index === -1) {
    return { ok: false, code: "not_found" };
  }

  customWords.splice(index, 1);

  await prisma.guildSetting.update({
    where: { guildId },
    data: {
      customBadWords: JSON.stringify(customWords),
    },
  });

  return { ok: true, count: customWords.length };
}

/**
 * Get bad words count info for a guild
 */
async function getBadWordsStats(guildId) {
  const customWords = await getGuildCustomBadWords(guildId);
  return {
    builtInCount: builtInBadWords.length,
    customCount: customWords.length,
    maxCustom: MAX_CUSTOM_BAD_WORDS,
    remaining: MAX_CUSTOM_BAD_WORDS - customWords.length,
    customWords,
  };
}

module.exports = {
  isBuiltInBadWord,
  getGuildCustomBadWords,
  getGuildBadWords,
  isBadWord,
  addCustomBadWord,
  removeCustomBadWord,
  getBadWordsStats,
  MAX_CUSTOM_BAD_WORDS,
};
