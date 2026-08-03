const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildVpsDecision,
  calculateGrowthAssessment,
  summarizeConcurrencyBuckets,
} = require("../src/analytics/statusAnalysisService");
const {
  buildAnalysisLines,
} = require("../src/analytics/statusAnalysisCommand");
const statusCommand = require("../src/prefix/status");

function makeAnalysis(overrides = {}) {
  return {
    config: {
      activeMinutes: 15,
      bucketMinutes: 15,
      comparisonDays: 7,
    },
    guilds: {
      connected: 20,
      billingInitialized: 18,
      billingUninitialized: 2,
      newCurrentPeriod: 6,
      newPreviousPeriod: 3,
    },
    plans: {
      pro: 4,
      partner: 2,
      trial: 5,
      expired: 9,
    },
    usage: {
      activeGuildsNow: 3,
      activeAiEventsNow: 12,
      openTicketGuilds: 5,
      openTicketChannels: 9,
      currentConcurrency: {
        totalBuckets: 672,
        activeBuckets: 100,
        eventCount: 450,
        averageConcurrentGuilds: 1.25,
        averageConcurrentWhenActive: 4.2,
        peakConcurrentGuilds: 9,
        activeCoveragePercent: 29.8,
      },
      previousConcurrency: {
        averageConcurrentGuilds: 0.8,
      },
    },
    historyDays: 21,
    growth: {
      acquisitionGrowthPercent: 100,
      usageGrowthPercent: 56.3,
      scorePercent: 82.5,
      level: "High",
      confidence: "Medium",
    },
    decision: {
      code: "yes",
      label: "YES",
      summary: "Continue the project and prepare a small VPS.",
      reason: "All validation gates passed.",
    },
    ...overrides,
  };
}

test("status remains owner-only and accepts either guild ID or analyze", () => {
  assert.equal(statusCommand.ownerOnly, true);
  assert.equal(statusCommand.minArgs, 1);
  assert.equal(statusCommand.maxArgs, 1);
  assert.equal(statusCommand.usage, "status <guild-id|analyze>");
});

test("concurrency average includes zero-activity buckets", () => {
  const start = new Date("2026-08-03T10:00:00.000Z");
  const end = new Date("2026-08-03T11:00:00.000Z");
  const result = summarizeConcurrencyBuckets(
    [
      { guildCount: 2, eventCount: 5 },
      { guildCount: 1, eventCount: 2 },
    ],
    start,
    end
  );

  assert.equal(result.totalBuckets, 4);
  assert.equal(result.activeBuckets, 2);
  assert.equal(result.averageConcurrentGuilds, 0.75);
  assert.equal(result.averageConcurrentWhenActive, 1.5);
  assert.equal(result.peakConcurrentGuilds, 2);
});

test("growth level uses both percentages and minimum scale", () => {
  const high = calculateGrowthAssessment({
    newGuildsCurrent: 8,
    newGuildsPrevious: 4,
    concurrentCurrent: 3,
    concurrentPrevious: 1,
    historyDays: 35,
  });
  assert.equal(high.level, "High");
  assert.equal(high.confidence, "High");

  const medium = calculateGrowthAssessment({
    newGuildsCurrent: 2,
    newGuildsPrevious: 1,
    concurrentCurrent: 0.5,
    concurrentPrevious: 0.4,
    historyDays: 10,
  });
  assert.equal(medium.level, "Medium");
  assert.equal(medium.confidence, "Medium");

  const early = calculateGrowthAssessment({
    newGuildsCurrent: 6,
    newGuildsPrevious: 2,
    concurrentCurrent: 2,
    concurrentPrevious: 0.5,
    historyDays: 2,
  });
  assert.equal(early.level, "High");
  assert.equal(early.confidence, "Low");
});

test("VPS decision is available at any age and does not require 90 days", () => {
  const yes = buildVpsDecision({
    proGuilds: 3,
    activeGuildsNow: 2,
    averageConcurrentGuilds: 0.6,
    growthLevel: "Medium",
  });
  assert.equal(yes.code, "yes");

  const notYet = buildVpsDecision({
    proGuilds: 1,
    activeGuildsNow: 1,
    averageConcurrentGuilds: 0.4,
    growthLevel: "Medium",
  });
  assert.equal(notYet.code, "not_yet");

  const no = buildVpsDecision({
    proGuilds: 0,
    activeGuildsNow: 0,
    averageConcurrentGuilds: 0,
    growthLevel: "Low",
  });
  assert.equal(no.code, "no");
});

test("analysis output includes plans, usage, formula note, confidence, and decision", () => {
  const content = buildAnalysisLines(makeAnalysis()).join("\n");

  assert.match(content, /Pro:\*\* 4/);
  assert.match(content, /Partner:\*\* 2/);
  assert.match(content, /Average simultaneous servers/);
  assert.match(content, /Combined growth/);
  assert.match(content, /Confidence/);
  assert.match(content, /Project \/ VPS decision/);
  assert.match(content, /\*\*YES\*\*/);
  assert.match(content, /60% new-server growth \+ 40% simultaneous-usage growth/);
  assert.match(content, /available at any time/i);
});
