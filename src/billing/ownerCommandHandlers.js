const { BILLING_PLANS } = require("./constants");
const {
  OwnerBillingMutationError,
  activatePro,
  addPartner,
  customizePro,
  deactivatePro,
  listActivePartners,
  loadOwnerBillingStatus,
  removePartner,
  renewPro,
} = require("./ownerBillingService");
const {
  OwnerCommandInputError,
  buildOwnerError,
  buildOwnerInfo,
  buildOwnerResponsePages,
  buildOwnerSuccess,
  cleanOwnerText,
  formatOwnerDate,
  getOwnerCommandPrefix,
  parseDuration,
  replyOwner,
  replyOwnerPages,
  resolveAccessibleGuild,
  resolveGuildName,
} = require("./ownerCommandUtils");

function getDependencies(options = {}) {
  return {
    activatePro: options.activatePro || activatePro,
    addPartner: options.addPartner || addPartner,
    customizePro: options.customizePro || customizePro,
    deactivatePro: options.deactivatePro || deactivatePro,
    listActivePartners: options.listActivePartners || listActivePartners,
    loadOwnerBillingStatus:
      options.loadOwnerBillingStatus || loadOwnerBillingStatus,
    removePartner: options.removePartner || removePartner,
    renewPro: options.renewPro || renewPro,
    resolveAccessibleGuild:
      options.resolveAccessibleGuild || resolveAccessibleGuild,
    resolveGuildName: options.resolveGuildName || resolveGuildName,
  };
}

function getMutationOptions(message, options = {}) {
  return {
    client: options.client,
    discordClient: message.client,
    logger: options.logger || console,
    now: options.now,
    refreshControls: options.refreshControls,
    transactionOptions: options.transactionOptions,
    maxTransactionRetries: options.maxTransactionRetries,
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

function requirePartnerArgs(args) {
  const action = String(args[0] || "").toLowerCase();
  if (action === "list") {
    if (args.length !== 1) {
      throw new OwnerCommandInputError(
        "invalid_partner_usage",
        "Usage: ^partner list"
      );
    }
    return { action };
  }

  if (action === "add" || action === "remove") {
    if (args.length !== 2) {
      throw new OwnerCommandInputError(
        "invalid_partner_usage",
        `Usage: ^partner ${action} <guild-id>`
      );
    }
    return { action, guildId: args[1] };
  }

  throw new OwnerCommandInputError(
    "invalid_partner_action",
    "Partner action must be add, remove, or list."
  );
}

async function executePartnerList(message, dependencies, options = {}) {
  const rows = await dependencies.listActivePartners({ client: options.client });
  if (!rows.length) {
    return replyOwner(
      message,
      buildOwnerInfo("Active Pixy Partners", ["No active Partner guilds were found."])
    );
  }

  const lines = [];
  for (const row of rows) {
    const guildId = cleanOwnerText(row.guildId, 32);
    const guildName = await dependencies.resolveGuildName(message.client, guildId);
    lines.push(
      `• **${guildName || "Unavailable guild"}** — \`${guildId}\` — since ${formatOwnerDate(row.partnerSince)}`
    );
  }

  return replyOwnerPages(
    message,
    buildOwnerResponsePages({
      title: `Active Pixy Partners (${rows.length})`,
      tone: "info",
      lines,
    })
  );
}

async function executePartner(message, args, options = {}) {
  const dependencies = getDependencies(options);
  return runOwnerHandler(message, async () => {
    const parsed = requirePartnerArgs(args);
    if (parsed.action === "list") {
      return executePartnerList(message, dependencies, options);
    }

    const guild = await dependencies.resolveAccessibleGuild(
      message.client,
      parsed.guildId
    );
    const mutationOptions = getMutationOptions(message, options);

    if (parsed.action === "add") {
      const result = await dependencies.addPartner(
        guild.id,
        message.author.id,
        mutationOptions
      );
      return replyOwner(
        message,
        buildOwnerSuccess("Partner entitlement enabled", [
          formatGuild(guild),
          `**Partner since:** ${formatOwnerDate(result.after.partnerSince)}`,
          `**Previous effective plan:** ${formatPlan(result.beforeSummary)}`,
          `**New effective plan:** ${formatPlan(result.afterSummary)}`,
          "Trial and Pro dates were preserved underneath Partner.",
        ])
      );
    }

    const result = await dependencies.removePartner(
      guild.id,
      message.author.id,
      mutationOptions
    );
    return replyOwner(
      message,
      buildOwnerSuccess("Partner entitlement removed", [
        formatGuild(guild),
        `**Effective plan now:** ${formatPlan(result.afterSummary)}`,
        `**Fallback plan:** ${result.afterSummary.planLabel}`,
        "Trial and Pro dates were preserved.",
      ])
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
    `\`${prefix}partner add <guild-id>\` — Enable Partner while preserving Trial and Pro dates.`,
    `\`${prefix}partner remove <guild-id>\` — Disable Partner and reveal the fallback plan.`,
    `\`${prefix}partner list\` — List active Partner guilds.`,
    "**Duration units**",
    "`d` = days, `w` = 7-day weeks, `m` = 30-day months, `y` = 365-day years.",
    "Examples: `14d`, `8w`, `6m`, `1y`. Maximum resulting Pro expiry: 10 years from now.",
  ]);
}

async function executeHelp(message) {
  const payload = buildOwnerHelpPayload(message);
  await message.reply(payload);
  return { delivered: "channel" };
}

module.exports = {
  buildOwnerHelpPayload,
  buildStatusLines,
  commandErrorPayload,
  executeActivate,
  executeCustom,
  executeDeactivate,
  executeHelp,
  executePartner,
  executePartnerList,
  executeResub,
  executeStatus,
  formatGuild,
  formatPlan,
  getDependencies,
  getMutationOptions,
  requirePartnerArgs,
  runOwnerHandler,
};
