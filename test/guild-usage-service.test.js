const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "pixy-usage-"));
const databasePath = path.join(temporaryDirectory, "usage.db");
const originalDatabaseUrl = process.env.DATABASE_URL;
let prisma;
let reserveGuildAiRequest;
let activateGuildTrial;

function runPrisma(args) {
  execFileSync(process.execPath, [require.resolve("prisma/build/index.js"), ...args], {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: `file:${databasePath}` },
    stdio: "pipe",
  });
}

before(async () => {
  process.env.DATABASE_URL = `file:${databasePath}`;
  runPrisma(["db", "push", "--schema", "prisma/schema.prisma"]);
  for (const modulePath of [
    "../src/config/prisma",
    "../src/plans/guildPlanService",
    "../src/plans/guildUsageService",
  ]) {
    delete require.cache[require.resolve(modulePath)];
  }
  ({ prisma } = require("../src/config/prisma"));
  ({ reserveGuildAiRequest } = require("../src/plans/guildUsageService"));
  ({ activateGuildTrial } = require("../src/plans/guildPlanService"));
});

after(async () => {
  if (prisma) await prisma.$disconnect();
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test("free guild denies request 101 atomically", async () => {
  const guildId = "free-guild";
  const now = new Date("2026-07-18T12:00:00.000Z");
  await prisma.guildSetting.create({ data: { guildId } });
  await prisma.guildDailyAiUsage.create({ data: { guildId, dayKey: "2026-07-18", acceptedRequests: 99 } });

  const results = await Promise.all([
    reserveGuildAiRequest(guildId, now),
    reserveGuildAiRequest(guildId, now),
  ]);

  assert.equal(results.filter((result) => result.allowed).length, 1);
  assert.equal(await prisma.guildDailyAiUsage.findUnique({ where: { guildId_dayKey: { guildId, dayKey: "2026-07-18" } } }).then((row) => row.acceptedRequests), 100);
});

test("active trial increases the daily allowance to 1000", async () => {
  const guildId = "trial-guild";
  const now = new Date("2026-07-18T12:00:00.000Z");
  await prisma.guildSetting.create({ data: { guildId, groqApiKeyEncrypted: "v1:test:test:test" } });
  const activation = await activateGuildTrial(guildId, now);
  assert.equal(activation.ok, true);

  await prisma.guildDailyAiUsage.create({ data: { guildId, dayKey: "2026-07-18", acceptedRequests: 999 } });
  const allowed = await reserveGuildAiRequest(guildId, now);
  const denied = await reserveGuildAiRequest(guildId, now);
  assert.equal(allowed.allowed, true);
  assert.equal(denied.allowed, false);
  assert.equal(denied.dailyLimit, 1000);
});

test("usage resets on the next UTC day", async () => {
  const guildId = "reset-guild";
  await prisma.guildSetting.create({ data: { guildId } });
  await prisma.guildDailyAiUsage.create({ data: { guildId, dayKey: "2026-07-18", acceptedRequests: 100 } });
  const nextDay = await reserveGuildAiRequest(guildId, new Date("2026-07-19T00:00:00.000Z"));
  assert.equal(nextDay.allowed, true);
  assert.equal(nextDay.used, 1);
});
