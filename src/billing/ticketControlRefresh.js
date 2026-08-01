const { prisma } = require("../config/prisma");
const {
  loadGuildEntitlementState,
} = require("./entitlementService");

function getLogger(options = {}) {
  return options.logger || console;
}

function logRefreshFailure(logger, message, details, error) {
  const payload = {
    ...details,
    error: error?.message || String(error || "unknown_error"),
  };

  if (typeof logger?.error === "function") {
    logger.error(message, payload);
  }
}

async function refreshOpenTicketControlForChannel({
  guildId,
  channel,
  aiEnabled = true,
  client = prisma,
  now,
  entitlement,
  logger = console,
}) {
  if (!guildId || !channel) {
    return { ok: false, code: "missing_refresh_target" };
  }

  try {
    const currentEntitlement = entitlement || await loadGuildEntitlementState(
      guildId,
      { client, now }
    );
    const {
      refreshTicketControlMessage,
    } = require("../components/ticketAiControls");

    const result = await refreshTicketControlMessage(
      channel,
      aiEnabled,
      { plan: currentEntitlement.plan }
    );

    return {
      ...result,
      guildId,
      channelId: channel.id,
      plan: currentEntitlement.plan,
    };
  } catch (error) {
    logRefreshFailure(
      logger,
      "Failed to refresh an open ticket control message:",
      { guildId, channelId: channel.id },
      error
    );

    return {
      ok: false,
      code: "ticket_control_refresh_failed",
      guildId,
      channelId: channel.id,
      error,
    };
  }
}

async function resolveGuild(guildId, options = {}) {
  if (options.guild?.id === guildId) return options.guild;

  const discordClient = options.discordClient;
  const cached = discordClient?.guilds?.cache?.get?.(guildId);
  if (cached) return cached;

  if (discordClient?.guilds?.fetch) {
    return discordClient.guilds.fetch(guildId).catch(() => null);
  }

  return null;
}

async function resolveChannel(guild, channelId) {
  const cached = guild?.channels?.cache?.get?.(channelId);
  if (cached) return cached;

  if (guild?.channels?.fetch) {
    return guild.channels.fetch(channelId).catch(() => null);
  }

  return null;
}

async function refreshOpenTicketControlsForGuild(guildId, options = {}) {
  const client = options.client || prisma;
  const logger = getLogger(options);

  try {
    const [entitlement, tickets, guild] = await Promise.all([
      loadGuildEntitlementState(guildId, {
        client,
        now: options.now,
      }),
      client.ticketChannel.findMany({
        where: {
          guildId,
          closed: false,
        },
        select: {
          channelId: true,
          aiEnabled: true,
        },
      }),
      resolveGuild(guildId, options),
    ]);

    if (!guild) {
      return {
        ok: false,
        code: "guild_unavailable",
        guildId,
        plan: entitlement.plan,
        attempted: tickets.length,
        refreshed: 0,
        failed: tickets.length,
      };
    }

    let refreshed = 0;
    let failed = 0;

    for (const ticket of tickets) {
      const channel = await resolveChannel(guild, ticket.channelId);
      if (!channel) {
        failed += 1;
        logRefreshFailure(
          logger,
          "Failed to resolve an open ticket channel for control refresh:",
          { guildId, channelId: ticket.channelId },
          new Error("channel_unavailable")
        );
        continue;
      }

      const result = await refreshOpenTicketControlForChannel({
        guildId,
        channel,
        aiEnabled: ticket.aiEnabled !== false,
        client,
        now: options.now,
        entitlement,
        logger,
      });

      if (result.ok) refreshed += 1;
      else failed += 1;
    }

    return {
      ok: failed === 0,
      code: failed === 0 ? null : "partial_refresh_failure",
      guildId,
      plan: entitlement.plan,
      attempted: tickets.length,
      refreshed,
      failed,
    };
  } catch (error) {
    logRefreshFailure(
      logger,
      "Failed to refresh open ticket controls after a billing change:",
      { guildId },
      error
    );

    return {
      ok: false,
      code: "open_ticket_control_refresh_failed",
      guildId,
      attempted: 0,
      refreshed: 0,
      failed: 0,
      error,
    };
  }
}

async function refreshOpenTicketControlsAfterBillingMutation(
  guildId,
  options = {}
) {
  return refreshOpenTicketControlsForGuild(guildId, options);
}

module.exports = {
  refreshOpenTicketControlForChannel,
  refreshOpenTicketControlsAfterBillingMutation,
  refreshOpenTicketControlsForGuild,
  resolveChannel,
  resolveGuild,
};
