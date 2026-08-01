const assert = require("node:assert/strict");
const test = require("node:test");

const {
  BILLING_CAPABILITIES,
  BILLING_PLANS,
  DAY_MS,
} = require("../src/billing/constants");
const {
  SUBSCRIPTION_REJECTION_CODES,
  getGuildAgentActionAvailability,
  getGuildPremiumCapabilityAvailability,
  getGuildTicketActionAvailability,
  getSubscriptionRejectionMessage,
  getSubscriptionRejectionStatus,
  hasGuildPremiumEntitlement,
} = require("../src/billing/entitlementService");
const {
  executeTicketAction,
} = require("../src/utils/tickets/actions/ticketActionExecutor");
const {
  TICKET_ACTIONS,
} = require("../src/utils/tickets/actions/ticketActionTypes");

const NOW = new Date("2026-08-01T12:00:00.000Z");

const ENABLED_SETTINGS = Object.freeze({
  agentActionsEnabled: true,
  closeTicketEnabled: true,
  renameReviewEnabled: true,
  escalationEnabled: true,
});

function createClient({ billing = null, settings = ENABLED_SETTINGS } = {}) {
  const calls = [];

  return {
    calls,
    guildBilling: {
      async findUnique(args) {
        calls.push(["billing", args]);
        return billing;
      },
    },
    guildSetting: {
      async findUnique(args) {
        calls.push(["settings", args]);
        return settings;
      },
    },
  };
}

test("guild premium entitlement follows the effective billing plan", async () => {
  const activeTrial = createClient({
    billing: {
      guildId: "guild-1",
      trialStartedAt: new Date(NOW.getTime() - DAY_MS),
      trialEndsAt: new Date(NOW.getTime() + DAY_MS),
    },
  });
  const expiredTrial = createClient({
    billing: {
      guildId: "guild-2",
      trialStartedAt: new Date(NOW.getTime() - 8 * DAY_MS),
      trialEndsAt: new Date(NOW.getTime() - DAY_MS),
    },
  });

  assert.equal(
    await hasGuildPremiumEntitlement("guild-1", {
      client: activeTrial,
      now: NOW,
    }),
    true
  );
  assert.equal(
    await hasGuildPremiumEntitlement("guild-2", {
      client: expiredTrial,
      now: NOW,
    }),
    false
  );
});

test("capability availability combines billing and feature flags without mutating either", async () => {
  const billing = {
    guildId: "guild-1",
    proStartedAt: new Date(NOW.getTime() - DAY_MS),
    proEndsAt: new Date(NOW.getTime() + DAY_MS),
  };
  const settings = {
    ...ENABLED_SETTINGS,
    closeTicketEnabled: false,
  };
  const originalBilling = { ...billing };
  const originalSettings = { ...settings };
  const client = createClient({ billing, settings });

  const result = await getGuildPremiumCapabilityAvailability(
    "guild-1",
    BILLING_CAPABILITIES.CLOSE_TICKET,
    { client, now: NOW }
  );

  assert.equal(result.plan, BILLING_PLANS.PRO);
  assert.equal(result.premiumEntitled, true);
  assert.equal(result.available, false);
  assert.equal(result.code, "close_ticket_disabled");
  assert.deepEqual(billing, originalBilling);
  assert.deepEqual(settings, originalSettings);
  assert.deepEqual(
    client.calls.map(([name]) => name).sort(),
    ["billing", "settings"]
  );
});

test("expired trials and uninitialized guilds use stable subscription rejection codes", async () => {
  const expiredClient = createClient({
    billing: {
      guildId: "guild-expired",
      trialStartedAt: new Date(NOW.getTime() - 8 * DAY_MS),
      trialEndsAt: new Date(NOW.getTime() - DAY_MS),
    },
  });
  const missingClient = createClient({ billing: null });

  const expired = await getGuildTicketActionAvailability(
    "guild-expired",
    TICKET_ACTIONS.RENAME_TICKET,
    { client: expiredClient, now: NOW }
  );
  const missing = await getGuildAgentActionAvailability("guild-missing", {
    client: missingClient,
    now: NOW,
  });

  assert.equal(expired.available, false);
  assert.equal(
    expired.code,
    SUBSCRIPTION_REJECTION_CODES.TRIAL_EXPIRED
  );
  assert.match(getSubscriptionRejectionMessage(expired.code), /Trial has ended/);
  assert.equal(
    getSubscriptionRejectionStatus(expired.code),
    "action_rejected:subscription_trial_expired"
  );

  assert.equal(missing.available, false);
  assert.equal(
    missing.code,
    SUBSCRIPTION_REJECTION_CODES.PRO_REQUIRED
  );
  assert.match(getSubscriptionRejectionMessage(missing.code), /requires Pixy Pro/);
  assert.equal(
    getSubscriptionRejectionStatus(missing.code),
    "action_rejected:subscription_pro_required"
  );
});

test("active premium agent capability still respects the guild agent-action flag", async () => {
  const client = createClient({
    billing: {
      guildId: "guild-1",
      partnerActive: true,
      partnerSince: new Date(NOW.getTime() - DAY_MS),
    },
    settings: {
      ...ENABLED_SETTINGS,
      agentActionsEnabled: false,
    },
  });

  const result = await getGuildAgentActionAvailability("guild-1", {
    client,
    now: NOW,
  });

  assert.equal(result.plan, BILLING_PLANS.PARTNER);
  assert.equal(result.premiumEntitled, true);
  assert.equal(result.available, false);
  assert.equal(result.code, "agent_actions_disabled");
});

test("backend execution rejects every stale premium action before mutation", async () => {
  let mutations = 0;
  const message = {
    guild: { id: "guild-expired" },
    author: { tag: "user" },
    channel: {
      id: "channel-1",
      async setName() {
        mutations += 1;
      },
      async setParent() {
        mutations += 1;
      },
      async delete() {
        mutations += 1;
      },
      async send() {
        mutations += 1;
      },
    },
    async reply() {
      mutations += 1;
    },
  };

  for (const action of Object.values(TICKET_ACTIONS)) {
    await assert.rejects(
      executeTicketAction({
        actionRequest: { action, data: {} },
        validation: { action, data: {} },
        message,
        getActionRejection: async () =>
          SUBSCRIPTION_REJECTION_CODES.TRIAL_EXPIRED,
      }),
      (error) => {
        assert.equal(
          error.code,
          SUBSCRIPTION_REJECTION_CODES.TRIAL_EXPIRED
        );
        return true;
      }
    );
  }

  assert.equal(mutations, 0);
});
