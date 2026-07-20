/**
 * Text normalization for blocked-term matching.
 *
 * This module provides a deterministic normalization pipeline that:
 * - lowercases text
 * - applies Unicode NFKD normalization
 * - removes combining diacritics
 * - normalizes common leet-speak characters
 * - collapses separators and excessive whitespace
 * - handles repeated letters conservatively
 *
 * The normalization is designed to catch common obfuscation techniques
 * without producing false positives on innocent words.
 */

// Leet speak character mapping
const LEET_MAP = Object.freeze({
  "@": "a",
  "4": "a",
  "ä": "a",
  "á": "a",
  "à": "a",
  "â": "a",
  "ã": "a",
  "å": "a",
  "α": "a",
  "$": "s",
  "5": "s",
  "š": "s",
  "ß": "ss",
  "1": "i",
  "!": "i",
  "|": "i",
  "ì": "i",
  "í": "i",
  "î": "i",
  "ï": "i",
  "0": "o",
  "ö": "o",
  "ó": "o",
  "ò": "o",
  "ô": "o",
  "õ": "o",
  "ø": "o",
  "ο": "o",
  "3": "e",
  "é": "e",
  "è": "e",
  "ê": "e",
  "ë": "e",
  "ε": "e",
  "7": "t",
  "þ": "t",
  "8": "b",
  "9": "g",
  "6": "g",
});

// Characters that are treated as separators (will be collapsed to single dash or removed)
const SEPARATOR_PATTERN = /[-_.,;:!?'"()\[\]{}<>/\\|@#$%^&*+=~`]/g;

// Combining diacritical marks (Unicode range)
const DIACRITICS_PATTERN = /[\u0300-\u036f]/g;

/**
 * Normalize a single character using leet mapping.
 * @param {string} char - The character to normalize.
 * @returns {string} The normalized character.
 */
function normalizeLeetChar(char) {
  const lower = char.toLowerCase();
  return LEET_MAP[lower] || lower;
}

/**
 * Collapse repeated characters to at most 2 occurrences.
 * This handles intentional letter repetition like "fuuck" -> "fuck"
 * while being conservative enough to avoid false positives.
 *
 * @param {string} text - The text to process.
 * @returns {string} Text with repeated characters collapsed.
 */
function collapseRepeatedChars(text) {
  return text.replace(/(.)\1{2,}/g, "$1$1");
}

/**
 * Normalize text for blocked-term matching.
 *
 * Pipeline:
 * 1. Lowercase
 * 2. Unicode NFKD normalization
 * 3. Remove combining diacritics
 * 4. Apply leet character normalization
 * 5. Replace all separators with dashes
 * 6. Collapse multiple dashes
 * 7. Remove leading/trailing dashes
 * 8. Collapse repeated characters
 *
 * The normalized form uses dashes as word separators.
 * For token matching, split on dashes.
 * For substring matching, remove dashes.
 *
 * @param {string} text - The input text.
 * @returns {string} The normalized text.
 */
function normalizeText(text) {
  if (!text) return "";

  let result = String(text)
    // 1. Lowercase
    .toLowerCase()
    // 2. Unicode NFKD normalization
    .normalize("NFKD")
    // 3. Remove combining diacritics
    .replace(DIACRITICS_PATTERN, "")
    // 4. Apply leet character normalization
    .replace(/./g, (char) => normalizeLeetChar(char))
    // 5. Replace all separators (including spaces) with dashes
    .replace(/[\s\-_.;:!?'"()\[\]{}<>\/\\|@#$%^&*+=~`]/g, "-")
    // 6. Collapse multiple dashes
    .replace(/-+/g, "-")
    // 7. Remove leading/trailing dashes
    .replace(/^-+|-+$/g, "")
    // 8. Collapse excessive repeated characters (2+ -> 1)
    .replace(/(.)\1+/g, "$1")
    .trim();

  return result;
}

/**
 * Normalize a term for storage and matching.
 * This produces a canonical form for the database.
 *
 * @param {string} term - The term to normalize.
 * @returns {string} The normalized term.
 */
function normalizeTerm(term) {
  return normalizeText(term);
}

/**
 * Tokenize normalized text into individual words.
 * Uses dash as delimiter (since normalization replaces separators with dashes).
 *
 * @param {string} normalizedText - The normalized text.
 * @returns {string[]} Array of tokens.
 */
function tokenize(normalizedText) {
  if (!normalizedText) return [];
  return normalizedText
    .split(/-+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Create a compact version of normalized text (all separators removed).
 * Used for substring matching.
 *
 * @param {string} normalizedText - The normalized text.
 * @returns {string} Compact version without separators.
 */
function compact(normalizedText) {
  if (!normalizedText) return "";
  return normalizedText.replace(/[-\s]/g, "");
}

/**
 * Check if a term matches using token matching.
 * Token matching requires the term to appear as a complete word/token.
 *
 * @param {string[]} tokens - The tokenized input text.
 * @param {string} normalizedTerm - The normalized term to match.
 * @returns {boolean} Whether the term matches.
 */
function matchToken(tokens, normalizedTerm) {
  return tokens.includes(normalizedTerm);
}

/**
 * Check if a term matches using phrase matching.
 * Phrase matching requires all tokens of the term to appear consecutively.
 *
 * @param {string[]} tokens - The tokenized input text.
 * @param {string} normalizedTerm - The normalized term to match.
 * @returns {boolean} Whether the phrase matches.
 */
function matchPhrase(tokens, normalizedTerm) {
  const termTokens = tokenize(normalizedTerm);
  if (termTokens.length === 0) return false;
  if (termTokens.length === 1) return tokens.includes(termTokens[0]);

  // Check for consecutive tokens
  for (let i = 0; i <= tokens.length - termTokens.length; i++) {
    let match = true;
    for (let j = 0; j < termTokens.length; j++) {
      if (tokens[i + j] !== termTokens[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

/**
 * Check if a term matches using substring matching.
 * Substring matching checks if the term appears anywhere in the compact text.
 * Only used for long, unambiguous terms to avoid false positives.
 *
 * @param {string} compactText - The compact (separator-free) input text.
 * @param {string} normalizedTerm - The normalized term to match.
 * @returns {boolean} Whether the substring matches.
 */
function matchSubstring(compactText, normalizedTerm) {
  return compactText.includes(normalizedTerm);
}

/**
 * Apply matching based on match type.
 *
 * @param {string} normalizedInput - The normalized input text.
 * @param {string} normalizedTerm - The normalized term to match.
 * @param {string} matchType - The match type (token, phrase, substring).
 * @returns {boolean} Whether the term matches.
 */
function applyMatch(normalizedInput, normalizedTerm, matchType) {
  if (matchType === "substring") {
    return matchSubstring(compact(normalizedInput), normalizedTerm);
  }

  const tokens = tokenize(normalizedInput);

  if (matchType === "phrase") {
    return matchPhrase(tokens, normalizedTerm);
  }

  // Default: token matching
  return matchToken(tokens, normalizedTerm);
}

/**
 * Check text against a list of terms and return the first match.
 *
 * @param {string} text - The text to check.
 * @param {Array} terms - Array of term objects with normalizedTerm, matchType, category, severity.
 * @param {Set<string>} [allowedTerms=new Set()] - Set of normalized allowed terms.
 * @returns {Object|null} Match result with term metadata, or null if no match.
 */
function checkTextAgainstTerms(text, terms, allowedTerms = new Set()) {
  const normalizedInput = normalizeText(text);
  if (!normalizedInput) return null;

  for (const term of terms) {
    if (!term.enabled) continue;

    // Check if this term is allowed (exception) for this guild
    if (allowedTerms.has(term.normalizedTerm)) continue;

    // Skip substring terms that are too short (less than 5 chars)
    // to avoid false positives
    if (term.matchType === "substring" && term.normalizedTerm.length < 5) {
      continue;
    }

    if (applyMatch(normalizedInput, term.normalizedTerm, term.matchType)) {
      return {
        matched: true,
        term: term.term,
        normalizedTerm: term.normalizedTerm,
        category: term.category,
        severity: term.severity,
        matchType: term.matchType,
        source: term.source || "unknown",
        locale: term.locale || "en",
      };
    }
  }

  return null;
}

module.exports = {
  normalizeText,
  normalizeTerm,
  tokenize,
  compact,
  LEET_MAP,
  collapseRepeatedChars,
  matchToken,
  matchPhrase,
  matchSubstring,
  applyMatch,
  checkTextAgainstTerms,
};
