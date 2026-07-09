const { aiConfig } = require("../../../config/ai");

const DEFAULT_BLOCKED_WORDS = [
  "fuck",
  "fucking",
  "fuk",
  "shit",
  "bitch",
  "nigga",
];

const LEET_MAP = {
  "@": "a",
  "4": "a",
  "$": "s",
  "5": "s",
  "1": "i",
  "!": "i",
  "|": "i",
  "0": "o",
  "3": "e",
  "7": "t",
};

function normalizeForSafety(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[@$!|013457]/g, (char) => LEET_MAP[char] || char)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getBlockedWords() {
  return Array.from(
    new Set([
      ...DEFAULT_BLOCKED_WORDS,
      ...(Array.isArray(aiConfig.renameBlockedWords)
        ? aiConfig.renameBlockedWords
        : []),
    ])
  )
    .map(normalizeForSafety)
    .filter(Boolean);
}

function getUnsafeTicketNameReason(value) {
  const normalized = normalizeForSafety(value);
  if (!normalized) return null;

  const compact = normalized.replace(/-/g, "");
  const tokens = normalized.split("-").filter(Boolean);
  const blockedWords = getBlockedWords();

  for (const word of blockedWords) {
    if (!word) continue;

    if (tokens.includes(word)) {
      return "blocked_word";
    }

    if (compact.includes(word)) {
      return "blocked_word_obfuscated";
    }
  }

  return null;
}

function isUnsafeTicketName(value) {
  return Boolean(getUnsafeTicketNameReason(value));
}

module.exports = {
  normalizeForSafety,
  getUnsafeTicketNameReason,
  isUnsafeTicketName,
};
