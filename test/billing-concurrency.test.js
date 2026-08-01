const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DAY_MS,
  MAX_CUSTOM_DURATION_MS,
} = require("../src/billing/constants");
const {
  OwnerBillingMutationError,
  renewPro,
  validateExpiryDate,
} = require("../src/billing/ownerBillingService");
const {
  GUILD_ID,
  NOW,
  OWNER_ID,
  createFakeBillingClient,
} = require("./helpers/ownerBillingFakes");

const refreshOk = async () => ({ ok: true });

test("two near-simultaneous renewals serialize and preserve both 30-day extensions", async () => {
  const initialExpiry = new Date(NOW.getTime() + 5 * DAY_MS);
  const client = createFakeBillingClient(
    {
      id: "billing-1",
      guildId: GUILD_ID,
      proStartedAt: new Date(NOW.getTime() - DAY_MS),
      proEndsAt: initialExpiry,
      partnerActive: false,
    },
    { lockDelay: 5 }
  );

  const [first, second] = await Promise.all([
    renewPro(GUILD_ID, OWNER_ID, {
      client,
      now: NOW,
      refreshControls: refreshOk,
    }),
    renewPro(GUILD_ID, OWNER_ID, {
      client,
      now: NOW,
      refreshControls: refreshOk,
    }),
  ]);

  const snapshot = client.snapshot();
  assert.equal(
    snapshot.billing.proEndsAt.getTime(),
    initialExpiry.getTime() + 60 * DAY_MS
  );
  assert.equal(snapshot.events.length, 2);
  assert.equal(snapshot.locks.length, 2);
  assert.ok(snapshot.locks.every((entry) => /FOR UPDATE/.test(entry.query)));
  assert.ok(
    snapshot.transactionOptions.every(
      (entry) => entry?.isolationLevel === "Serializable"
    )
  );
  assert.notEqual(
    first.after.proEndsAt.getTime(),
    second.after.proEndsAt.getTime()
  );
});

test("audit failure rolls back the locked mutation and refresh failure does not", async () => {
  const auditFailure = createFakeBillingClient(
    {
      id: "billing-1",
      guildId: GUILD_ID,
      proStartedAt: new Date(NOW.getTime() - DAY_MS),
      proEndsAt: new Date(NOW.getTime() + DAY_MS),
      partnerActive: false,
    },
    { failAudit: true }
  );
  const originalExpiry = auditFailure.snapshot().billing.proEndsAt.getTime();

  await assert.rejects(
    renewPro(GUILD_ID, OWNER_ID, {
      client: auditFailure,
      now: NOW,
      refreshControls: refreshOk,
    }),
    /audit insert failed/
  );
  assert.equal(
    auditFailure.snapshot().billing.proEndsAt.getTime(),
    originalExpiry
  );

  const refreshFailure = createFakeBillingClient({
    id: "billing-1",
    guildId: GUILD_ID,
    proStartedAt: new Date(NOW.getTime() - DAY_MS),
    proEndsAt: new Date(NOW.getTime() + DAY_MS),
    partnerActive: false,
  });
  const result = await renewPro(GUILD_ID, OWNER_ID, {
    client: refreshFailure,
    now: NOW,
    logger: { error() {} },
    refreshControls: async () => {
      throw new Error("Discord unavailable");
    },
  });
  assert.equal(result.refresh.ok, false);
  assert.equal(refreshFailure.snapshot().events.length, 1);
  assert.equal(
    refreshFailure.snapshot().billing.proEndsAt.getTime(),
    NOW.getTime() + 31 * DAY_MS
  );
});

test("date validation rejects invalid and unreasonable far-future expiries", () => {
  assert.throws(
    () => validateExpiryDate(new Date("invalid"), NOW),
    (error) => error instanceof OwnerBillingMutationError && error.code === "invalid_expiry"
  );
  assert.throws(
    () => validateExpiryDate(new Date(NOW.getTime()), NOW),
    (error) => error.code === "invalid_expiry"
  );
  assert.throws(
    () => validateExpiryDate(
      new Date(NOW.getTime() + MAX_CUSTOM_DURATION_MS + 1),
      NOW
    ),
    (error) => error.code === "expiry_too_far"
  );
});
