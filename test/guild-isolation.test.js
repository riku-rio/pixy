const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "pixy-guild-isolation-"));
const databasePath = path.join(temporaryDirectory, "isolation.db");
const originalDatabaseUrl = process.env.DATABASE_URL;
let prisma;

function runPrismaCommand(args) {
  execFileSync(process.execPath, [require.resolve("prisma/build/index.js"), ...args], {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: `file:${databasePath}` },
    stdio: "pipe",
  });
}

async function deleteGuildData(guildId) {
  return prisma.$transaction([
    prisma.aiUsageLog.deleteMany({ where: { guildId } }),
    prisma.ticketChannel.deleteMany({ where: { guildId } }),
    prisma.learnedAnswer.deleteMany({ where: { guildId } }),
    prisma.adminRoute.deleteMany({ where: { guildId } }),
    prisma.guildBlockedTerm.deleteMany({ where: { guildId } }),
    prisma.guildAllowedTerm.deleteMany({ where: { guildId } }),
    prisma.guildSetting.deleteMany({ where: { guildId } }),
    prisma.guildConfig.deleteMany({ where: { guildId } }),
  ]);
}

before(async () => {
  process.env.DATABASE_URL = `file:${databasePath}`;
  runPrismaCommand(["db", "push", "--schema", "prisma/schema.prisma"]);
  const prismaModulePath = require.resolve("../src/config/prisma");
  delete require.cache[prismaModulePath];
  ({ prisma } = require("../src/config/prisma"));

  await prisma.guildConfig.createMany({ data: [
    { guildId: "guild-alpha", ticketCategoryId: "category-alpha" },
    { guildId: "guild-beta", ticketCategoryId: "category-beta" },
  ] });
  await prisma.guildSetting.createMany({ data: [
    { guildId: "guild-alpha", groqApiKeyEncrypted: "v1:alpha-placeholder:tag:ciphertext", aiModel: "openai/gpt-oss-20b" },
    { guildId: "guild-beta", groqApiKeyEncrypted: "v1:beta-placeholder:tag:ciphertext", aiModel: "openai/gpt-oss-120b" },
  ] });
  await prisma.learnedAnswer.createMany({ data: [
    { guildId: "guild-alpha", type: "qna", question: "Alpha question", answer: "Alpha answer" },
    { guildId: "guild-beta", type: "qna", question: "Beta question", answer: "Beta answer" },
  ] });
  await prisma.adminRoute.createMany({ data: [
    { guildId: "guild-alpha", roleId: "role-alpha", description: "Alpha support route" },
    { guildId: "guild-beta", roleId: "role-beta", description: "Beta support route" },
  ] });
  await prisma.ticketChannel.createMany({ data: [
    { guildId: "guild-alpha", channelId: "channel-alpha" },
    { guildId: "guild-beta", channelId: "channel-beta" },
  ] });
  await prisma.aiUsageLog.createMany({ data: [
    { guildId: "guild-alpha", channelId: "channel-alpha", provider: "groq", status: "success" },
    { guildId: "guild-beta", channelId: "channel-beta", provider: "groq", status: "success" },
  ] });
});

after(async () => {
  if (prisma) await prisma.$disconnect();
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test("deleting one guild removes its encrypted settings without affecting another guild", async () => {
  await deleteGuildData("guild-alpha");
  const modelNames = ["guildConfig", "guildSetting", "learnedAnswer", "adminRoute", "ticketChannel", "aiUsageLog"];
  const zeroExpectedModels = ["guildBlockedTerm", "guildAllowedTerm"];
  for (const modelName of modelNames) {
    assert.equal(await prisma[modelName].count({ where: { guildId: "guild-alpha" } }), 0);
    assert.equal(await prisma[modelName].count({ where: { guildId: "guild-beta" } }), 1);
  }
  for (const modelName of zeroExpectedModels) {
    assert.equal(await prisma[modelName].count({ where: { guildId: "guild-alpha" } }), 0);
    assert.equal(await prisma[modelName].count({ where: { guildId: "guild-beta" } }), 0);
  }
  const betaSetting = await prisma.guildSetting.findUnique({ where: { guildId: "guild-beta" } });
  assert.equal(betaSetting.aiModel, "openai/gpt-oss-120b");
  assert.equal(betaSetting.groqApiKeyEncrypted.startsWith("v1:"), true);
});
