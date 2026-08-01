const {
  BILLING_EVENT_ACTIONS,
  BILLING_PLANS,
  DAY_MS,
  PLAN_CAPABILITY_MAP,
  PREMIUM_PLAN_VALUES,
  STANDARD_TRIAL_DURATION_MS,
} = require("./constants");

const PLAN_LABELS = Object.freeze({
  [BILLING_PLANS.TRIAL]: "Trial",
  [BILLING_PLANS.EXPIRED]: "Expired",
  [BILLING_PLANS.PRO]: "Pro",
  [BILLING_PLANS.PARTNER]: "Partner",
});
const SYSTEM_BILLING_ACTOR = "system";

function getDefaultPrisma() {
  return require("../config/prisma").prisma;
}

function normalizeGuildId(guildId) {
  const value = String(guildId || "").trim();
  if (!value) throw new TypeError("A guild ID is required to load billing state.");
  return value;
}

function normalizeNow(value = new Date()) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError("A valid current time is required.");
  return date;
}

function toDateOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isActiveUntil(value, nowValue = new Date()) {
  const endsAt = toDateOrNull(value);
  if (!endsAt) return false;
  const now = normalizeNow(nowValue);
  return endsAt.getTime() > now.getTime();
}

function isUniqueConstraintError(error) {
  const codes = [error?.code, error?.cause?.code]
    .map((value) => String(value || ""))
    .filter(Boolean);
  const errno = Number(error?.errno ?? error?.cause?.errno);
  return codes.includes("P2002") || codes.includes("ER_DUP_ENTRY") || errno === 1062;
}

function resolveFallbackPlan(billing, nowValue = new Date()) {
  const now = normalizeNow(nowValue);
  if (isActiveUntil(billing?.proEndsAt, now)) return BILLING_PLANS.PRO;
  if (isActiveUntil(billing?.trialEndsAt, now)) return BILLING_PLANS.TRIAL;
  return BILLING_PLANS.EXPIRED;
}

function resolveEffectivePlan(billing, nowValue = new Date()) {
  if (billing?.partnerActive === true) return BILLING_PLANS.PARTNER;
  return resolveFallbackPlan(billing, nowValue);
}

function hasPremiumEntitlement(plan) {
  return PREMIUM_PLAN_VALUES.includes(plan);
}

function getPlanCapabilities(plan) {
  return PLAN_CAPABILITY_MAP[plan] || PLAN_CAPABILITY_MAP[BILLING_PLANS.EXPIRED];
}

function getPlanWindow(billing, plan) {
  if (plan === BILLING_PLANS.TRIAL) {
    return {
      startedAt: toDateOrNull(billing?.trialStartedAt),
      endsAt: toDateOrNull(billing?.trialEndsAt),
    };
  }

  if (plan === BILLING_PLANS.PRO) {
    return {
      startedAt: toDateOrNull(billing?.proStartedAt),
      endsAt: toDateOrNull(billing?.proEndsAt),
    };
  }

  if (plan === BILLING_PLANS.PARTNER) {
    return {
      startedAt: toDateOrNull(billing?.partnerSince),
      endsAt: null,
    };
  }

  return { startedAt: null, endsAt: null };
}

function calculateRemainingTime(billing, options = {}) {
  const now = normalizeNow(options.now ?? new Date());
  const plan = options.plan || resolveEffectivePlan(billing, now);

  if (plan === BILLING_PLANS.PARTNER) {
    return {
      unlimited: true,
      expiresAt: null,
      milliseconds: null,
      seconds: null,
      hours: null,
      days: null,
      displayDays: null,
    };
  }

  if (plan === BILLING_PLANS.EXPIRED) {
    return {
      unlimited: false,
      expiresAt: null,
      milliseconds: 0,
      seconds: 0,
      hours: 0,
      days: 0,
      displayDays: 0,
    };
  }

  const { endsAt } = getPlanWindow(billing, plan);
  const milliseconds = endsAt
    ? Math.max(0, endsAt.getTime() - now.getTime())
    : 0;

  return {
    unlimited: false,
    expiresAt: endsAt,
    milliseconds,
    seconds: Math.ceil(milliseconds / 1000),
    hours: milliseconds / (60 * 60 * 1000),
    days: milliseconds / DAY_MS,
    displayDays: milliseconds > 0 ? Math.ceil(milliseconds / DAY_MS) : 0,
  };
}

function formatRemainingLabel(remaining) {
  if (remaining.unlimited) return "Unlimited";
  const days = Number(remaining.displayDays || 0);
  return days === 1 ? "1 day" : `${days} days`;
}

function buildBillingSummary(billing, options = {}) {
  const now = normalizeNow(options.now ?? new Date());
  const plan = resolveEffectivePlan(billing, now);
  const fallbackPlan = plan === BILLING_PLANS.PARTNER
    ? resolveFallbackPlan(billing, now)
    : null;
  const remaining = calculateRemainingTime(billing, { now, plan });
  const window = getPlanWindow(billing, plan);

  return {
    initialized: Boolean(billing),
    guildId: billing?.guildId || null,
    plan,
    planLabel: PLAN_LABELS[plan],
    status: plan === BILLING_PLANS.EXPIRED ? "expired" : "active",
    statusLabel: plan === BILLING_PLANS.EXPIRED ? "Expired" : "Active",
    premiumEntitled: hasPremiumEntitlement(plan),
    capabilities: getPlanCapabilities(plan),
    fallbackPlan,
    fallbackPlanLabel: fallbackPlan ? PLAN_LABELS[fallbackPlan] : null,
    remaining,
    remainingLabel: formatRemainingLabel(remaining),
    startedAt: window.startedAt,
    expiresAt: window.endsAt,
    trial: {
      startedAt: toDateOrNull(billing?.trialStartedAt),
      endsAt: toDateOrNull(billing?.trialEndsAt),
      active: isActiveUntil(billing?.trialEndsAt, now),
    },
    pro: {
      startedAt: toDateOrNull(billing?.proStartedAt),
      endsAt: toDateOrNull(billing?.proEndsAt),
      active: isActiveUntil(billing?.proEndsAt, now),
    },
    partner: {
      active: billing?.partnerActive === true,
      startedAt: toDateOrNull(billing?.partnerSince),
    },
  };
}

async function loadBillingState(guildId, options = {}) {
  const normalizedGuildId = normalizeGuildId(guildId);
  const client = options.client || getDefaultPrisma();
  return client.guildBilling.findUnique({
    where: { guildId: normalizedGuildId },
  });
}

async function loadBillingSummary(guildId, options = {}) {
  const billing = await loadBillingState(guildId, options);
  return buildBillingSummary(billing, { now: options.now });
}

async function startTrialOnce(guildId, options = {}) {
  const normalizedGuildId = normalizeGuildId(guildId);
  const client = options.client || getDefaultPrisma();
  const existing = await client.guildBilling.findUnique({
    where: { guildId: normalizedGuildId },
  });
  if (existing) return existing;

  const trialStartedAt = normalizeNow(options.now ?? new Date());
  const trialEndsAt = new Date(
    trialStartedAt.getTime() + STANDARD_TRIAL_DURATION_MS
  );
  const actorUserId = String(options.actorUserId || SYSTEM_BILLING_ACTOR).trim()
    || SYSTEM_BILLING_ACTOR;

  try {
    return await client.$transaction(async (transaction) => {
      const billing = await transaction.guildBilling.create({
        data: {
          guildId: normalizedGuildId,
          trialStartedAt,
          trialEndsAt,
        },
      });

      await transaction.billingEvent.create({
        data: {
          guildId: normalizedGuildId,
          actorUserId,
          action: BILLING_EVENT_ACTIONS.TRIAL_STARTED,
          metadata: {
            source: "pixy_setup",
            trialStartedAt: trialStartedAt.toISOString(),
            trialEndsAt: trialEndsAt.toISOString(),
          },
        },
      });

      return billing;
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const concurrentBilling = await client.guildBilling.findUnique({
      where: { guildId: normalizedGuildId },
    });
    if (concurrentBilling) return concurrentBilling;
    throw error;
  }
}

module.exports = {
  PLAN_LABELS,
  SYSTEM_BILLING_ACTOR,
  buildBillingSummary,
  calculateRemainingTime,
  formatRemainingLabel,
  getPlanCapabilities,
  getPlanWindow,
  hasPremiumEntitlement,
  isActiveUntil,
  isUniqueConstraintError,
  loadBillingState,
  loadBillingSummary,
  normalizeGuildId,
  resolveEffectivePlan,
  resolveFallbackPlan,
  startTrialOnce,
  toDateOrNull,
};
