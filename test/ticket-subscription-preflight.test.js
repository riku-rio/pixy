const assert = require("node:assert/strict");
const test = require("node:test");

const { DAY_MS } = require("../src/billing/constants");
const {
  SUBSCRIPTION_REJECTION_CODES,
} = require("../src/billing/entitlementService");
const {
  ACTION_SELECT_ID,
  DISABLED_MESSAGES,
  getTicketActionAvailability,
} = require("../src/features/ticketActionAvailability");
const {
  stopUnavailableTicketAction,
} = require("../src/events/interactionCreate");
const {
  AI_OFF_VALUE,
  buildCombinedTicketControlComponents,
} = require("../src/components/ticketAiControls");

const NOW = new Date("2026-08-01T12:00:00.000Z");

function createExpiredClient() {
  return {
    ticketChannel: {
      async findUnique() {
        return { closed: false, aiEnabled: true };
      },
    },
    guildBilling: {
      async findUnique() {
        return {
          guildId: "guild-1",
          trialStartedAt: new Date(NOW.getTime() - 8 * DAY_MS),
          trialEndsAt: new Date(NOW.getTime() - DAY_MS),
        };
      },
    },
    guildSetting: {
      async findUnique() {
        return {
          agentActionsEnabled: true,
          closeTicketEnabled: true,
          renameReviewEnabled: true,
          escalationEnabled: true,
        };
      },
    },
    adminRoute: {
      async findMany() {
        throw new Error("support routes must not be queried after subscription rejection");
      },
    },
  };
}

function createInteraction({ customId, value, stringSelect = false }) {
  return {
    customId,
    values: value ? [value] : [],
    guild: {
      id: "guild-1",
      roles: {
        cache: new Map(),
        async fetch() {},
      },
    },
    channel: { id: "channel-1" },
    memberPermissions: { has: () => false },
    isStringSelectMenu: () => stringSelect,
  };
}

const PREMIUM_COMPONENT_PATHS = [
  {
    name: "close action select",
    customId: ACTION_SELECT_ID,
    value: "close",
    stringSelect: true,
  },
  {
    name: "rename action select",
    customId: ACTION_SELECT_ID,
    value: "rename",
    stringSelect: true,
  },
  {
    name: "escalate action select",
    customId: ACTION_SELECT_ID,
    value: "escalate",
    stringSelect: true,
  },
  {
    name: "close confirmation button",
    customId: "ticket_control_close_confirm:user-1:channel-1",
  },
  {
    name: "AI escalation button",
    customId: "ticket_control_escalate_ai:user-1:channel-1",
  },
  {
    name: "manual escalation button",
    customId: "ticket_control_escalate_choose:user-1:channel-1",
  },
  {
    name: "escalation role select",
    customId: "ticket_control_escalate_role_select:user-1:channel-1",
    value: "role-1",
    stringSelect: true,
  },
  {
    name: "rename modal",
    customId: "ticket_control_rename_modal:user-1:channel-1",
  },
  {
    name: "AI escalation modal",
    customId: "ticket_control_escalate_ai_modal:user-1:channel-1",
  },
  {
    name: "selected-role escalation modal",
    customId: "ticket_control_escalate_role_modal:user-1:channel-1:role-1",
  },
];

for (const componentPath of PREMIUM_COMPONENT_PATHS) {
  test(`expired subscription rejects ${componentPath.name}`, async () => {
    const availability = await getTicketActionAvailability(
      createInteraction(componentPath),
      { client: createExpiredClient(), now: NOW }
    );

    assert.equal(availability.available, false);
    assert.equal(
      availability.code,
      SUBSCRIPTION_REJECTION_CODES.TRIAL_EXPIRED
    );
    assert.equal(availability.refreshControls, true);
    assert.equal(availability.aiEnabled, true);
    assert.equal(
      availability.message,
      DISABLED_MESSAGES[SUBSCRIPTION_REJECTION_CODES.TRIAL_EXPIRED]
    );
  });
}

test("subscription preflight replies and refreshes stale shared controls", async () => {
  const replies = [];
  const refreshes = [];
  const interaction = {
    replied: false,
    deferred: false,
    async reply(payload) {
      replies.push(payload);
      this.replied = true;
    },
  };

  const stopped = await stopUnavailableTicketAction(interaction, {
    async getAvailability() {
      return {
        available: false,
        code: SUBSCRIPTION_REJECTION_CODES.TRIAL_EXPIRED,
        message:
          DISABLED_MESSAGES[SUBSCRIPTION_REJECTION_CODES.TRIAL_EXPIRED],
        refreshControls: true,
        aiEnabled: false,
      };
    },
    async refreshControlMessage(subject, aiEnabled) {
      refreshes.push([subject, aiEnabled]);
      return { ok: true };
    },
  });

  assert.equal(stopped, true);
  assert.equal(replies.length, 1);
  assert.equal(replies[0].flags, 64);
  assert.match(replies[0].content, /Trial has ended/);
  assert.deepEqual(refreshes, [[interaction, false]]);
});

test("expired ticket control rendering removes every premium action", () => {
  const rows = buildCombinedTicketControlComponents(true, {
    premiumEntitled: false,
  });
  const payload = rows[0].toJSON();
  const values = payload.components[0].options.map((option) => option.value);

  assert.deepEqual(values, [AI_OFF_VALUE]);
});
