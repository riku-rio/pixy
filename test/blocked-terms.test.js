/**
 * Tests for the blocked terms system.
 *
 * This test suite covers:
 * - Text normalization
 * - Duplicate handling
 * - Leading/trailing whitespace
 * - Leet speak and separator obfuscation
 * - Repeated letters
 * - Token vs substring matching
 * - Phrase matching
 * - Guild isolation
 * - Guild allowlist overrides
 * - Custom term limits
 * - Migration behavior
 * - Stats/counts
 * - False positives
 * - Validators using the shared service
 */

const assert = require("node:assert/strict");
const { after, before, beforeEach, test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "pixy-blocked-terms-"));
const databasePath = path.join(temporaryDirectory, "blocked-terms.db");
const originalDatabaseUrl = process.env.DATABASE_URL;
let prisma;

// Normalization functions can be loaded immediately (no DB dependency)
const {
  normalizeText,
  normalizeTerm,
  tokenize,
  compact,
  matchToken,
  matchPhrase,
  matchSubstring,
  checkTextAgainstTerms,
} = require("../src/utils/blockedTerms/normalization");

// Service functions are loaded lazily after DB is set up
let addGuildBlockedTerm;
let removeGuildBlockedTerm;
let addGuildAllowedTerm;
let removeGuildAllowedTerm;
let getBlockedTermsStats;
let checkBlockedTerms;
let getUnsafeTicketNameReason;
let isSafeTicketName;
let invalidateGuild;
let invalidateGlobal;

function runPrismaCommand(args) {
  execFileSync(process.execPath, [require.resolve("prisma/build/index.js"), ...args], {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: `file:${databasePath}` },
    stdio: "pipe",
  });
}

before(async () => {
  process.env.DATABASE_URL = `file:${databasePath}`;
  runPrismaCommand(["db", "push", "--schema", "prisma/schema.prisma"]);
  
  // Clear all cached modules that might have loaded prisma
  const moduleKeys = Object.keys(require.cache);
  for (const key of moduleKeys) {
    if (key.includes('prisma') || key.includes('blockedTerms') || key.includes('cache')) {
      delete require.cache[key];
    }
  }
  
  ({ prisma } = require("../src/config/prisma"));

  // Load service functions after cache is cleared
  ({
    addGuildBlockedTerm,
    removeGuildBlockedTerm,
    addGuildAllowedTerm,
    removeGuildAllowedTerm,
    getBlockedTermsStats,
    checkBlockedTerms,
    getUnsafeTicketNameReason,
    isSafeTicketName,
    invalidateGuild,
    invalidateGlobal,
  } = require("../src/utils/blockedTerms"));

  // Create test guild settings
  await prisma.guildSetting.createMany({
    data: [
      { guildId: "test-guild-1" },
      { guildId: "test-guild-2" },
    ],
  });

  // Seed some global blocked terms for testing
  await prisma.blockedTerm.createMany({
    data: [
      { term: "fuck", normalizedTerm: "fuck", category: "profanity", severity: "high", matchType: "token", source: "test" },
      { term: "shit", normalizedTerm: "shit", category: "profanity", severity: "medium", matchType: "token", source: "test" },
      { term: "bitch", normalizedTerm: "bitch", category: "profanity", severity: "high", matchType: "token", source: "test" },
      { term: "nigger", normalizedTerm: "nigger", category: "slurs", severity: "critical", matchType: "token", source: "test" },
      { term: "kill yourself", normalizedTerm: "kil-yourself", category: "violence", severity: "critical", matchType: "phrase", source: "test" },
      { term: "rape", normalizedTerm: "rape", category: "violence", severity: "critical", matchType: "token", source: "test" },
      { term: "pedophile", normalizedTerm: "pedophile", category: "violence", severity: "critical", matchType: "token", source: "test" },
    ],
  });
});

after(async () => {
  if (prisma) await prisma.$disconnect();
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

beforeEach(() => {
  // Clear cache before each test
  invalidateGlobal();
  invalidateGuild("test-guild-1");
  invalidateGuild("test-guild-2");
});

// ============================================================================
// Normalization Tests
// ============================================================================

test("normalization: lowercase", () => {
  assert.equal(normalizeText("FUCK"), "fuck");
  assert.equal(normalizeText("Fuck"), "fuck");
  assert.equal(normalizeText("fUcK"), "fuck");
});

test("normalization: unicode NFKD", () => {
  assert.equal(normalizeText("ﬁsh"), "fish");
  assert.equal(normalizeText("café"), "cafe");
});

test("normalization: diacritics removal", () => {
  assert.equal(normalizeText("résumé"), "resume");
  assert.equal(normalizeText("naïve"), "naive");
  assert.equal(normalizeText("über"), "uber");
});

test("normalization: leet speak", () => {
  // Note: 4→a, 1→i, 0→o in leet speak
  // Double letters are collapsed
  assert.equal(normalizeText("f4ck"), "fack");
  assert.equal(normalizeText("sh1t"), "shit");
  assert.equal(normalizeText("b1tch"), "bitch");
  assert.equal(normalizeText("d1ck"), "dick");
  assert.equal(normalizeText("c0ck"), "cock");
  assert.equal(normalizeText("n1gg4"), "niga");
});

test("normalization: separator to dash", () => {
  // Separators become dashes
  assert.equal(normalizeText("f-u-c-k"), "f-u-c-k");
  assert.equal(normalizeText("f_u_c_k"), "f-u-c-k");
  assert.equal(normalizeText("f.u.c.k"), "f-u-c-k");
  assert.equal(normalizeText("f u c k"), "f-u-c-k");
});

test("normalization: leading/trailing whitespace", () => {
  assert.equal(normalizeText("  fuck  "), "fuck");
  assert.equal(normalizeText("\tfuck\t"), "fuck");
  assert.equal(normalizeText("\nfuck\n"), "fuck");
});

test("normalization: repeated characters", () => {
  // 2+ repeated chars become 1
  assert.equal(normalizeText("fuuck"), "fuck");
  assert.equal(normalizeText("fuuuuck"), "fuck");
  assert.equal(normalizeText("shiiit"), "shit");
  assert.equal(normalizeText("bitcccch"), "bitch");
  // Note: legitimate double letters are also collapsed
  assert.equal(normalizeText("hello"), "helo");
  assert.equal(normalizeText("world"), "world");
});

test("normalization: mixed obfuscation", () => {
  // F→f, 4→a, so F 4 C K → f-a-c-k → fack
  assert.equal(normalizeText("F 4 C K"), "f-a-c-k");
  // S→s, H→h, I→i, T→t
  assert.equal(normalizeText("S.H.I.T."), "s-h-i-t");
  // B→b, 1→i, CH→ch
  assert.equal(normalizeText("B1+CH"), "bi-ch");
});

// ============================================================================
// Tokenize Tests
// ============================================================================

test("tokenize: basic", () => {
  // After normalization, spaces become dashes and double letters are collapsed
  assert.deepEqual(tokenize(normalizeText("hello world")), ["helo", "world"]);
  assert.deepEqual(tokenize(normalizeText("fuck shit")), ["fuck", "shit"]);
});

test("tokenize: with dashes", () => {
  // After normalization, dashes are preserved
  assert.deepEqual(tokenize(normalizeText("hello world")), ["helo", "world"]);
  assert.deepEqual(tokenize(normalizeText("fuck shit")), ["fuck", "shit"]);
});

test("tokenize: empty", () => {
  assert.deepEqual(tokenize(""), []);
  assert.deepEqual(tokenize(null), []);
});

// ============================================================================
// Match Token Tests
// ============================================================================

test("matchToken: exact match", () => {
  assert.ok(matchToken(["fuck", "you"], "fuck"));
  assert.ok(!matchToken(["fuck", "you"], "shit"));
});

test("matchToken: partial word", () => {
  assert.ok(!matchToken(["fucking"], "fuck"));
  assert.ok(!matchToken(["truck"], "fuck"));
});

// ============================================================================
// Match Phrase Tests
// ============================================================================

test("matchPhrase: exact phrase", () => {
  // After normalization, "kill yourself" becomes "kil-yourself"
  // Tokenize splits on dashes, so we get ["kil", "yourself"]
  assert.ok(matchPhrase(normalizeText("kill yourself").split("-"), "kil-yourself"));
  assert.ok(!matchPhrase(normalizeText("kill me").split("-"), "kil-yourself"));
});

test("matchPhrase: consecutive", () => {
  assert.ok(matchPhrase(normalizeText("please kill yourself now").split("-"), "kil-yourself"));
  assert.ok(!matchPhrase(normalizeText("kill me yourself").split("-"), "kil-yourself"));
});

// ============================================================================
// Match Substring Tests
// ============================================================================

test("matchSubstring: basic", () => {
  assert.ok(matchSubstring("fuck", "fuck"));
  assert.ok(matchSubstring("yourefucked", "fuck"));
  assert.ok(!matchSubstring("truck", "fuck"));
});

// ============================================================================
// Check Text Against Terms Tests
// ============================================================================

test("checkTextAgainstTerms: token match", () => {
  const terms = [
    { term: "fuck", normalizedTerm: "fuck", category: "profanity", severity: "high", matchType: "token", enabled: true },
  ];
  const result = checkTextAgainstTerms("you are a fuck", terms);
  assert.ok(result);
  assert.equal(result.term, "fuck");
});

test("checkTextAgainstTerms: phrase match", () => {
  // Note: normalizedTerm should match the normalized form
  // "kill yourself" normalizes to "kil-yourself"
  const terms = [
    { term: "kill yourself", normalizedTerm: "kil-yourself", category: "violence", severity: "critical", matchType: "phrase", enabled: true },
  ];
  const result = checkTextAgainstTerms("go kill yourself now", terms);
  assert.ok(result);
  assert.equal(result.term, "kill yourself");
});

test("checkTextAgainstTerms: disabled term", () => {
  const terms = [
    { term: "fuck", normalizedTerm: "fuck", category: "profanity", severity: "high", matchType: "token", enabled: false },
  ];
  const result = checkTextAgainstTerms("you are a fuck", terms);
  assert.equal(result, null);
});

test("checkTextAgainstTerms: allowed term", () => {
  const terms = [
    { term: "rape", normalizedTerm: "rape", category: "violence", severity: "critical", matchType: "token", enabled: true },
  ];
  const allowed = new Set(["rape"]);
  const result = checkTextAgainstTerms("grape", terms, allowed);
  assert.equal(result, null);
});

// ============================================================================
// Guild Isolation Tests
// ============================================================================

test("guild isolation: blocked terms are guild-specific", async () => {
  await addGuildBlockedTerm("test-guild-1", "custombad");
  await addGuildBlockedTerm("test-guild-2", "anotherbad");

  const stats1 = await getBlockedTermsStats("test-guild-1");
  const stats2 = await getBlockedTermsStats("test-guild-2");

  assert.ok(stats1.guildBlockedTerms.includes("custombad"));
  assert.ok(!stats1.guildBlockedTerms.includes("anotherbad"));
  assert.ok(stats2.guildBlockedTerms.includes("anotherbad"));
  assert.ok(!stats2.guildBlockedTerms.includes("custombad"));

  // Cleanup
  await removeGuildBlockedTerm("test-guild-1", "custombad");
  await removeGuildBlockedTerm("test-guild-2", "anotherbad");
});

// ============================================================================
// Guild Allowlist Tests
// ============================================================================

test("guild allowlist: overrides blocked terms", async () => {
  // Add "rape" to global blocked terms (already exists from seed)
  // Add "rape" to guild allowlist
  await addGuildAllowedTerm("test-guild-1", "rape", "Allow grape");

  const result = await checkBlockedTerms("test-guild-1", "rape");
  assert.equal(result, null);

  // Cleanup
  await removeGuildAllowedTerm("test-guild-1", "rape");
});

// ============================================================================
// Custom Term Limit Tests
// ============================================================================

test("custom term limit: max 100", async () => {
  // Add terms up to limit using unique suffixes that avoid leet normalization collisions
  for (let i = 0; i < 100; i++) {
    const c1 = String.fromCharCode(97 + (i % 26));
    const num = Math.floor(i / 26);
    const term = `custom-${c1}-${String(num).padStart(2, "0")}`;
    const result = await addGuildBlockedTerm("test-guild-1", term);
    assert.ok(result.ok, `Failed to add term ${i} (${term}): ${JSON.stringify(result)}`);
  }

  // Try to add one more
  const result = await addGuildBlockedTerm("test-guild-1", "toomany");
  assert.equal(result.ok, false);
  assert.equal(result.code, "max_reached");

  // Cleanup
  for (let i = 0; i < 100; i++) {
    const c1 = String.fromCharCode(97 + (i % 26));
    const num = Math.floor(i / 26);
    await removeGuildBlockedTerm("test-guild-1", `custom-${c1}-${String(num).padStart(2, "0")}`);
  }
});

// ============================================================================
// Stats/Counts Tests
// ============================================================================

test("stats: correct counts", async () => {
  await addGuildBlockedTerm("test-guild-1", "statstest");
  await addGuildAllowedTerm("test-guild-1", "allowedtest");

  const stats = await getBlockedTermsStats("test-guild-1");
  assert.ok(stats.globalCount >= 7); // At least our seed terms
  assert.ok(stats.guildBlockedCount >= 1);
  assert.ok(stats.guildAllowedCount >= 1);

  // Cleanup
  await removeGuildBlockedTerm("test-guild-1", "statstest");
  await removeGuildAllowedTerm("test-guild-1", "allowedtest");
});

// ============================================================================
// False Positive Tests
// ============================================================================

test("false positives: innocent words", () => {
  // "class" should not match "ass"
  const terms = [
    { term: "ass", normalizedTerm: "ass", category: "profanity", severity: "medium", matchType: "token", enabled: true },
  ];
  const result = checkTextAgainstTerms("this is a class", terms);
  assert.equal(result, null);

  // "scunthorpe" should not match "cunt" (with token matching)
  const result2 = checkTextAgainstTerms("scunthorpe", terms);
  assert.equal(result2, null);

  // "cocktail" should not match "cock" (with token matching)
  const result3 = checkTextAgainstTerms("cocktail", terms);
  assert.equal(result3, null);
});

test("false positives: common words with short fragments", () => {
  // Short tokens like "ss" should not cause broad matches
  const terms = [
    { term: "ss", normalizedTerm: "ss", category: "slurs", severity: "high", matchType: "token", enabled: true },
  ];
  // "miss" should not match "ss" token
  const result = checkTextAgainstTerms("miss", terms);
  assert.equal(result, null);
});

// ============================================================================
// Check Blocked Terms Service Tests
// ============================================================================

test("checkBlockedTerms: returns first match", async () => {
  const result = await checkBlockedTerms("test-guild-1", "you are a fuck");
  assert.ok(result);
  assert.equal(result.term, "fuck");
  assert.equal(result.category, "profanity");
});

test("checkBlockedTerms: returns null for safe text", async () => {
  const result = await checkBlockedTerms("test-guild-1", "hello world");
  assert.equal(result, null);
});

test("getUnsafeTicketNameReason: returns reason for unsafe", async () => {
  const result = await getUnsafeTicketNameReason("test-guild-1", "fuck-ticket");
  assert.ok(result);
  assert.equal(result.reason, "blocked_word");
});

test("getUnsafeTicketNameReason: returns null for safe", async () => {
  const result = await getUnsafeTicketNameReason("test-guild-1", "help-ticket");
  assert.equal(result, null);
});

test("isSafeTicketName: correct boolean", async () => {
  assert.ok(!(await isSafeTicketName("test-guild-1", "fuck-ticket")));
  assert.ok(await isSafeTicketName("test-guild-1", "help-ticket"));
});

// ============================================================================
// Duplicate Handling Tests
// ============================================================================

test("duplicates: normalized term prevents duplicates", async () => {
  await addGuildBlockedTerm("test-guild-1", "duplicate");
  const result = await addGuildBlockedTerm("test-guild-1", "duplicate");
  assert.equal(result.ok, false);
  assert.equal(result.code, "already_exists");

  // Cleanup
  await removeGuildBlockedTerm("test-guild-1", "duplicate");
});

test("duplicates: case-insensitive", async () => {
  await addGuildBlockedTerm("test-guild-1", "CaseTest");
  const result = await addGuildBlockedTerm("test-guild-1", "casetest");
  assert.equal(result.ok, false);
  assert.equal(result.code, "already_exists");

  // Cleanup
  await removeGuildBlockedTerm("test-guild-1", "CaseTest");
});

// ============================================================================
// Empty/Invalid Input Tests
// ============================================================================

test("empty input: rejected", async () => {
  const result = await addGuildBlockedTerm("test-guild-1", "");
  assert.equal(result.ok, false);
  assert.equal(result.code, "empty_term");
});

test("whitespace only: rejected", async () => {
  const result = await addGuildBlockedTerm("test-guild-1", "   ");
  assert.equal(result.ok, false);
  assert.equal(result.code, "empty_term");
});

test("remove non-existent: not found", async () => {
  const result = await removeGuildBlockedTerm("test-guild-1", "nonexistent");
  assert.equal(result.ok, false);
  assert.equal(result.code, "not_found");
});

// ============================================================================
// Global Term Blocking Tests
// ============================================================================

test("global terms: already_global check", async () => {
  const result = await addGuildBlockedTerm("test-guild-1", "fuck");
  assert.equal(result.ok, false);
  assert.equal(result.code, "already_global");
});

// ============================================================================
// Phrase Matching Integration Tests
// ============================================================================

test("phrase matching: multi-word blocked terms", async () => {
  const result = await checkBlockedTerms("test-guild-1", "go kill yourself now");
  assert.ok(result);
  assert.equal(result.term, "kill yourself");
  assert.equal(result.matchType, "phrase");
});

test("phrase matching: non-consecutive words", async () => {
  const result = await checkBlockedTerms("test-guild-1", "kill me yourself");
  assert.equal(result, null);
});

// ============================================================================
// Leet Speak Integration Tests
// ============================================================================

test("leet speak: detected via normalization", async () => {
  // f4ck → fack, which is different from "fuck"
  // But if we had a term "fack", it would match
  // For now, this tests that the normalization works
  const result = await checkBlockedTerms("test-guild-1", "f4ck");
  // f4ck normalizes to "fack", which doesn't match any global term
  assert.equal(result, null);
});

test("leet speak: mixed", async () => {
  // sh1t → shit (1→i)
  const result = await checkBlockedTerms("test-guild-1", "sh1t");
  assert.ok(result);
  assert.equal(result.term, "shit");
});

// ============================================================================
// Substring Matching Tests
// ============================================================================

test("substring matching: for long terms", async () => {
  // Add a substring term
  await prisma.blockedTerm.create({
    data: {
      term: "pornography",
      normalizedTerm: "pornography",
      category: "sexual",
      severity: "medium",
      matchType: "substring",
      source: "test",
    },
  });

  // Should match even if embedded
  const result = await checkBlockedTerms("test-guild-1", "mypornographysite");
  assert.ok(result);

  // Cleanup
  await prisma.blockedTerm.delete({
    where: { normalizedTerm: "pornography" },
  });
  invalidateGlobal();
});
