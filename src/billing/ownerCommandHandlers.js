const { BILLING_PLANS } = require("./constants");
const {
  OwnerBillingMutationError,
  activatePro,
  customizePro,
  deactivatePro,
  loadOwnerBillingStatus,
  renewPro,
} = require("./ownerBillingService");
const {
  OwnerCommandInputError,
  buildOwnerError,
  buildOwnerInfo,
  buildOwnerSuccess,
  cleanOwnerText,
  formatOwnerDate,
  getOwnerCommandPrefix,
  parseDuration,
  replyOwner,
  resolveAccessibleGuild,
} = require("./ownerCommandUtils");

function getDependencies(options = {}) {
  return {
    activatePro: options.activatePro || activatePro,
    customizePro: options.customizePro || customizePro,
    deactivatePro: options.deactivatePro || deactivatePro,
    loadOwnerBillingStatus:
      options.loadOwnerBillingStatus || loadOwnerBillingStatus,
    renewPro: options.renewPro || renewPro,
    resolveAccessibleGuild:
      options.resolveAccessibleGuild || resolveAccessibleGuild,
  };
}

function getMutationOptions(message, options = {}) {
  return {
    client: options.client,
    discordClient: message.client,
    logger: options.logger || console,
    now: options.now,
    refreshControls: options.refreshControls,
  };
}

function formatPlan(summary) {
  return summary?.planLabel || "Expired";
}

function formatGuild(guild) {
  return `**Guild:** ${cleanOwnerText(guild?.name, 100) || "Unknown guild"} (\`${guild?.id}\`)`;
}

function formatProState(summary) {
  if (!summary?.pro?.startedAt && !summary?.pro?.endsAt) return "Not activated";
  return summary.pro.active ? "Active" : "Expired/inactive";
}

function formatTrialState(summary) {
  if (!summary?.trial?.startedAt && !summary?.trial?.endsAt) return "Not started";
  return summary.trial.active ? "Active" : "Expired";
}

function commandErrorPayload(error) {
  if (error instanceof OwnerCommandInputError || error instanceof OwnerBillingMutationError) {
    return buildOwnerError("Owner billing command rejected", [error.message]);
  }
  return null;
}

async function runOwnerHandler(message, operation) {
  try {
    return await operation();
  } catch (error) {
    const payload = commandErrorPayload(error);
    if (!payload) throw error;
    return replyOwner(message, payload);
  }
}

async function executeActivate(message, args, options = {}) {
  const dependencies = getDependencies(options);
  return runOwnerHandler(message, async () => {
    const guild = await dependencies.resolveAccessibleGuild(message.client, args[0]);
    const result = await dependencies.activatePro(
      guild.id,
      message.author.id,
      getMutationOptions(message, options)
    );

    return replyOwner(
      message,
      buildOwnerSuccess("Pixy Pro activated", [
        formatGuild(guild),
        `**Previous effective plan:** ${formatPlan(result.beforeSummary)}`,
        `**New effective plan:** ${formatPlan(result.afterSummary)}`,
        `**Pro starts:** ${formatOwnerDate(result.after.proStartedAt)}`,
        `**Pro ends:** ${formatOwnerDate(result.after.proEndsAt)}`,
        result.afterSummary.plan === BILLING_PLANS.PARTNER
          ? "Partner remains the effective plan; the new Pro period is preserved underneath it."
          : "The guild now has active Pixy Pro.",
      ])
    );
  });
}

async function executeResub(message, args, options = {}) {
  const dependencies = getDependencies(options);
  return runOwnerHandler(message, async () => {
    const guild = await dependencies.resolveAccessibleGuild(message.client, args[0]);
    const result = await dependencies.renewPro(
      guild.id,
      message.author.id,
      getMutationOptions(message, options)
    );

    return replyOwner(
      message,
      buildOwnerSuccess("Pixy Pro renewed", [
        formatGuild(guild),
        `**Old expiry:** ${formatOwnerDate(result.before.proEndsAt)}`,
        `**New expiry:** ${formatOwnerDate(result.after.proEndsAt)}`,
        `**Effective plan:** ${formatPlan(result.afterSummary)}`,
        result.afterSummary.plan === BILLING_PLANS.PARTNER
          ? "Partner remains effective while the Pro expiry is extended underneath it."
          : "Thirty days were added after the previous Pro expiry.",
      ])
    );
  });
}

async function executeCustom(message, args, options = {}) {
  const dependencies = getDependencies(options);
  return runOwnerHandler(message, async () => {
    const guild = await dependencies.resolveAccessibleGuild(message.client, args[0]);
    const duration = parseDuration(args[1]);
    const result = await dependencies.customizePro(
      guild.id,
      message.author.id,
      duration,
      getMutationOptions(message, options)
    );

    return replyOwner(
      message,
      buildOwnerSuccess("Custom Pixy Pro duration applied", [
        formatGuild(guild),
        `**Normalized duration:** \`${duration.normalized}\` (${duration.days} days)`,
        `**Old expiry:** ${formatOwnerDate(result.before?.proEndsAt)}`,
        `**New expiry:** ${formatOwnerDate(result.after.proEndsAt)}`,
        `**Extension base:** ${result.extensionBase.getTime() === result.now.getTime() ? "Current time" : "Existing active Pro expiry"}`,
        `**Effective plan:** ${formatPlan(result.afterSummary)}`,
        result.afterSummary.plan === BILLING_PLANS.PARTNER
          ? "Partner remains effective while the custom Pro period is stored underneath it."
          : "The custom Pro period is now active.",
      ])
    );
  });
}

async function executeDeactivate(message, args, options = {}) {
  const dependencies = getDependencies(options);
  return runOwnerHandler(message, async () => {
    const guild = await dependencies.resolveAccessibleGuild(message.client, args[0]);
    const result = await dependencies.deactivatePro(
      guild.id,
      message.author.id,
      getMutationOptions(message, options)
    );
    const fallbackLabel = result.afterSummary.plan === BILLING_PLANS.PARTNER
      ? result.afterSummary.fallbackPlanLabel
      : formatPlan(result.afterSummary);

    return replyOwner(
      message,
      buildOwnerSuccess("Pixy Pro deactivated", [
        formatGuild(guild),
        `**Old Pro expiry:** ${formatOwnerDate(result.before.proEndsAt)}`,
        `**Pro ended:** ${formatOwnerDate(result.after.proEndsAt)}`,
        `**Effective plan now:** ${formatPlan(result.afterSummary)}`,
        `**Fallback without Partner:** ${fallbackLabel}`,
        "Trial dates and Partner state were preserved.",
      ])
    );
  });
}

function buildStatusLines(guild, status) {
  const { summary, latestEvent } = status;
  const lines = [formatGuild(guild)];

  if (!summary.initialized) {
    lines.push(
      "**Billing record:** Not initialized",
      "No Trial, Pro, or Partner dates are stored for this guild."
    );
  } else {
    lines.push("**Billing record:** Initialized");
  }

  lines.push(
    `**Effective plan:** ${formatPlan(summary)}`,
    `**Remaining:** ${summary.remainingLabel}`,
    `**Trial:** ${formatTrialState(summary)}`,
    `- Started: ${formatOwnerDate(summary.trial.startedAt)}`,
    `- Ends: ${formatOwnerDate(summary.trial.endsAt)}`,
    `**Pro:** ${formatProState(summary)}`,
    `- Started: ${formatOwnerDate(summary.pro.startedAt)}`,
    `- Ends: ${formatOwnerDate(summary.pro.endsAt)}`,
    `**Partner:** ${summary.partner.active ? "Active" : "Inactive"}`,
    `- Since: ${formatOwnerDate(summary.partner.startedAt)}`
  );

  if (summary.plan === BILLING_PLANS.PARTNER) {
    lines.push(`**Fallback beneath Partner:** ${summary.fallbackPlanLabel}`);
  }

  if (latestEvent) {
    lines.push(
      `**Latest billing event:** \`${cleanOwnerText(latestEvent.action, 64)}\``,
      `- Actor: \`${cleanOwnerText(latestEvent.actorUserId, 32)}\``,
      `- At: ${formatOwnerDate(latestEvent.createdAt)}`
    );
  } else {
    lines.push("**Latest billing event:** None recorded");
  }

  return lines;
}

async function executeStatus(message, args, options = {}) {
  const dependencies = getDependencies(options);
  return runOwnerHandler(message, async () => {
    const guild = await dependencies.resolveAccessibleGuild(message.client, args[0]);
    const status = await dependencies.loadOwnerBillingStatus(guild.id, {
      client: options.client,
      now: options.now,
    });

    return replyOwner(
      message,
      buildOwnerInfo("Pixy billing status", buildStatusLines(guild, status))
    );
  });
}

function buildOwnerHelpPayload(message) {
  const prefix = getOwnerCommandPrefix(message);
  return buildOwnerInfo("Pixy owner billing commands", [
    `\`${prefix}help\` — DM this owner command reference when possible.`,
    `\`${prefix}activate <guild-id>\` — Start 30 days of Pro from now.`,
    `\`${prefix}resub <guild-id>\` — Add 30 days after an active Pro expiry.`,
    `\`${prefix}custom <guild-id> <duration>\` — Add a custom Pro duration from the active expiry, or from now when Pro is inactive.`,
    `\`${prefix}deactivate <guild-id>\` — End active Pro immediately while preserving Trial and Partner state.`,
    `\`${prefix}status <guild-id>\` — Show the complete billing state and latest audit event.`,
    "**Partner commands (Phase 10 operator syntax)**",
    `\`${prefix}partner add <guild-id>\` — Enable Partner while preserving Trial and Pro dates.`,
    `\`${prefix}partner remove <guild-id>\` — Disable Partner and reveal the fallback plan.`,
    `\`${prefix}partner list\` — List active Partner guilds.`,
    "**Duration units**",
    "`d` = days, `w` = 7-day weeks, `m` = 30-day months, `y` = 365-day years.",
    "Examples: `14d`, `8w`, `6m`, `1y`. Maximum: 3,650 days (10 years).",
  ]);
}

async function executeHelp(message) {
  const payload = buildOwnerHelpPayload(message);
  try {
    await message.author.send(payload);
    return { delivered: "dm" };
  } catch {
    await message.reply(payload);
    return { delivered: "channel" };
  }
}

module.exports = {
  buildOwnerHelpPayload,
  buildStatusLines,
  commandErrorPayload,
  executeActivate,
  executeCustom,
  executeDeactivate,
  executeHelp,
  executeResub,
  executeStatus,
  formatGuild,
  formatPlan,
  getDependencies,
  getMutationOptions,
  runOwnerHandler,
};
