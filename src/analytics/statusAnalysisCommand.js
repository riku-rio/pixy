const { BILLING_PLANS } = require("../billing/constants");
const {
  buildOwnerResponsePages,
  replyOwnerPages,
} = require("../billing/ownerCommandUtils");
const { loadStatusAnalysis } = require("./statusAnalysisService");

function formatNumber(value, digits = 2) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0";
  return number.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function formatPercent(value) {
  const number = Number(value || 0);
  const sign = number > 0 ? "+" : "";
  return `${sign}${formatNumber(number, 1)}%`;
}

function buildAnalysisLines(analysis) {
  const { config, guilds, plans, usage, historyDays, growth, decision } = analysis;
  const current = usage.currentConcurrency;
  const previous = usage.previousConcurrency;

  return [
    "**Installed servers**",
    `- **Total connected:** ${formatNumber(guilds.connected, 0)}`,
    `- **Billing initialized:** ${formatNumber(guilds.billingInitialized, 0)}`,
    `- **Billing not initialized:** ${formatNumber(guilds.billingUninitialized, 0)}`,
    "**Effective subscriptions now**",
    `- **Pro:** ${formatNumber(plans[BILLING_PLANS.PRO], 0)}`,
    `- **Partner:** ${formatNumber(plans[BILLING_PLANS.PARTNER], 0)}`,
    `- **Trial:** ${formatNumber(plans[BILLING_PLANS.TRIAL], 0)}`,
    `- **Expired:** ${formatNumber(plans[BILLING_PLANS.EXPIRED], 0)}`,
    "**Ticket usage**",
    `- **Using AI now:** ${formatNumber(usage.activeGuildsNow, 0)} server(s) and ${formatNumber(usage.activeAiEventsNow, 0)} AI request(s) in the last ${config.activeMinutes} minutes`,
    `- **Open ticket channels:** ${formatNumber(usage.openTicketChannels, 0)} across ${formatNumber(usage.openTicketGuilds, 0)} server(s)`,
    `- **Average simultaneous servers (${config.comparisonDays}d):** ${formatNumber(current.averageConcurrentGuilds)}`,
    `- **Average while activity exists:** ${formatNumber(current.averageConcurrentWhenActive)}`,
    `- **Peak simultaneous servers:** ${formatNumber(current.peakConcurrentGuilds, 0)}`,
    `- **Active time coverage:** ${formatNumber(current.activeCoveragePercent, 1)}%`,
    "**Growth assessment**",
    `- **New initialized servers:** ${formatNumber(guilds.newCurrentPeriod, 0)} this period vs ${formatNumber(guilds.newPreviousPeriod, 0)} in the previous ${config.comparisonDays} days`,
    `- **Server acquisition growth:** ${formatPercent(growth.acquisitionGrowthPercent)}`,
    `- **Simultaneous usage growth:** ${formatPercent(growth.usageGrowthPercent)} (${formatNumber(current.averageConcurrentGuilds)} vs ${formatNumber(previous.averageConcurrentGuilds)})`,
    `- **Combined growth:** ${formatPercent(growth.scorePercent)} → **${growth.level}**`,
    `- **Confidence:** ${growth.confidence} (${formatNumber(historyDays, 1)} day(s) of available history)`,
    "**Project / VPS decision**",
    `- **${decision.label}** — ${decision.summary}`,
    `- ${decision.reason}`,
    "**Note — calculation method**",
    "- Plans use this priority: Partner > active Pro > active Trial > Expired.",
    "- A connected server without billing initialization is counted as Expired and is shown separately as not initialized.",
    `- “Using AI now” means a distinct connected server wrote an AiUsageLog entry during the last ${config.activeMinutes} minutes.`,
    `- Simultaneous usage is measured in ${config.bucketMinutes}-minute buckets. The average includes buckets with zero activity, so it does not inflate usage.`,
    `- Growth compares the latest ${config.comparisonDays} days with the previous ${config.comparisonDays} days.`,
    "- Combined growth = 60% new-server growth + 40% simultaneous-usage growth. Each input is capped between -100% and +200% to control tiny-base spikes.",
    "- High growth requires at least +25% combined growth plus meaningful scale. Medium requires at least +5% plus smaller meaningful scale. Otherwise it is Low.",
    "- YES requires at least 3 active Pro servers, meaningful simultaneous usage, and Medium or High growth. Partner and Trial are not treated as paid Pro.",
    "- NOT YET means there is some traction but one or more validation gates are missing. NO means current paid adoption and usage do not justify the next hosting cost.",
    "- The decision is available at any time. Confidence is Low before 7 days, Medium from 7 days, and High from 30 days; it does not block the result.",
  ];
}

async function executeStatusAnalysis(message, options = {}) {
  const analysis = await (options.loadStatusAnalysis || loadStatusAnalysis)({
    client: options.client,
    discordClient: message.client,
    now: options.now,
  });
  const tone = analysis.decision.code === "yes"
    ? "success"
    : analysis.decision.code === "not_yet"
      ? "warning"
      : "error";

  return replyOwnerPages(
    message,
    buildOwnerResponsePages({
      title: "Pixy status analysis",
      tone,
      lines: buildAnalysisLines(analysis),
    })
  );
}

module.exports = {
  buildAnalysisLines,
  executeStatusAnalysis,
  formatNumber,
  formatPercent,
};
