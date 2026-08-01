const assert = require("node:assert/strict");
const test = require("node:test");

const {
  BILLING_CAPABILITIES,
} = require("../src/billing/constants");
const {
  LEARN_WRITE_BLOCKED_MESSAGE,
  getLearnCommandAction,
  getLearnWriteAction,
  getLearnWriteAvailability,
  stopUnavailableLearnWrite,
} = require("../src/features/learnSubscription");

function createCommandInteraction(action) {
  const replies = [];
  return {
    replies,
    commandName: "pixy-learn",
    guild: { id: "guild-1" },
    options: {
      getString(name) {
        assert.equal(name, "action");
        return action;
      },
    },
    isChatInputCommand() {
      return true;
    },
    isModalSubmit() {
      return false;
    },
    async reply(payload) {
      replies.push(payload);
    },
  };
}

function createModalInteraction(customId) {
  const replies = [];
  return {
    replies,
    customId,
    guild: { id: "guild-1" },
    isChatInputCommand() {
      return false;
    },
    isModalSubmit() {
      return true;
    },
    async reply(payload) {
      replies.push(payload);
    },
  };
}

function createEntitlement(plan, writeAvailable) {
  return {
    guildId: "guild-1",
    plan,
    premiumEntitled: writeAvailable,
    billing: plan === "expired"
      ? {
        guildId: "guild-1",
        trialStartedAt: new Date("2026-07-01T00:00:00.000Z"),
        trialEndsAt: new Date("2026-07-08T00:00:00.000Z"),
      }
      : { guildId: "guild-1" },
    capabilities: {
      [BILLING_CAPABILITIES.LEARNED_KNOWLEDGE_WRITE]: writeAvailable,
    },
  };
}

for (const plan of ["trial", "pro", "partner"]) {
  for (const action of ["add-qna", "add-freeform"]) {
    test(`${action} is allowed for ${plan}`, async () => {
      const interaction = createCommandInteraction(action);
      const stopped = await stopUnavailableLearnWrite(interaction, {
        async loadEntitlement() {
          return createEntitlement(plan, true);
        },
      });

      assert.equal(stopped, false);
      assert.deepEqual(interaction.replies, []);
    });
  }
}

test("legacy add action is treated as the Q&A premium write path", () => {
  assert.equal(getLearnCommandAction(createCommandInteraction("add")), "add");
  assert.equal(getLearnWriteAction(createCommandInteraction("add")), "add");
});

test("expired add commands are blocked and direct administrators to billing", async () => {
  for (const action of ["add-qna", "add-freeform"]) {
    const interaction = createCommandInteraction(action);
    const stopped = await stopUnavailableLearnWrite(interaction, {
      async loadEntitlement() {
        return createEntitlement("expired", false);
      },
    });

    assert.equal(stopped, true);
    assert.equal(interaction.replies.length, 1);
    assert.equal(interaction.replies[0].content, LEARN_WRITE_BLOCKED_MESSAGE);
    assert.match(interaction.replies[0].content, /\/pixy-billing/);
  }
});

test("Q&A and free-form modals recheck entitlement after being opened", async () => {
  for (const customId of [
    "learn_add_qna:admin-1",
    "learn_add_freeform:admin-1",
  ]) {
    const interaction = createModalInteraction(customId);
    let checks = 0;
    const stopped = await stopUnavailableLearnWrite(interaction, {
      async loadEntitlement() {
        checks += 1;
        return createEntitlement("expired", false);
      },
    });

    assert.equal(checks, 1);
    assert.equal(stopped, true);
    assert.equal(interaction.replies.length, 1);
  }
});

test("list, delete, and clear resolve the effective plan but remain available when expired", async () => {
  for (const action of ["list", "delete", "clear"]) {
    const interaction = createCommandInteraction(action);
    let checks = 0;
    const availability = await getLearnWriteAvailability(interaction, {
      async loadEntitlement() {
        checks += 1;
        return createEntitlement("expired", false);
      },
    });

    assert.equal(checks, 1);
    assert.equal(availability.planResolved, true);
    assert.equal(availability.plan, "expired");
    assert.equal(availability.available, true);
    assert.equal(availability.gated, false);
    assert.equal(availability.action, action);
  }
});

test("delete and clear component flows remain outside the premium write gate", async () => {
  for (const customId of [
    "learn_delete:admin-1",
    "learn_delete_select:admin-1",
    "learn_clear_confirm:admin-1",
    "learn_clear_cancel:admin-1",
    "learn_list:admin-1:0",
  ]) {
    const interaction = {
      customId,
      isChatInputCommand() {
        return false;
      },
      isModalSubmit() {
        return customId.startsWith("learn_delete:");
      },
    };
    let checks = 0;
    const availability = await getLearnWriteAvailability(interaction, {
      async loadEntitlement() {
        checks += 1;
        throw new Error("delete and clear components must not be gated");
      },
    });

    assert.equal(getLearnWriteAction(interaction), null);
    assert.equal(availability.available, true);
    assert.equal(availability.gated, false);
    assert.equal(checks, 0);
  }
});
