const assert = require("node:assert/strict");
const test = require("node:test");

const {
  BILLING_EVENT_ACTIONS,
  BILLING_PLANS,
  DAY_MS,
} = require("../src/billing/constants");
const {
  addPartner,
  listActivePartners,
  removePartner,
} = require("../src/billing/ownerBillingService");
const {
  executePartner,
} = require("../src/billing/ownerCommandHandlers");
const partnerCommand = require("../src/prefix/partner");
const {
  GUILD_ID,
  NOW,
  OWNER_ID,
  createFakeBillingClient,
  makeGuild,
  makeMessage,
} = require("./helpers/ownerBillingFakes");

const refreshOk = async () => ({ ok: true });

async function rejectCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.code, code);
    return true;
  });
}

test("partner command is owner-only and documents its complete syntax", () => {
  assert.equal(partnerCommand.ownerOnly, true);
  assert.equal(partnerCommand.minArgs, 1);
  assert.equal(partnerCommand.maxArgs, 2);
  assert.match(partnerCommand.usage, /add\|remove/);
  assert.match(partnerCommand.usage, /partner list/);
});

test("partner add preserves Trial and Pro dates, audits, and refreshes after commit", async () => {
  const trialStartedAt = new Date(NOW.getTime() - DAY_MS);
  const trialEndsAt = new Date(NOW.getTime() + 3 * DAY_MS);
  const proStartedAt = new Date(NOW.getTime() - 2 * DAY_MS);
  const proEndsAt = new Date(NOW.getTime() + 20 * DAY_MS);
  const client = createFakeBillingClient({
    id: "billing-1",
    guildId: GUILD_ID,
    trialStartedAt,
    trialEndsAt,
    proStartedAt,
    proEndsAt,
    partnerActive: false,
    partnerSince: null,
  });
  const refreshCalls = [];

  const result = await addPartner(GUILD_ID, OWNER_ID, {
    client,
    now: NOW,
    refreshControls: async (guildId) => {
      refreshCalls.push([guildId, client.snapshot().events.length]);
      return { ok: true };
    },
  });

  assert.equal(result.after.partnerActive, true);
  assert.equal(result.after.partnerSince.getTime(), NOW.getTime());
  assert.equal(result.after.trialStartedAt.getTime(), trialStartedAt.getTime());
  assert.equal(result.after.trialEndsAt.getTime(), trialEndsAt.getTime());
  assert.equal(result.after.proStartedAt.getTime(), proStartedAt.getTime());
  assert.equal(result.after.proEndsAt.getTime(), proEndsAt.getTime());
  assert.equal(result.beforeSummary.plan, BILLING_PLANS.PRO);
  assert.equal(result.afterSummary.plan, BILLING_PLANS.PARTNER);
  assert.equal(result.event.action, BILLING_EVENT_ACTIONS.PARTNER_ADDED);
  assert.deepEqual(refreshCalls, [[GUILD_ID, 1]]);
});

test("partner add rejects an already-active Partner without another audit", async () => {
  const client = createFakeBillingClient({
    id: "billing-1",
    guildId: GUILD_ID,
    partnerActive: true,
    partnerSince: new Date(NOW.getTime() - DAY_MS),
  });

  await rejectCode(
    addPartner(GUILD_ID, OWNER_ID, {
      client,
      now: NOW,
      refreshControls: refreshOk,
    }),
    "partner_already_active"
  );
  assert.equal(client.snapshot().events.length, 0);
});

test("partner remove preserves Trial and Pro dates and resolves every fallback", async () => {
  const cases = [
    {
      name: "Pro",
      expected: BILLING_PLANS.PRO,
      trialEndsAt: new Date(NOW.getTime() + 2 * DAY_MS),
      proEndsAt: new Date(NOW.getTime() + 5 * DAY_MS),
    },
    {
      name: "Trial",
      expected: BILLING_PLANS.TRIAL,
      trialEndsAt: new Date(NOW.getTime() + 2 * DAY_MS),
      proEndsAt: new Date(NOW.getTime() - DAY_MS),
    },
    {
      name: "Expired",
      expected: BILLING_PLANS.EXPIRED,
      trialEndsAt: new Date(NOW.getTime() - DAY_MS),
      proEndsAt: new Date(NOW.getTime() - DAY_MS),
    },
  ];

  for (const entry of cases) {
    const trialStartedAt = new Date(NOW.getTime() - 10 * DAY_MS);
    const proStartedAt = new Date(NOW.getTime() - 5 * DAY_MS);
    const client = createFakeBillingClient({
      id: `billing-${entry.name}`,
      guildId: GUILD_ID,
      trialStartedAt,
      trialEndsAt: entry.trialEndsAt,
      proStartedAt,
      proEndsAt: entry.proEndsAt,
      partnerActive: true,
      partnerSince: new Date(NOW.getTime() - 3 * DAY_MS),
    });

    const result = await removePartner(GUILD_ID, OWNER_ID, {
      client,
      now: NOW,
      refreshControls: refreshOk,
    });

    assert.equal(result.after.partnerActive, false);
    assert.equal(result.after.partnerSince, null);
    assert.equal(result.after.trialStartedAt.getTime(), trialStartedAt.getTime());
    assert.equal(result.after.trialEndsAt.getTime(), entry.trialEndsAt.getTime());
    assert.equal(result.after.proStartedAt.getTime(), proStartedAt.getTime());
    assert.equal(result.after.proEndsAt.getTime(), entry.proEndsAt.getTime());
    assert.equal(result.fallbackPlan, entry.expected);
    assert.equal(result.afterSummary.plan, entry.expected);
    assert.equal(result.event.action, BILLING_EVENT_ACTIONS.PARTNER_REMOVED);
    assert.equal(result.event.metadata.fallbackPlan, entry.expected);
  }
});

test("partner remove rejects a non-Partner safely", async () => {
  const client = createFakeBillingClient({
    id: "billing-1",
    guildId: GUILD_ID,
    partnerActive: false,
    partnerSince: null,
  });
  await rejectCode(
    removePartner(GUILD_ID, OWNER_ID, {
      client,
      now: NOW,
      refreshControls: refreshOk,
    }),
    "partner_not_active"
  );
  assert.equal(client.snapshot().events.length, 0);
});

test("partner list returns active rows and the command safely paginates IDs", async () => {
  const knownGuild = makeGuild(GUILD_ID, "Known Partner Guild");
  const rows = Array.from({ length: 90 }, (_, index) => ({
    guildId: index === 0
      ? GUILD_ID
      : (300000000000000000n + BigInt(index)).toString(),
    partnerActive: true,
    partnerSince: new Date(NOW.getTime() - index * DAY_MS),
  }));
  const client = createFakeBillingClient(null, { partnerRows: rows });
  assert.equal((await listActivePartners({ client })).length, 90);

  const { message, replies } = makeMessage({ guild: knownGuild });
  await executePartner(message, ["list"], {
    client,
    listActivePartners: async () => rows,
  });

  assert.ok(replies.length > 1);
  assert.ok(replies.every((payload) => payload.content.length <= 2000));
  assert.ok(replies.every((payload) => payload.allowedMentions.parse.length === 0));
  const combined = replies.map((payload) => payload.content).join("\n");
  assert.match(combined, /Known Partner Guild/);
  for (const row of rows) assert.match(combined, new RegExp(row.guildId));
});

test("partner add command requires Pixy access to the guild", async () => {
  const { message, replies } = makeMessage({ guild: null });
  await executePartner(message, ["add", GUILD_ID], {
    client: createFakeBillingClient(null),
  });
  assert.equal(replies.length, 1);
  assert.match(replies[0].content, /cannot access that guild/i);
});
