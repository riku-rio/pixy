const assert = require("node:assert/strict");
const test = require("node:test");

const {
  BILLING_EVENT_ACTIONS,
  STANDARD_TRIAL_DURATION_MS,
} = require("../src/billing/constants");
const {
  SYSTEM_BILLING_ACTOR,
  startTrialOnce,
} = require("../src/billing/billingService");
const {
  completeAutomaticCategorySetup,
  completeExistingCategorySetup,
} = require("../src/slash/setup");

const NOW = new Date("2026-08-01T12:00:00.000Z");

function createBillingClient(initialBilling = null) {
  let billing = initialBilling;
  const events = [];
  const calls = [];

  const transaction = {
    guildBilling: {
      async create({ data }) {
        calls.push(["billing.create", data]);
        billing = { id: "billing-1", ...data };
        return billing;
      },
    },
    billingEvent: {
      async create({ data }) {
        calls.push(["event.create", data]);
        events.push({ id: `event-${events.length + 1}`, ...data });
        return events.at(-1);
      },
    },
  };

  return {
    calls,
    events,
    get billing() {
      return billing;
    },
    guildBilling: {
      async findUnique({ where }) {
        calls.push(["billing.findUnique", where]);
        return billing;
      },
    },
    async $transaction(callback) {
      calls.push(["transaction"]);
      return callback(transaction);
    },
  };
}

function createSetupClient(order) {
  return {
    guildConfig: {
      async upsert(args) {
        order.push(["category.save", args]);
        return {
          guildId: args.where.guildId,
          ticketCategoryId: args.create.ticketCategoryId,
        };
      },
    },
  };
}

test("startTrialOnce atomically creates exact seven-day trial and audit event", async () => {
  const client = createBillingClient();

  const billing = await startTrialOnce(" 123 ", { client, now: NOW });

  assert.equal(billing.guildId, "123");
  assert.equal(billing.trialStartedAt.getTime(), NOW.getTime());
  assert.equal(
    billing.trialEndsAt.getTime(),
    NOW.getTime() + STANDARD_TRIAL_DURATION_MS
  );
  assert.equal(client.events.length, 1);
  assert.equal(client.events[0].guildId, "123");
  assert.equal(client.events[0].actorUserId, SYSTEM_BILLING_ACTOR);
  assert.equal(client.events[0].action, BILLING_EVENT_ACTIONS.TRIAL_STARTED);
  assert.deepEqual(
    client.calls.map(([name]) => name),
    ["billing.findUnique", "transaction", "billing.create", "event.create"]
  );
});

test("startTrialOnce returns existing billing without extending dates or auditing again", async () => {
  const existing = {
    id: "existing",
    guildId: "123",
    trialStartedAt: new Date("2026-07-01T00:00:00.000Z"),
    trialEndsAt: new Date("2026-07-08T00:00:00.000Z"),
  };
  const client = createBillingClient(existing);

  const billing = await startTrialOnce("123", {
    client,
    now: new Date("2026-08-01T00:00:00.000Z"),
  });

  assert.equal(billing, existing);
  assert.equal(billing.trialStartedAt.toISOString(), "2026-07-01T00:00:00.000Z");
  assert.equal(billing.trialEndsAt.toISOString(), "2026-07-08T00:00:00.000Z");
  assert.equal(client.events.length, 0);
  assert.deepEqual(client.calls, [["billing.findUnique", { guildId: "123" }]]);
});

test("existing-category setup saves the category before starting the trial", async () => {
  const order = [];
  const client = createSetupClient(order);

  await completeExistingCategorySetup("guild-1", "category-1", {
    client,
    async startTrial(guildId, options) {
      order.push(["trial.start", guildId, options.client]);
    },
  });

  assert.equal(order[0][0], "category.save");
  assert.equal(order[1][0], "trial.start");
  assert.equal(order[1][1], "guild-1");
  assert.equal(order[1][2], client);
});

test("automatic-category setup saves the category before starting the trial", async () => {
  const order = [];
  const client = createSetupClient(order);

  await completeAutomaticCategorySetup("guild-2", "category-2", {
    client,
    async startTrial(guildId, options) {
      order.push(["trial.start", guildId, options.client]);
    },
  });

  assert.equal(order[0][0], "category.save");
  assert.equal(order[1][0], "trial.start");
  assert.equal(order[1][1], "guild-2");
  assert.equal(order[1][2], client);
});

test("repeated setup does not extend the original trial", async () => {
  const billingClient = createBillingClient();
  billingClient.guildConfig = {
    async upsert({ where, create }) {
      return {
        guildId: where.guildId,
        ticketCategoryId: create.ticketCategoryId,
      };
    },
  };

  await completeExistingCategorySetup("123", "category-1", {
    client: billingClient,
    startTrial: (guildId, options) => startTrialOnce(guildId, {
      ...options,
      now: NOW,
    }),
  });
  const firstStartedAt = billingClient.billing.trialStartedAt.toISOString();
  const firstEndsAt = billingClient.billing.trialEndsAt.toISOString();

  await completeAutomaticCategorySetup("123", "category-2", {
    client: billingClient,
    startTrial: (guildId, options) => startTrialOnce(guildId, {
      ...options,
      now: new Date(NOW.getTime() + 3 * 24 * 60 * 60 * 1000),
    }),
  });

  assert.equal(billingClient.billing.trialStartedAt.toISOString(), firstStartedAt);
  assert.equal(billingClient.billing.trialEndsAt.toISOString(), firstEndsAt);
  assert.equal(billingClient.events.length, 1);
});
