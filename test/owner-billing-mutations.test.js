const assert = require("node:assert/strict");
const test = require("node:test");

const { BILLING_EVENT_ACTIONS, BILLING_PLANS, DAY_MS } = require("../src/billing/constants");
const {
  OwnerBillingMutationError,
  activatePro,
  customizePro,
  deactivatePro,
  loadOwnerBillingStatus,
  renewPro,
} = require("../src/billing/ownerBillingService");
const { parseDuration } = require("../src/billing/ownerCommandUtils");
const {
  GUILD_ID,
  NOW,
  OWNER_ID,
  createFakeBillingClient,
} = require("./helpers/ownerBillingFakes");

async function assertRejectCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.code, code);
    return true;
  });
}

const refreshOk = async () => ({ ok: true });

test("activate creates 30 days of Pro, preserves Partner, and audits before refresh", async () => {
  const client = createFakeBillingClient({
    id: "billing-1",
    guildId: GUILD_ID,
    trialStartedAt: new Date(NOW.getTime() - DAY_MS),
    trialEndsAt: new Date(NOW.getTime() + 5 * DAY_MS),
    proStartedAt: null,
    proEndsAt: null,
    partnerActive: true,
    partnerSince: new Date(NOW.getTime() - 2 * DAY_MS),
  });
  const refreshCalls = [];
  const result = await activatePro(GUILD_ID, OWNER_ID, {
    client,
    now: NOW,
    refreshControls: async (guildId) => {
      refreshCalls.push([guildId, client.snapshot().events.length]);
      return { ok: true };
    },
  });

  assert.equal(result.after.proStartedAt.getTime(), NOW.getTime());
  assert.equal(result.after.proEndsAt.getTime(), NOW.getTime() + 30 * DAY_MS);
  assert.equal(result.beforeSummary.plan, BILLING_PLANS.PARTNER);
  assert.equal(result.afterSummary.plan, BILLING_PLANS.PARTNER);
  assert.equal(result.event.action, BILLING_EVENT_ACTIONS.PRO_ACTIVATED);
  assert.equal(result.event.durationValue, 30);
  assert.equal(result.event.durationUnit, "d");
  assert.deepEqual(refreshCalls, [[GUILD_ID, 1]]);
});

test("activate rejects active Pro and recommends resub without writing", async () => {
  const client = createFakeBillingClient({
    id: "billing-1",
    guildId: GUILD_ID,
    proStartedAt: new Date(NOW.getTime() - DAY_MS),
    proEndsAt: new Date(NOW.getTime() + DAY_MS),
    partnerActive: false,
  });
  await assert.rejects(
    activatePro(GUILD_ID, OWNER_ID, { client, now: NOW, refreshControls: refreshOk }),
    (error) => {
      assert.ok(error instanceof OwnerBillingMutationError);
      assert.equal(error.code, "active_pro_exists");
      assert.match(error.message, /\^resub/);
      return true;
    }
  );
  assert.equal(client.snapshot().events.length, 0);
});

test("resub requires active Pro and adds 30 days after its current expiry", async () => {
  const oldExpiry = new Date(NOW.getTime() + 4 * DAY_MS);
  const client = createFakeBillingClient({
    id: "billing-1",
    guildId: GUILD_ID,
    proStartedAt: new Date(NOW.getTime() - DAY_MS),
    proEndsAt: oldExpiry,
    partnerActive: false,
  });
  const result = await renewPro(GUILD_ID, OWNER_ID, {
    client,
    now: NOW,
    refreshControls: refreshOk,
  });
  assert.equal(result.after.proEndsAt.getTime(), oldExpiry.getTime() + 30 * DAY_MS);
  assert.equal(result.event.action, BILLING_EVENT_ACTIONS.PRO_RENEWED);
  assert.equal(result.event.previousProEndsAt.getTime(), oldExpiry.getTime());

  await assertRejectCode(
    renewPro(GUILD_ID, OWNER_ID, {
      client: createFakeBillingClient(null),
      now: NOW,
      refreshControls: refreshOk,
    }),
    "active_pro_required"
  );
});

test("custom extends active Pro or starts from now and persists normalized metadata", async () => {
  const activeExpiry = new Date(NOW.getTime() + 10 * DAY_MS);
  const active = await customizePro(
    GUILD_ID,
    OWNER_ID,
    parseDuration("6m"),
    {
      client: createFakeBillingClient({
        id: "billing-1",
        guildId: GUILD_ID,
        proStartedAt: new Date(NOW.getTime() - DAY_MS),
        proEndsAt: activeExpiry,
        partnerActive: false,
      }),
      now: NOW,
      refreshControls: refreshOk,
    }
  );
  assert.equal(active.after.proEndsAt.getTime(), activeExpiry.getTime() + 180 * DAY_MS);
  assert.equal(active.event.action, BILLING_EVENT_ACTIONS.PRO_CUSTOMIZED);
  assert.equal(active.event.metadata.normalizedDuration, "6m");
  assert.equal(active.event.metadata.durationDays, 180);
  assert.equal(active.event.metadata.extensionBase, "current_pro_expiry");

  const inactive = await customizePro(GUILD_ID, OWNER_ID, parseDuration("2w"), {
    client: createFakeBillingClient(null),
    now: NOW,
    refreshControls: refreshOk,
  });
  assert.equal(inactive.after.proStartedAt.getTime(), NOW.getTime());
  assert.equal(inactive.after.proEndsAt.getTime(), NOW.getTime() + 14 * DAY_MS);
  assert.equal(inactive.event.metadata.extensionBase, "now");
});

test("deactivate ends Pro now while preserving Trial and Partner state", async () => {
  const trialStartedAt = new Date(NOW.getTime() - DAY_MS);
  const trialEndsAt = new Date(NOW.getTime() + 2 * DAY_MS);
  const partnerSince = new Date(NOW.getTime() - 5 * DAY_MS);
  const client = createFakeBillingClient({
    id: "billing-1",
    guildId: GUILD_ID,
    trialStartedAt,
    trialEndsAt,
    proStartedAt: new Date(NOW.getTime() - DAY_MS),
    proEndsAt: new Date(NOW.getTime() + 20 * DAY_MS),
    partnerActive: true,
    partnerSince,
  });
  const result = await deactivatePro(GUILD_ID, OWNER_ID, {
    client,
    now: NOW,
    refreshControls: refreshOk,
  });

  assert.equal(result.after.proEndsAt.getTime(), NOW.getTime());
  assert.equal(result.after.trialStartedAt.getTime(), trialStartedAt.getTime());
  assert.equal(result.after.trialEndsAt.getTime(), trialEndsAt.getTime());
  assert.equal(result.after.partnerActive, true);
  assert.equal(result.after.partnerSince.getTime(), partnerSince.getTime());
  assert.equal(result.afterSummary.plan, BILLING_PLANS.PARTNER);
  assert.equal(result.fallbackPlan, BILLING_PLANS.TRIAL);
  assert.equal(result.event.action, BILLING_EVENT_ACTIONS.PRO_DEACTIVATED);
  assert.equal(result.event.metadata.fallbackPlan, BILLING_PLANS.TRIAL);
});

test("already inactive Pro is an explicit no-op", async () => {
  const client = createFakeBillingClient({
    id: "billing-1",
    guildId: GUILD_ID,
    proStartedAt: new Date(NOW.getTime() - 20 * DAY_MS),
    proEndsAt: new Date(NOW.getTime() - DAY_MS),
    partnerActive: false,
  });
  await assertRejectCode(
    deactivatePro(GUILD_ID, OWNER_ID, { client, now: NOW, refreshControls: refreshOk }),
    "pro_already_inactive"
  );
  assert.equal(client.snapshot().events.length, 0);
});

test("audit failure rolls back, while refresh failure leaves the commit intact", async () => {
  const rollbackClient = createFakeBillingClient(null, { failAudit: true });
  await assert.rejects(
    activatePro(GUILD_ID, OWNER_ID, {
      client: rollbackClient,
      now: NOW,
      refreshControls: refreshOk,
    }),
    /audit insert failed/
  );
  assert.equal(rollbackClient.snapshot().billing, null);

  const committedClient = createFakeBillingClient(null);
  const result = await activatePro(GUILD_ID, OWNER_ID, {
    client: committedClient,
    now: NOW,
    logger: { error() {} },
    refreshControls: async () => {
      throw new Error("Discord unavailable");
    },
  });
  assert.equal(result.refresh.ok, false);
  assert.equal(committedClient.snapshot().events.length, 1);
  assert.equal(
    committedClient.snapshot().billing.proEndsAt.getTime(),
    NOW.getTime() + 30 * DAY_MS
  );
});

test("status returns complete summary data and the latest event", async () => {
  const empty = await loadOwnerBillingStatus(GUILD_ID, {
    client: createFakeBillingClient(null),
    now: NOW,
  });
  assert.equal(empty.summary.initialized, false);
  assert.equal(empty.summary.plan, BILLING_PLANS.EXPIRED);
  assert.equal(empty.latestEvent, null);

  const latest = {
    id: "event-latest",
    guildId: GUILD_ID,
    actorUserId: OWNER_ID,
    action: BILLING_EVENT_ACTIONS.PRO_RENEWED,
    createdAt: new Date(NOW.getTime() + DAY_MS),
  };
  const status = await loadOwnerBillingStatus(GUILD_ID, {
    client: createFakeBillingClient(
      {
        id: "billing-1",
        guildId: GUILD_ID,
        trialStartedAt: new Date(NOW.getTime() - 8 * DAY_MS),
        trialEndsAt: new Date(NOW.getTime() - DAY_MS),
        proStartedAt: new Date(NOW.getTime() - DAY_MS),
        proEndsAt: new Date(NOW.getTime() + 10 * DAY_MS),
        partnerActive: true,
        partnerSince: new Date(NOW.getTime() - 2 * DAY_MS),
      },
      { events: [latest] }
    ),
    now: NOW,
  });
  assert.equal(status.summary.plan, BILLING_PLANS.PARTNER);
  assert.equal(status.summary.fallbackPlan, BILLING_PLANS.PRO);
  assert.equal(status.latestEvent.action, BILLING_EVENT_ACTIONS.PRO_RENEWED);
});
