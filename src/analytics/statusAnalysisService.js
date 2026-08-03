const { BILLING_PLANS, DAY_MS } = require("../billing/constants");
const { buildBillingSummary } = require("../billing/billingService");

const STATUS_ANALYSIS_CONFIG = Object.freeze({
  activeMinutes: 15,
  bucketMinutes: 15,
  comparisonDays: 7,
});

function getDefaultPrisma() {
  return require("../config/prisma").prisma;
}

function toNumber(value) {
  const result = typeof value === "bigint" ? Number(value) : Number(value || 0);
  return Number.isFinite(result) ? result : 0;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  const result = Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
  return Object.is(result, -0) ? 0 : result;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, toNumber(value)));
}

function calculatePercentChange(current, previous) {
  const currentValue = toNumber(current);
  const previousValue = toNumber(previous);

  if (previousValue <= 0) return currentValue > 0 ? 100 : 0;
  return ((currentValue - previousValue) / previousValue) * 100;
}

function summarizeConcurrencyBuckets(rows, start, end, options = {}) {
  const bucketMinutes = options.bucketMinutes || STATUS_ANALYSIS_CONFIG.bucketMinutes;
  const bucketMs = bucketMinutes * 60 * 1000;
  const totalBuckets = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / bucketMs));
  const normalizedRows = rows.map((row) => ({
    guildCount: toNumber(row.guildCount),
    eventCount: toNumber(row.eventCount),
  }));
  const activeRows = normalizedRows.filter((row) => row.guildCount > 0);
  const guildCountSum = normalizedRows.reduce((sum, row) => sum + row.guildCount, 0);

  return {
    totalBuckets,
    activeBuckets: activeRows.length,
    eventCount: normalizedRows.reduce((sum, row) => sum + row.eventCount, 0),
    averageConcurrentGuilds: round(guildCountSum / totalBuckets),
    averageConcurrentWhenActive: activeRows.length
      ? round(guildCountSum / activeRows.length)
      : 0,
    peakConcurrentGuilds: normalizedRows.reduce(
      (peak, row) => Math.max(peak, row.guildCount),
      0
    ),
    activeCoveragePercent: round((activeRows.length / totalBuckets) * 100, 1),
  };
}

function calculateGrowthAssessment(input) {
  const acquisitionGrowthPercent = clamp(
    calculatePercentChange(input.newGuildsCurrent, input.newGuildsPrevious),
    -100,
    200
  );
  const usageGrowthPercent = clamp(
    calculatePercentChange(input.concurrentCurrent, input.concurrentPrevious),
    -100,
    200
  );
  const scorePercent = round(
    acquisitionGrowthPercent * 0.6 + usageGrowthPercent * 0.4,
    1
  );
  const highScale = input.newGuildsCurrent >= 5 || input.concurrentCurrent >= 2;
  const mediumScale = input.newGuildsCurrent >= 2 || input.concurrentCurrent >= 0.5;
  const level = scorePercent >= 25 && highScale
    ? "High"
    : scorePercent >= 5 && mediumScale
      ? "Medium"
      : "Low";
  const historyDays = toNumber(input.historyDays);
  const confidence = historyDays >= 30
    ? "High"
    : historyDays >= 7
      ? "Medium"
      : "Low";

  return {
    acquisitionGrowthPercent: round(acquisitionGrowthPercent, 1),
    usageGrowthPercent: round(usageGrowthPercent, 1),
    scorePercent,
    level,
    confidence,
  };
}

function buildVpsDecision(input) {
  const sustainableUsage = input.averageConcurrentGuilds >= 0.5 || input.activeGuildsNow >= 2;
  const paidValidation = input.proGuilds >= 3;
  const positiveGrowth = input.growthLevel === "Medium" || input.growthLevel === "High";
  const strongEnough = sustainableUsage && paidValidation && positiveGrowth;

  if (strongEnough) {
    return {
      code: "yes",
      label: "YES",
      summary: "Continue the project and prepare a small VPS for the next hosting stage.",
      reason: "Paid Pro adoption, concurrent usage, and growth are all above the minimum validation gates.",
    };
  }

  const hasTraction =
    input.proGuilds > 0 ||
    input.activeGuildsNow > 0 ||
    input.averageConcurrentGuilds >= 0.25 ||
    input.growthLevel !== "Low";

  if (hasTraction) {
    return {
      code: "not_yet",
      label: "NOT YET",
      summary: "Keep marketing and collecting data before committing to the next VPS.",
      reason: "The project has traction, but one or more paid-adoption, usage, or growth gates are still missing.",
    };
  }

  return {
    code: "no",
    label: "NO",
    summary: "Do not commit to a paid VPS based on the current results.",
    reason: "Current paid adoption and real concurrent usage do not yet validate continued infrastructure spending.",
  };
}

async function loadConcurrencyBuckets(client, start, end, guildIds, options = {}) {
  if (!guildIds.length) return [];
  const bucketSeconds = (options.bucketMinutes || STATUS_ANALYSIS_CONFIG.bucketMinutes) * 60;
  const placeholders = guildIds.map(() => "?").join(", ");
  const query = `SELECT FLOOR(UNIX_TIMESTAMP(\`createdAt\`) / ?) AS \`bucketId\`,
    COUNT(DISTINCT \`guildId\`) AS \`guildCount\`, COUNT(*) AS \`eventCount\`
    FROM \`AiUsageLog\`
    WHERE \`createdAt\` >= ? AND \`createdAt\` < ?
      AND \`guildId\` IN (${placeholders})
    GROUP BY \`bucketId\`
    ORDER BY \`bucketId\` ASC`;

  return client.$queryRawUnsafe(query, bucketSeconds, start, end, ...guildIds);
}

async function loadStatusAnalysis(options = {}) {
  const client = options.client || getDefaultPrisma();
  const discordClient = options.discordClient;
  const now = options.now instanceof Date
    ? new Date(options.now.getTime())
    : new Date(options.now || Date.now());

  if (Number.isNaN(now.getTime())) throw new TypeError("A valid current time is required.");

  const guildIds = [...(discordClient?.guilds?.cache?.keys?.() || [])].map(String);
  const comparisonMs = STATUS_ANALYSIS_CONFIG.comparisonDays * DAY_MS;
  const currentStart = new Date(now.getTime() - comparisonMs);
  const previousStart = new Date(currentStart.getTime() - comparisonMs);
  const activeSince = new Date(
    now.getTime() - STATUS_ANALYSIS_CONFIG.activeMinutes * 60 * 1000
  );
  const connectedWhere = { guildId: { in: guildIds } };

  const [
    billingRows,
    activeGuildRows,
    activeEvents,
    openGuildRows,
    openTickets,
    currentBucketRows,
    previousBucketRows,
    newGuildsCurrent,
    newGuildsPrevious,
    firstBilling,
    firstUsage,
  ] = await Promise.all([
    guildIds.length
      ? client.guildBilling.findMany({ where: connectedWhere })
      : Promise.resolve([]),
    guildIds.length
      ? client.aiUsageLog.findMany({
          where: { ...connectedWhere, createdAt: { gte: activeSince, lte: now } },
          distinct: ["guildId"],
          select: { guildId: true },
        })
      : Promise.resolve([]),
    guildIds.length
      ? client.aiUsageLog.count({
          where: { ...connectedWhere, createdAt: { gte: activeSince, lte: now } },
        })
      : Promise.resolve(0),
    guildIds.length
      ? client.ticketChannel.findMany({
          where: { ...connectedWhere, closed: false },
          distinct: ["guildId"],
          select: { guildId: true },
        })
      : Promise.resolve([]),
    guildIds.length
      ? client.ticketChannel.count({ where: { ...connectedWhere, closed: false } })
      : Promise.resolve(0),
    loadConcurrencyBuckets(client, currentStart, now, guildIds),
    loadConcurrencyBuckets(client, previousStart, currentStart, guildIds),
    guildIds.length
      ? client.guildBilling.count({
          where: { ...connectedWhere, createdAt: { gte: currentStart, lt: now } },
        })
      : Promise.resolve(0),
    guildIds.length
      ? client.guildBilling.count({
          where: { ...connectedWhere, createdAt: { gte: previousStart, lt: currentStart } },
        })
      : Promise.resolve(0),
    guildIds.length
      ? client.guildBilling.findFirst({
          where: connectedWhere,
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        })
      : Promise.resolve(null),
    guildIds.length
      ? client.aiUsageLog.findFirst({
          where: connectedWhere,
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        })
      : Promise.resolve(null),
  ]);

  const billingByGuild = new Map(
    billingRows.map((row) => [String(row.guildId), row])
  );
  const plans = {
    [BILLING_PLANS.PRO]: 0,
    [BILLING_PLANS.PARTNER]: 0,
    [BILLING_PLANS.TRIAL]: 0,
    [BILLING_PLANS.EXPIRED]: 0,
  };

  for (const guildId of guildIds) {
    const summary = buildBillingSummary(billingByGuild.get(guildId) || null, { now });
    plans[summary.plan] += 1;
  }

  const currentConcurrency = summarizeConcurrencyBuckets(
    currentBucketRows,
    currentStart,
    now
  );
  const previousConcurrency = summarizeConcurrencyBuckets(
    previousBucketRows,
    previousStart,
    currentStart
  );
  const firstDates = [firstBilling?.createdAt, firstUsage?.createdAt]
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);
  const historyDays = firstDates.length
    ? round((now.getTime() - Math.min(...firstDates)) / DAY_MS, 1)
    : 0;
  const growth = calculateGrowthAssessment({
    newGuildsCurrent,
    newGuildsPrevious,
    concurrentCurrent: currentConcurrency.averageConcurrentGuilds,
    concurrentPrevious: previousConcurrency.averageConcurrentGuilds,
    historyDays,
  });
  const decision = buildVpsDecision({
    proGuilds: plans[BILLING_PLANS.PRO],
    activeGuildsNow: activeGuildRows.length,
    averageConcurrentGuilds: currentConcurrency.averageConcurrentGuilds,
    growthLevel: growth.level,
  });

  return {
    generatedAt: now,
    config: STATUS_ANALYSIS_CONFIG,
    guilds: {
      connected: guildIds.length,
      billingInitialized: billingRows.length,
      billingUninitialized: Math.max(0, guildIds.length - billingRows.length),
      newCurrentPeriod: newGuildsCurrent,
      newPreviousPeriod: newGuildsPrevious,
    },
    plans,
    usage: {
      activeGuildsNow: activeGuildRows.length,
      activeAiEventsNow: activeEvents,
      openTicketGuilds: openGuildRows.length,
      openTicketChannels: openTickets,
      currentConcurrency,
      previousConcurrency,
    },
    historyDays,
    growth,
    decision,
  };
}

module.exports = {
  STATUS_ANALYSIS_CONFIG,
  buildVpsDecision,
  calculateGrowthAssessment,
  calculatePercentChange,
  loadStatusAnalysis,
  summarizeConcurrencyBuckets,
};
