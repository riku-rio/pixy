const {
  BILLING_EVENT_ACTIONS,
  STANDARD_PRO_DURATION_MS,
} = require("./constants");
const {
  buildBillingSummary,
  isActiveUntil,
  normalizeGuildId,
  resolveFallbackPlan,
} = require("./billingService");

class OwnerBillingMutationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "OwnerBillingMutationError";
    this.code = code;
  }
}

function getDefaultPrisma() {
  return require("../config/prisma").prisma;
}

function normalizeNow(value = new Date()) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("A valid current time is required.");
  }
  return date;
}

function normalizeActorUserId(value) {
  const actorUserId = String(value || "").trim();
  if (!actorUserId) throw new TypeError("An owner actor user ID is required.");
  return actorUserId;
}

function addMilliseconds(date, milliseconds) {
  const timestamp = date.getTime() + milliseconds;
  const result = new Date(timestamp);
  if (!Number.isFinite(timestamp) || Number.isNaN(result.getTime())) {
    throw new OwnerBillingMutationError(
      "invalid_expiry",
      "The requested expiration date is outside the supported range."
    );
  }
  return result;
}

async function persistBilling(transaction, guildId, current, data) {
  if (current) {
    return transaction.guildBilling.update({
      where: { guildId },
      data,
    });
  }

  return transaction.guildBilling.create({
    data: { guildId, ...data },
  });
}

function buildAuditData({
  guildId,
  actorUserId,
  action,
  beforeSummary,
  afterSummary,
  durationValue = null,
  durationUnit = null,
  previousProEndsAt = null,
  newProEndsAt = null,
  metadata = {},
}) {
  return {
    guildId,
    actorUserId,
    action,
    durationValue,
    durationUnit,
    previousProEndsAt,
    newProEndsAt,
    metadata: {
      source: "owner_prefix_command",
      previousEffectivePlan: beforeSummary.plan,
      newEffectivePlan: afterSummary.plan,
      partnerPreserved: afterSummary.partner.active,
      ...metadata,
    },
  };
}

async function runPostMutationRefresh(guildId, options = {}) {
  const refreshControls =
    options.refreshControls ||
    require("./ticketControlRefresh").refreshOpenTicketControlsAfterBillingMutation;

  try {
    return await refreshControls(guildId, {
      client: options.client || getDefaultPrisma(),
      discordClient: options.discordClient,
      now: options.now,
      logger: options.logger,
    });
  } catch (error) {
    if (typeof options.logger?.error === "function") {
      options.logger.error("Owner billing mutation control refresh failed:", {
        guildId,
        error: error?.message || String(error),
      });
    }

    return {
      ok: false,
      code: "open_ticket_control_refresh_failed",
      guildId,
      error,
    };
  }
}

async function mutateBillingWithAudit({
  guildId,
  actorUserId,
  action,
  options = {},
  mutate,
}) {
  const normalizedGuildId = normalizeGuildId(guildId);
  const normalizedActorUserId = normalizeActorUserId(actorUserId);
  const now = normalizeNow(options.now ?? new Date());
  const client = options.client || getDefaultPrisma();

  const committed = await client.$transaction(async (transaction) => {
    const before = await transaction.guildBilling.findUnique({
      where: { guildId: normalizedGuildId },
    });
    const beforeSummary = buildBillingSummary(before, { now });
    const mutation = await mutate({
      transaction,
      guildId: normalizedGuildId,
      actorUserId: normalizedActorUserId,
      now,
      before,
      beforeSummary,
    });
    const afterSummary = buildBillingSummary(mutation.after, { now });
    const eventData = buildAuditData({
      guildId: normalizedGuildId,
      actorUserId: normalizedActorUserId,
      action,
      beforeSummary,
      afterSummary,
      ...mutation.audit,
    });
    const event = await transaction.billingEvent.create({ data: eventData });
    const { after, audit, result, ...details } = mutation;

    return {
      guildId: normalizedGuildId,
      now,
      before,
      after,
      beforeSummary,
      afterSummary,
      event,
      ...details,
      ...result,
    };
  });

  const refresh = await runPostMutationRefresh(normalizedGuildId, {
    ...options,
    client,
    now,
  });

  return { ...committed, refresh };
}

async function activatePro(guildId, actorUserId, options = {}) {
  return mutateBillingWithAudit({
    guildId,
    actorUserId,
    action: BILLING_EVENT_ACTIONS.PRO_ACTIVATED,
    options,
    async mutate({ transaction, guildId: normalizedGuildId, now, before }) {
      if (isActiveUntil(before?.proEndsAt, now)) {
        throw new OwnerBillingMutationError(
          "active_pro_exists",
          "This guild already has active Pro. Use ^resub to add another 30 days."
        );
      }

      const proEndsAt = addMilliseconds(now, STANDARD_PRO_DURATION_MS);
      const after = await persistBilling(transaction, normalizedGuildId, before, {
        proStartedAt: now,
        proEndsAt,
      });

      return {
        after,
        audit: {
          durationValue: 30,
          durationUnit: "d",
          previousProEndsAt: before?.proEndsAt || null,
          newProEndsAt: proEndsAt,
          metadata: { normalizedDuration: "30d" },
        },
      };
    },
  });
}

async function renewPro(guildId, actorUserId, options = {}) {
  return mutateBillingWithAudit({
    guildId,
    actorUserId,
    action: BILLING_EVENT_ACTIONS.PRO_RENEWED,
    options,
    async mutate({ transaction, guildId: normalizedGuildId, now, before }) {
      if (!isActiveUntil(before?.proEndsAt, now)) {
        throw new OwnerBillingMutationError(
          "active_pro_required",
          "This guild does not have active Pro. Use ^activate instead."
        );
      }

      const previousProEndsAt = new Date(before.proEndsAt);
      const proEndsAt = addMilliseconds(
        previousProEndsAt,
        STANDARD_PRO_DURATION_MS
      );
      const after = await transaction.guildBilling.update({
        where: { guildId: normalizedGuildId },
        data: { proEndsAt },
      });

      return {
        after,
        audit: {
          durationValue: 30,
          durationUnit: "d",
          previousProEndsAt,
          newProEndsAt: proEndsAt,
          metadata: {
            normalizedDuration: "30d",
            extensionBase: "current_pro_expiry",
          },
        },
      };
    },
  });
}

async function customizePro(guildId, actorUserId, duration, options = {}) {
  if (!duration || !Number.isSafeInteger(duration.milliseconds) || duration.milliseconds <= 0) {
    throw new TypeError("A parsed positive custom duration is required.");
  }

  return mutateBillingWithAudit({
    guildId,
    actorUserId,
    action: BILLING_EVENT_ACTIONS.PRO_CUSTOMIZED,
    options,
    async mutate({ transaction, guildId: normalizedGuildId, now, before }) {
      const active = isActiveUntil(before?.proEndsAt, now);
      const previousProEndsAt = before?.proEndsAt ? new Date(before.proEndsAt) : null;
      const extensionBase = active ? previousProEndsAt : now;
      const proEndsAt = addMilliseconds(extensionBase, duration.milliseconds);
      const after = await persistBilling(transaction, normalizedGuildId, before, {
        proStartedAt: active ? before.proStartedAt || now : now,
        proEndsAt,
      });

      return {
        after,
        extensionBase,
        audit: {
          durationValue: duration.amount,
          durationUnit: duration.unit,
          previousProEndsAt,
          newProEndsAt: proEndsAt,
          metadata: {
            normalizedDuration: duration.normalized,
            durationDays: duration.days,
            extensionBase: active ? "current_pro_expiry" : "now",
          },
        },
      };
    },
  });
}

async function deactivatePro(guildId, actorUserId, options = {}) {
  return mutateBillingWithAudit({
    guildId,
    actorUserId,
    action: BILLING_EVENT_ACTIONS.PRO_DEACTIVATED,
    options,
    async mutate({ transaction, guildId: normalizedGuildId, now, before }) {
      if (!isActiveUntil(before?.proEndsAt, now)) {
        throw new OwnerBillingMutationError(
          "pro_already_inactive",
          "This guild does not currently have active Pro. No changes were made."
        );
      }

      const previousProEndsAt = new Date(before.proEndsAt);
      const after = await transaction.guildBilling.update({
        where: { guildId: normalizedGuildId },
        data: { proEndsAt: now },
      });
      const fallbackPlan = resolveFallbackPlan(after, now);

      return {
        after,
        fallbackPlan,
        audit: {
          previousProEndsAt,
          newProEndsAt: now,
          metadata: { fallbackPlan },
        },
      };
    },
  });
}

async function loadOwnerBillingStatus(guildId, options = {}) {
  const normalizedGuildId = normalizeGuildId(guildId);
  const client = options.client || getDefaultPrisma();
  const now = normalizeNow(options.now ?? new Date());
  const [billing, latestEvent] = await Promise.all([
    client.guildBilling.findUnique({ where: { guildId: normalizedGuildId } }),
    client.billingEvent.findFirst({
      where: { guildId: normalizedGuildId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    guildId: normalizedGuildId,
    billing,
    summary: buildBillingSummary(billing, { now }),
    latestEvent,
    now,
  };
}

module.exports = {
  OwnerBillingMutationError,
  activatePro,
  addMilliseconds,
  buildAuditData,
  customizePro,
  deactivatePro,
  loadOwnerBillingStatus,
  mutateBillingWithAudit,
  normalizeActorUserId,
  normalizeNow,
  persistBilling,
  renewPro,
  runPostMutationRefresh,
};
