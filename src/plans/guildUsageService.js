const { prisma } = require("../config/prisma");
const { getGuildPlanStatus } = require("./guildPlanService");
const { toUtcDayKey, getNextUtcReset } = require("./planConstants");

async function getGuildDailyUsage(guildId, now = new Date()) {
  const dayKey = toUtcDayKey(now);
  const [plan, row] = await Promise.all([
    getGuildPlanStatus(guildId, now),
    prisma.guildDailyAiUsage.findUnique({
      where: { guildId_dayKey: { guildId, dayKey } },
    }),
  ]);
  const used = row?.acceptedRequests || 0;
  return {
    ...plan,
    dayKey,
    used,
    remaining: Math.max(0, plan.dailyLimit - used),
    resetAt: getNextUtcReset(now),
  };
}

async function reserveGuildAiRequest(guildId, now = new Date()) {
  const dayKey = toUtcDayKey(now);
  const plan = await getGuildPlanStatus(guildId, now);

  await prisma.guildDailyAiUsage.upsert({
    where: { guildId_dayKey: { guildId, dayKey } },
    create: { guildId, dayKey, acceptedRequests: 0 },
    update: {},
  });

  const updated = await prisma.guildDailyAiUsage.updateMany({
    where: {
      guildId,
      dayKey,
      acceptedRequests: { lt: plan.dailyLimit },
    },
    data: { acceptedRequests: { increment: 1 } },
  });

  const usage = await getGuildDailyUsage(guildId, now);
  return { ...usage, allowed: updated.count === 1 };
}

module.exports = { getGuildDailyUsage, reserveGuildAiRequest };
