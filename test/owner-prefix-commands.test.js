const assert = require("node:assert/strict");
const test = require("node:test");

const { BILLING_EVENT_ACTIONS, BILLING_PLANS, DAY_MS } = require("../src/billing/constants");
const { OwnerCommandInputError } = require("../src/billing/ownerCommandUtils");
const {
  buildOwnerHelpPayload,
  executeActivate,
  executeHelp,
  executeStatus,
} = require("../src/billing/ownerCommandHandlers");
const messageCreate = require("../src/events/messageCreate");
const activateCommand = require("../src/prefix/activate");
const customCommand = require("../src/prefix/custom");
const deactivateCommand = require("../src/prefix/deactivate");
const helpCommand = require("../src/prefix/help");
const resubCommand = require("../src/prefix/resub");
const statusCommand = require("../src/prefix/status");
const {
  GUILD_ID,
  NOW,
  OTHER_USER_ID,
  OWNER_ID,
  makeGuild,
  makeMessage,
} = require("./helpers/ownerBillingFakes");

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("all Phase 9 commands are owner-only and enforce exact argument counts", () => {
  const commands = [
    [helpCommand, 0, 0],
    [activateCommand, 1, 1],
    [resubCommand, 1, 1],
    [customCommand, 2, 2],
    [deactivateCommand, 1, 1],
    [statusCommand, 1, 1],
  ];
  for (const [command, minArgs, maxArgs] of commands) {
    assert.equal(command.ownerOnly, true);
    assert.equal(Number(command.minArgs || 0), minArgs);
    assert.equal(Number(command.maxArgs), maxArgs);
  }
});

test("owner help documents billing, analysis, Partner syntax, duration units, and examples", () => {
  const content = buildOwnerHelpPayload(makeMessage().message).content;
  for (const expected of [
    "^activate <guild-id>",
    "^resub <guild-id>",
    "^custom <guild-id> <duration>",
    "^deactivate <guild-id>",
    "^status <guild-id>",
    "^status analyze",
    "^partner add <guild-id>",
    "^partner remove <guild-id>",
    "^partner list",
    "YES / NOT YET / NO",
    "30-day months",
    "365-day years",
    "14d",
    "8w",
    "6m",
    "1y",
  ]) {
    assert.match(content, new RegExp(escapePattern(expected)));
  }
});

test("owner help replies in channel and stays silent for non-owners", async () => {
  const owner = makeMessage();
  assert.deepEqual(await executeHelp(owner.message), { delivered: "channel" });
  assert.equal(owner.replies.length, 1);
  assert.equal(owner.dms.length, 0);
  assert.deepEqual(owner.replies[0].allowedMentions, { parse: [] });

  const unauthorized = makeMessage({ authorId: OTHER_USER_ID });
  unauthorized.message.content = "^help";
  unauthorized.message.client.prefixCommands.set("help", helpCommand);
  await messageCreate.execute(unauthorized.message);
  assert.deepEqual(unauthorized.replies, []);
  assert.deepEqual(unauthorized.dms, []);
});

test("activate handler requires accessible guild and shows previous and new effective plans", async () => {
  const output = makeMessage();
  await executeActivate(output.message, [GUILD_ID], {
    resolveAccessibleGuild: async () => makeGuild(),
    activatePro: async () => ({
      beforeSummary: { planLabel: "Trial" },
      afterSummary: { planLabel: "Pro", plan: BILLING_PLANS.PRO },
      after: {
        proStartedAt: NOW,
        proEndsAt: new Date(NOW.getTime() + 30 * DAY_MS),
      },
    }),
  });
  assert.match(output.replies[0].content, /Previous effective plan:\*\* Trial/);
  assert.match(output.replies[0].content, /New effective plan:\*\* Pro/);
  assert.deepEqual(output.replies[0].allowedMentions, { parse: [] });

  const blocked = makeMessage({ guild: null });
  await executeActivate(blocked.message, [GUILD_ID], {
    resolveAccessibleGuild: async () => {
      throw new OwnerCommandInputError(
        "guild_unavailable",
        "Pixy cannot access that guild."
      );
    },
  });
  assert.match(blocked.replies[0].content, /cannot access/i);
});

test("status handler displays initialized, uninitialized, Partner fallback, and latest actor", async () => {
  const empty = makeMessage();
  await executeStatus(empty.message, [GUILD_ID], {
    resolveAccessibleGuild: async () => makeGuild(),
    loadOwnerBillingStatus: async () => ({
      summary: {
        initialized: false,
        plan: BILLING_PLANS.EXPIRED,
        planLabel: "Expired",
        remainingLabel: "0 days",
        trial: { startedAt: null, endsAt: null, active: false },
        pro: { startedAt: null, endsAt: null, active: false },
        partner: { active: false, startedAt: null },
      },
      latestEvent: null,
    }),
  });
  assert.match(empty.replies[0].content, /Not initialized/);
  assert.match(empty.replies[0].content, /Latest billing event:\*\* None recorded/);

  const partner = makeMessage();
  await executeStatus(partner.message, [GUILD_ID], {
    resolveAccessibleGuild: async () => makeGuild(),
    loadOwnerBillingStatus: async () => ({
      summary: {
        initialized: true,
        plan: BILLING_PLANS.PARTNER,
        planLabel: "Partner",
        remainingLabel: "Unlimited",
        fallbackPlanLabel: "Pro",
        trial: {
          startedAt: NOW,
          endsAt: new Date(NOW.getTime() + DAY_MS),
          active: true,
        },
        pro: {
          startedAt: NOW,
          endsAt: new Date(NOW.getTime() + 2 * DAY_MS),
          active: true,
        },
        partner: { active: true, startedAt: NOW },
      },
      latestEvent: {
        action: BILLING_EVENT_ACTIONS.PRO_ACTIVATED,
        actorUserId: OWNER_ID,
        createdAt: NOW,
      },
    }),
  });
  for (const expected of [
    "Effective plan:** Partner",
    "Trial:** Active",
    "Pro:** Active",
    "Partner:** Active",
    "Fallback beneath Partner:** Pro",
    BILLING_EVENT_ACTIONS.PRO_ACTIVATED,
    OWNER_ID,
  ]) {
    assert.match(partner.replies[0].content, new RegExp(escapePattern(expected)));
  }
});
