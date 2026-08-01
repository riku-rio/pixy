const assert = require("node:assert/strict");
const test = require("node:test");

const {
  BILLING_CAPABILITIES,
  BILLING_PLANS,
  CUSTOM_DURATION_UNITS,
  DAY_MS,
  MAX_CUSTOM_DURATION_MS,
  STANDARD_PRO_DURATION_MS,
  STANDARD_TRIAL_DURATION_MS,
} = require("../src/billing/constants");
const {
  buildBillingSummary,
  calculateRemainingTime,
  getPlanCapabilities,
  loadBillingState,
  resolveEffectivePlan,
  resolveFallbackPlan,
} = require("../src/billing/billingService");

const NOW = new Date("2026-08-01T00:00:00.000Z");
const before = (milliseconds) => new Date(NOW.getTime() - milliseconds);
const after = (milliseconds) => new Date(NOW.getTime() + milliseconds);

test("billing duration constants use the documented calendar rules", () => {
  assert.equal(STANDARD_TRIAL_DURATION_MS, 7 * DAY_MS);
  assert.equal(STANDARD_PRO_DURATION_MS, 30 * DAY_MS);
  assert.equal(CUSTOM_DURATION_UNITS.d.days, 1);
  assert.equal(CUSTOM_DURATION_UNITS.w.days, 7);
  assert.equal(CUSTOM_DURATION_UNITS.m.days, 30);
  assert.equal(CUSTOM_DURATION_UNITS.y.days, 365);
  assert.equal(MAX_CUSTOM_DURATION_MS, 10 * 365 * DAY_MS);
});

test("plan resolution follows Partner > Pro > Trial > Expired", () => {
  const billing = {
    trialEndsAt: after(DAY_MS),
    proEndsAt: after(2 * DAY_MS),
    partnerActive: true,
  };

  assert.equal(resolveEffectivePlan(billing, NOW), BILLING_PLANS.PARTNER);
  assert.equal(resolveFallbackPlan(billing, NOW), BILLING_PLANS.PRO);
  assert.equal(
    resolveEffectivePlan({ ...billing, partnerActive: false }, NOW),
    BILLING_PLANS.PRO
  );
  assert.equal(
    resolveEffectivePlan({ trialEndsAt: after(DAY_MS) }, NOW),
    BILLING_PLANS.TRIAL
  );
  assert.equal(resolveEffectivePlan(null, NOW), BILLING_PLANS.EXPIRED);
});

test("expiration is exclusive at the exact end timestamp", () => {
  assert.equal(
    resolveEffectivePlan({ proEndsAt: NOW }, NOW),
    BILLING_PLANS.EXPIRED
  );
  assert.equal(
    resolveEffectivePlan({ proEndsAt: after(1) }, NOW),
    BILLING_PLANS.PRO
  );
  assert.equal(
    resolveEffectivePlan({ trialEndsAt: NOW }, NOW),
    BILLING_PLANS.EXPIRED
  );
  assert.equal(
    resolveEffectivePlan({ trialEndsAt: after(1) }, NOW),
    BILLING_PLANS.TRIAL
  );
});

test("expired Pro falls back to an active Trial", () => {
  const billing = {
    proEndsAt: before(1),
    trialEndsAt: after(DAY_MS),
  };
  assert.equal(resolveEffectivePlan(billing, NOW), BILLING_PLANS.TRIAL);
});

test("remaining time is exact, clamped, and unlimited for Partner", () => {
  const pro = calculateRemainingTime(
    { proEndsAt: after(2 * DAY_MS + 1) },
    { now: NOW, plan: BILLING_PLANS.PRO }
  );
  assert.equal(pro.milliseconds, 2 * DAY_MS + 1);
  assert.equal(pro.displayDays, 3);

  const expired = calculateRemainingTime(null, {
    now: NOW,
    plan: BILLING_PLANS.EXPIRED,
  });
  assert.equal(expired.milliseconds, 0);
  assert.equal(expired.displayDays, 0);

  const partner = calculateRemainingTime({}, {
    now: NOW,
    plan: BILLING_PLANS.PARTNER,
  });
  assert.equal(partner.unlimited, true);
  assert.equal(partner.milliseconds, null);
});

test("premium capabilities are unavailable only for Expired", () => {
  const expired = getPlanCapabilities(BILLING_PLANS.EXPIRED);
  const trial = getPlanCapabilities(BILLING_PLANS.TRIAL);

  assert.equal(expired[BILLING_CAPABILITIES.GENERIC_AI_REPLIES], true);
  assert.equal(expired[BILLING_CAPABILITIES.TICKET_AI_TOGGLE], true);
  assert.equal(expired[BILLING_CAPABILITIES.LEARNED_KNOWLEDGE_CONTEXT], false);
  assert.equal(expired[BILLING_CAPABILITIES.AGENT_ACTIONS], false);
  assert.equal(trial[BILLING_CAPABILITIES.LEARNED_KNOWLEDGE_CONTEXT], true);
  assert.equal(trial[BILLING_CAPABILITIES.AGENT_ACTIONS], true);
});

test("billing summary exposes display-ready state and Partner fallback", () => {
  const summary = buildBillingSummary({
    guildId: "123",
    partnerActive: true,
    partnerSince: before(DAY_MS),
    proStartedAt: before(DAY_MS),
    proEndsAt: after(5 * DAY_MS),
  }, { now: NOW });

  assert.equal(summary.initialized, true);
  assert.equal(summary.plan, BILLING_PLANS.PARTNER);
  assert.equal(summary.planLabel, "Partner");
  assert.equal(summary.remainingLabel, "Unlimited");
  assert.equal(summary.fallbackPlan, BILLING_PLANS.PRO);
  assert.equal(summary.premiumEntitled, true);
});

test("billing reads do not create or mutate a billing record", async () => {
  const calls = [];
  const client = {
    guildBilling: {
      async findUnique(args) {
        calls.push(["findUnique", args]);
        return null;
      },
      async create() {
        calls.push(["create"]);
        throw new Error("create must not be called");
      },
    },
  };

  const result = await loadBillingState(" 123 ", { client });
  assert.equal(result, null);
  assert.deepEqual(calls, [["findUnique", { where: { guildId: "123" } }]]);
});
