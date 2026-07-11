const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), "pixy-guild-isolation-")
);
const databasePath = path.join(temporaryDirectory, "isolation.db");

const originalDatabaseUrl = process.env.DATABASE_URL;

let prisma;

function runPrismaCommand(args) {
  execFileSync(process.execPath, [require.resolve("prisma/build/index.js"), ...args], {
    cwd: projectRoot,
    env: {
      ...process.env,
      DATABASE_URL: `file:${databasePath}`,
    },
    stdio: "pipe",
  });
}

async function deleteGuildData(guildId) {
  return prisma.$transaction([
    prisma.aiUsageLog.deleteMany({
      where: { guildId },
    }),
    prisma.ticketChannel.deleteMany({
      where: { guildId },
    }),
    prisma.learnedAnswer.deleteMany({
      where: { guildId },
    }),
    prisma.adminRoute.deleteMany({
      where: { guildId },
    }),
    prisma.guildConfig.deleteMany({
      where: { guildId },
    }),
  ]);
}

before(async () => {
  process.env.DATABASE_URL = `file:${databasePath}`;

  runPrismaCommand([
    "db",
    "push",
    "--schema",
    "prisma/schema.prisma",
  ]);

  const prismaModulePath = require.resolve("../src/config/prisma");
  delete require.cache[prismaModulePath];

  ({ prisma } = require("../src/config/prisma"));

  await prisma.guildConfig.createMany({
    data: [
      {
        guildId: "guild-alpha",
        ticketCategoryId: "category-alpha",
      },
      {
        guildId: "guild-beta",
        ticketCategoryId: "category-beta",
      },
    ],
  });

  await prisma.learnedAnswer.createMany({
    data: [
      {
        guildId: "guild-alpha",
        type: "qna",
        question: "Alpha question",
        answer: "Alpha answer",
      },
      {
        guildId: "guild-beta",
        type: "qna",
        question: "Beta question",
        answer: "Beta answer",
      },
    ],
  });

  await prisma.adminRoute.createMany({
    data: [
      {
        guildId: "guild-alpha",
        roleId: "role-alpha",
        description: "Alpha support route",
      },
      {
        guildId: "guild-beta",
        roleId: "role-beta",
        description: "Beta support route",
      },
    ],
  });

  await prisma.ticketChannel.createMany({
    data: [
      {
        guildId: "guild-alpha",
        channelId: "channel-alpha",
      },
      {
        guildId: "guild-beta",
        channelId: "channel-beta",
      },
    ],
  });

  await prisma.aiUsageLog.createMany({
    data: [
      {
        guildId: "guild-alpha",
        channelId: "channel-alpha",
        provider: "groq",
        status: "success",
      },
      {
        guildId: "guild-beta",
        channelId: "channel-beta",
        provider: "groq",
        status: "success",
      },
    ],
  });
});

after(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }

  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }

  fs.rmSync(temporaryDirectory, {
    recursive: true,
    force: true,
  });
});

test("deleting one guild does not delete another guild's data", async () => {
  await deleteGuildData("guild-alpha");

  const alphaCounts = {
    config: await prisma.guildConfig.count({
      where: { guildId: "guild-alpha" },
    }),
    learnedAnswers: await prisma.learnedAnswer.count({
      where: { guildId: "guild-alpha" },
    }),
    adminRoutes: await prisma.adminRoute.count({
      where: { guildId: "guild-alpha" },
    }),
    ticketChannels: await prisma.ticketChannel.count({
      where: { guildId: "guild-alpha" },
    }),
    usageLogs: await prisma.aiUsageLog.count({
      where: { guildId: "guild-alpha" },
    }),
  };

  assert.deepEqual(alphaCounts, {
    config: 0,
    learnedAnswers: 0,
    adminRoutes: 0,
    ticketChannels: 0,
    usageLogs: 0,
  });

  const betaCounts = {
    config: await prisma.guildConfig.count({
      where: { guildId: "guild-beta" },
    }),
    learnedAnswers: await prisma.learnedAnswer.count({
      where: { guildId: "guild-beta" },
    }),
    adminRoutes: await prisma.adminRoute.count({
      where: { guildId: "guild-beta" },
    }),
    ticketChannels: await prisma.ticketChannel.count({
      where: { guildId: "guild-beta" },
    }),
    usageLogs: await prisma.aiUsageLog.count({
      where: { guildId: "guild-beta" },
    }),
  };

  assert.deepEqual(betaCounts, {
    config: 1,
    learnedAnswers: 1,
    adminRoutes: 1,
    ticketChannels: 1,
    usageLogs: 1,
  });

  const betaKnowledge = await prisma.learnedAnswer.findFirst({
    where: {
      guildId: "guild-beta",
    },
  });

  assert.equal(betaKnowledge.question, "Beta question");
  assert.equal(betaKnowledge.answer, "Beta answer");
});

