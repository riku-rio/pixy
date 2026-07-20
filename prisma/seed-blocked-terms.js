/**
 * Seed script for blocked terms.
 *
 * This script populates the BlockedTerm table with high-confidence
 * canonical English blocked terms and phrases.
 *
 * Usage:
 *   node prisma/seed-blocked-terms.js
 *
 * The dataset aims for approximately 500 terms across these categories:
 * - profanity: Strong profanity and vulgar language
 * - slurs: Racial, ethnic, and identity-based slurs
 * - sexual: Sexual content and explicit terms
 * - violence: Violent language and threats
 * - hate: Hate speech and discriminatory language
 * - harassment: Bullying and targeted harassment
 * - drugs: Drug references and substance abuse
 * - extremism: Extremist and radical content
 * - scams: Common scam and phishing terms
 * - adult: Adult services and content
 *
 * Each term has:
 * - term: The original form for display
 * - normalizedTerm: The normalized form for matching
 * - category: Classification
 * - severity: low, medium, high, critical
 * - matchType: token, phrase, substring
 * - locale: Language (default: en)
 * - source: Origin of the term
 *
 * Note: Terms are normalized before storage, so leet-speak variations,
 * spacing, and punctuation obfuscation are handled by the normalization
 * engine rather than stored as separate entries.
 */

require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Seed data organized by category
const seedData = [
  // ============================================================================
  // PROFANITY - Strong profanity and vulgar language (~75 terms)
  // ============================================================================
  { term: "fuck", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "fucking", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "fucked", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "fucker", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "fuckers", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "fuckface", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "motherfucker", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "motherfucking", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "shit", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "shitty", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "shits", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "shitting", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "shithead", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "shitface", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "bullshit", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "bitch", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "bitching", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "bitches", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "asshole", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "assholes", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "asswipe", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "assface", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "dick", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "dicks", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "dickhead", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "dickface", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "cock", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "cocks", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "cocksucker", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "cockface", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "pussy", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "pussies", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "cunt", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "cunts", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "cuntface", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "bastard", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "bastards", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "damn", category: "profanity", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "dammit", category: "profanity", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "damnit", category: "profanity", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "goddamn", category: "profanity", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "goddammit", category: "profanity", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "goddamnit", category: "profanity", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "crap", category: "profanity", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "prick", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "pricks", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "twat", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "twats", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "wanker", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "wankers", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "wank", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "tosser", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "tossers", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "bloody", category: "profanity", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "bollocks", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "dipshit", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "dumbass", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "jackoff", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "jerkoff", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "piss", category: "profanity", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "pissed", category: "profanity", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "pissedoff", category: "profanity", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "whore", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "whores", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "slut", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "sluts", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "slutty", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "hoe", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "hoes", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "douche", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "douchebag", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "schmuck", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "anus", category: "profanity", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "arsehole", category: "profanity", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "arse", category: "profanity", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "git", category: "profanity", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "numpty", category: "profanity", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "pleb", category: "profanity", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "peasant", category: "profanity", severity: "low", matchType: "token", locale: "en", source: "pixy" },

  // ============================================================================
  // SLURS - Racial, ethnic, and identity-based slurs (~50 terms)
  // ============================================================================
  { term: "nigger", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "niggers", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "nigga", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "niggas", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "faggot", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "faggots", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "fag", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "fags", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "spic", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "spick", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "wetback", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "chink", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "gook", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "gooks", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "kike", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "kikes", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "honky", category: "slurs", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "honkeys", category: "slurs", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "cracker", category: "slurs", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "redneck", category: "slurs", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "tranny", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "retard", category: "slurs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "retarded", category: "slurs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "retards", category: "slurs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "kraut", category: "slurs", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "beaner", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "tacohead", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "gringo", category: "slurs", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "darkie", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "coon", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "jigaboo", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "negro", category: "slurs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "negros", category: "slurs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "uncletom", category: "slurs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "gypo", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "pikey", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "tinkertink", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "dago", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "wop", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "guinea", category: "slurs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "mick", category: "slurs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "paddy", category: "slurs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "turbanhead", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "raghead", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "sandnigger", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "zipperhead", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "slopehead", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "yellowman", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "mongoloid", category: "slurs", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "cripple", category: "slurs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "crip", category: "slurs", severity: "high", matchType: "token", locale: "en", source: "pixy" },

  // ============================================================================
  // SEXUAL - Sexual content and explicit terms (~50 terms)
  // ============================================================================
  { term: "porn", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "porno", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "pornography", category: "sexual", severity: "medium", matchType: "substring", locale: "en", source: "pixy" },
  { term: "boob", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "boobs", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "tits", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "titties", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "titty", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "clitoris", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "vagina", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "penis", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "butthole", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "sexcam", category: "sexual", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "camgirl", category: "sexual", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "camboy", category: "sexual", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "onlyfans", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "nsfw", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "nudes", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "nude", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "dickpic", category: "sexual", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "booty", category: "sexual", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "milf", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "dilf", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "orgasm", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "blowjob", category: "sexual", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "handjob", category: "sexual", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "rimjob", category: "sexual", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "anal", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "gangbang", category: "sexual", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "creampie", category: "sexual", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "cum", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "cumshot", category: "sexual", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "facial", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "threesome", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "foursome", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "masturbate", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "masturbation", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "erotic", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "erotica", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "fetish", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "bdsm", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "hentai", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "tentacle", category: "sexual", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "xxx", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "nudepics", category: "sexual", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "sexting", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "cybersex", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "squirt", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "deepthroat", category: "sexual", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "69", category: "sexual", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "bootycall", category: "sexual", severity: "medium", matchType: "token", locale: "en", source: "pixy" },

  // ============================================================================
  // VIOLENCE - Violent language and threats (~60 terms)
  // ============================================================================
  { term: "kill yourself", category: "violence", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "kys", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "rape", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "rapist", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "rapists", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "raped", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "raping", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "murder", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "murderer", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "murdering", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "suicide", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "suicidal", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "molest", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "molester", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "molestation", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "pedophile", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "pedophilia", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "pedophiles", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "groom", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "groomer", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "groomers", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "grooming", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "torture", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "tortured", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "torturing", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "abuse", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "abusive", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "abused", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "stab", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "stabbing", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "stabbed", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "shoot", category: "violence", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "shooting", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "shot", category: "violence", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "bomb", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "bombing", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "bomber", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "terrorist", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "terrorism", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "terrorize", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "strangle", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "strangling", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "lynch", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "lynching", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "behead", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "beheading", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "decapitate", category: "violence", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "burn alive", category: "violence", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "die in a fire", category: "violence", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "hope you die", category: "violence", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "you should die", category: "violence", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "i will kill", category: "violence", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "threat", category: "violence", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "threaten", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "threatening", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "dox", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "doxing", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "doxx", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "doxxing", category: "violence", severity: "high", matchType: "token", locale: "en", source: "pixy" },

  // ============================================================================
  // HATE - Hate speech and discriminatory language (~50 terms)
  // ============================================================================
  { term: "nazi", category: "hate", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "nazis", category: "hate", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "hitler", category: "hate", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "holocaust", category: "hate", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "genocide", category: "hate", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "ethnic cleansing", category: "hate", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "white supremacist", category: "hate", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "white supremacists", category: "hate", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "white power", category: "hate", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "heil hitler", category: "hate", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "neo nazi", category: "hate", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "neo-nazi", category: "hate", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "klan", category: "hate", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "kkk", category: "hate", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "white genocide", category: "hate", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "master race", category: "hate", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "aryan", category: "hate", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "antisemite", category: "hate", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "antisemitism", category: "hate", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "homophobe", category: "hate", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "homophobic", category: "hate", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "transphobe", category: "hate", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "transphobic", category: "hate", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "racist", category: "hate", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "racism", category: "hate", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "bigot", category: "hate", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "bigotry", category: "hate", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "white trash", category: "hate", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "go back to your country", category: "hate", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "subhuman", category: "hate", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "degenerate", category: "hate", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "inferior race", category: "hate", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "race war", category: "hate", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "ethnic minority", category: "hate", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "white genocide", category: "hate", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "fourteen words", category: "hate", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "1488", category: "hate", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "stormfront", category: "hate", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "confederate", category: "hate", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "slavery", category: "hate", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "slave owner", category: "hate", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "woman hater", category: "hate", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "misogynist", category: "hate", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "misogyny", category: "hate", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "misanthrope", category: "hate", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "xeonophobe", category: "hate", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "nativist", category: "hate", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "supremacist", category: "hate", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "fascist", category: "hate", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "fascism", category: "hate", severity: "high", matchType: "token", locale: "en", source: "pixy" },

  // ============================================================================
  // HARASSMENT - Bullying and targeted harassment (~60 terms)
  // ============================================================================
  { term: "neck yourself", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "hang yourself", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "do the world a favor", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "no one would miss you", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "go kill yourself", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "just kill yourself", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "end yourself", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "unalive yourself", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "hope you get cancer", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "nobody likes you", category: "harassment", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "everyone hates you", category: "harassment", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "kill yourself now", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "kys now", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "you are worthless", category: "harassment", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "you deserve to die", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "do us all a favor", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "end it all", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "stop breathing", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "waste of space", category: "harassment", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "trash human", category: "harassment", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "human garbage", category: "harassment", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "stupid fuck", category: "harassment", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "dumb fuck", category: "harassment", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "shut the fuck up", category: "harassment", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "kill them", category: "harassment", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "burn in hell", category: "harassment", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "go to hell", category: "harassment", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "drop dead", category: "harassment", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "braindead", category: "harassment", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "brain dead", category: "harassment", severity: "medium", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "mouth breather", category: "harassment", severity: "medium", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "neckbeard", category: "harassment", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "incel", category: "harassment", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "simp", category: "harassment", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "cuck", category: "harassment", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "cuckold", category: "harassment", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "beta male", category: "harassment", severity: "medium", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "snowflake", category: "harassment", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "sjw", category: "harassment", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "karen", category: "harassment", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "boomer", category: "harassment", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "ok boomer", category: "harassment", severity: "low", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "npc", category: "harassment", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "cope", category: "harassment", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "seethe", category: "harassment", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "dilate", category: "harassment", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "stay mad", category: "harassment", severity: "medium", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "mald", category: "harassment", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "ratio", category: "harassment", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "touch grass", category: "harassment", severity: "low", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "get a life", category: "harassment", severity: "low", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "uninstall", category: "harassment", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "kill yourself please", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "suicide is the answer", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "commit suicide", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "hang yourself now", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "neck rope", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "noose", category: "harassment", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "toaster bath", category: "harassment", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },

  // ============================================================================
  // DRUGS - Drug references and substance abuse (~40 terms)
  // ============================================================================
  { term: "cocaine", category: "drugs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "heroin", category: "drugs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "meth", category: "drugs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "methamphetamine", category: "drugs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "fentanyl", category: "drugs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "lsd", category: "drugs", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "mdma", category: "drugs", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "ecstasy", category: "drugs", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "marijuana", category: "drugs", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "weed", category: "drugs", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "crack", category: "drugs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "opioid", category: "drugs", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "addict", category: "drugs", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "addicted", category: "drugs", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "drug dealer", category: "drugs", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "drug user", category: "drugs", severity: "medium", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "drug use", category: "drugs", severity: "medium", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "drug abuse", category: "drugs", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "druggie", category: "drugs", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "junkie", category: "drugs", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "junkies", category: "drugs", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "crackhead", category: "drugs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "crackheads", category: "drugs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "pothead", category: "drugs", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "stoner", category: "drugs", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "speedball", category: "drugs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "meth lab", category: "drugs", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "syringe", category: "drugs", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "needle", category: "drugs", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "overdose", category: "drugs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "overdosed", category: "drugs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "pcp", category: "drugs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "gHB", category: "drugs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "ketamine", category: "drugs", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "mushroom", category: "drugs", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "shroom", category: "drugs", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "opioid", category: "drugs", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "painkiller", category: "drugs", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "popping pills", category: "drugs", severity: "medium", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "sell drugs", category: "drugs", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },

  // ============================================================================
  // EXTREMISM - Extremist and radical content (~25 terms)
  // ============================================================================
  { term: "isis", category: "extremism", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "al qaeda", category: "extremism", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "jihad", category: "extremism", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "jihadist", category: "extremism", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "white nationalism", category: "extremism", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "alt right", category: "extremism", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "alt-right", category: "extremism", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "taliban", category: "extremism", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "boko haram", category: "extremism", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "hezbollah", category: "extremism", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "hamas", category: "extremism", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "militia", category: "extremism", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "radicalize", category: "extremism", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "radicalized", category: "extremism", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "white supremacist", category: "extremism", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "white supremacy", category: "extremism", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "ethnostate", category: "extremism", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "accelerationism", category: "extremism", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "boogaloo", category: "extremism", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "insurrection", category: "extremism", severity: "critical", matchType: "token", locale: "en", source: "pixy" },
  { term: "overthrow", category: "extremism", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "rebel", category: "extremism", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "anarchy", category: "extremism", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "anti government", category: "extremism", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "hate group", category: "extremism", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },

  // ============================================================================
  // SCAMS - Common scam and phishing terms (~25 terms)
  // ============================================================================
  { term: "free nitro", category: "scams", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "click here to claim", category: "scams", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "verify your account", category: "scams", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "steam gift", category: "scams", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "discord nitro gift", category: "scams", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "limited time offer", category: "scams", severity: "medium", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "act now", category: "scams", severity: "medium", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "congratulations you won", category: "scams", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "you have been selected", category: "scams", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "claim your prize", category: "scams", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "enter your password", category: "scams", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "login to verify", category: "scams", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "account suspended", category: "scams", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "account compromised", category: "scams", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "nudes leaked", category: "scams", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "is this you", category: "scams", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "free robux", category: "scams", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "free v bucks", category: "scams", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "free minecraft", category: "scams", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "double your coins", category: "scams", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "giveaway", category: "scams", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "dm to claim", category: "scams", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "send me your password", category: "scams", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "what is your password", category: "scams", severity: "critical", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "phishing", category: "scams", severity: "high", matchType: "token", locale: "en", source: "pixy" },

  // ============================================================================
  // ADULT - Adult services and content (~25 terms)
  // ============================================================================
  { term: "escort", category: "adult", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "escorts", category: "adult", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "hooker", category: "adult", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "hookers", category: "adult", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "brothel", category: "adult", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "brothels", category: "adult", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "prostitution", category: "adult", severity: "high", matchType: "token", locale: "en", source: "pixy" },
  { term: "sex work", category: "adult", severity: "medium", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "sugar daddy", category: "adult", severity: "low", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "sugar mommy", category: "adult", severity: "low", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "sugardaddy", category: "adult", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "stripper", category: "adult", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "strippers", category: "adult", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "lap dance", category: "adult", severity: "medium", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "peep show", category: "adult", severity: "medium", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "call girl", category: "adult", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "soliciting", category: "adult", severity: "medium", matchType: "token", locale: "en", source: "pixy" },
  { term: "sugar baby", category: "adult", severity: "low", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "sugarbabies", category: "adult", severity: "low", matchType: "token", locale: "en", source: "pixy" },
  { term: "sex for money", category: "adult", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "pay for sex", category: "adult", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "find local sluts", category: "adult", severity: "high", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "bang buddies", category: "adult", severity: "medium", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "nsfw channel", category: "adult", severity: "medium", matchType: "phrase", locale: "en", source: "pixy" },
  { term: "adult content", category: "adult", severity: "medium", matchType: "phrase", locale: "en", source: "pixy" },
];

/**
 * Normalize a term for storage.
 * This must match the normalization used in src/utils/blockedTerms/normalization.js
 * @param {string} term
 * @returns {string}
 */
function normalizeTerm(term) {
  if (!term) return "";
  return String(term)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/./g, (char) => {
      const map = {
        "@": "a", "4": "a", "ä": "a", "á": "a", "à": "a", "â": "a", "ã": "a", "å": "a", "α": "a",
        "$": "s", "5": "s", "š": "s",
        "1": "i", "!": "i", "|": "i",
        "0": "o", "ö": "o", "ó": "o", "ò": "o", "ô": "o", "õ": "o", "ø": "o", "ο": "o",
        "3": "e", "é": "e", "è": "e", "ê": "e", "ë": "e", "ε": "e",
        "7": "t", "þ": "t",
        "8": "b",
        "9": "g", "6": "g",
      };
      return map[char] || char;
    })
    .replace(/[\s\-_.;:!?'"()\[\]{}<>/\\|@#$%^&*+=~`]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/(.)\1+/g, "$1")
    .trim();
}

async function main() {
  console.log("Starting blocked terms seed...");
  console.log(`Found ${seedData.length} terms to seed.`);

  // Deduplicate by normalized term
  const seen = new Set();
  const uniqueTerms = [];
  let skipped = 0;

  for (const entry of seedData) {
    const normalized = normalizeTerm(entry.term);
    if (!normalized) {
      console.warn(`Skipping empty term: "${entry.term}"`);
      skipped++;
      continue;
    }
    if (seen.has(normalized)) {
      skipped++;
      continue;
    }
    seen.add(normalized);
    uniqueTerms.push({ ...entry, normalizedTerm: normalized });
  }

  if (skipped > 0) {
    console.log(`Skipped ${skipped} duplicate/empty terms.`);
  }
  console.log(`After deduplication: ${uniqueTerms.length} unique terms.`);

  // Insert in batches to avoid SQLite limitations
  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < uniqueTerms.length; i += BATCH_SIZE) {
    const batch = uniqueTerms.slice(i, i + BATCH_SIZE);

    for (const entry of batch) {
      try {
        await prisma.blockedTerm.create({
          data: {
            term: entry.term,
            normalizedTerm: entry.normalizedTerm,
            locale: entry.locale,
            category: entry.category,
            severity: entry.severity,
            matchType: entry.matchType,
            enabled: true,
            source: entry.source,
          },
        });
        inserted++;
      } catch (err) {
        if (err?.code === "P2002") {
          // Duplicate normalizedTerm — skip silently
        } else {
          throw err;
        }
      }
    }

    console.log(`Inserted ${inserted}/${uniqueTerms.length} terms...`);
  }

  // Print summary by category
  const summary = {};
  for (const entry of uniqueTerms) {
    summary[entry.category] = (summary[entry.category] || 0) + 1;
  }

  console.log("\nSeed complete! Summary by category:");
  for (const [category, count] of Object.entries(summary).sort()) {
    console.log(`  ${category}: ${count}`);
  }
  console.log(`  Total: ${uniqueTerms.length}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
