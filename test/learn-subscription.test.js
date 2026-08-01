const assert = require("node:assert/strict");
const test = require("node:test");

const {
  LEARN_WRITE_BLOCKED_MESSAGE,
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

for (const plan of ["trial", "pro", "partner"]) {
  for (const action of ["add-qna", "add-freeform"]) {
    test(`${action} is allowed for ${plan}`, async () => {
      const interaction = createCommandInteraction(action);
      const stopped = await stopUnavailableLearnWrite(interaction, {
        async getAvailability() {
          return {
            available: true,
            plan,
            premiumEntitled: true,
          };
        },
      });

      assert.equal(stopped, false);
      assert.deepEqual(interaction.replies, []);
    });
  }
}

test("legacy add action is treated as the Q&A premium write path", () => {
  assert.equal(getLearnWriteAction(createCommandInteraction("add")), "add");
});

test("expired add commands are blocked and direct administrators to billing", async () => {
  for (const action of ["add-qna", "add-freeform"]) {
    const interaction = createCommandInteraction(action);
    const stopped = await stopUnavailableLearnWrite(interaction, {
      async getAvailability() {
        return {
          available: false,
          code: "subscription_trial_expired",
          plan: "expired",
          premiumEntitled: false,
        };
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
      async getAvailability() {
        checks += 1;
        return {
          available: false,
          code: "subscription_trial_expired",
          plan: "expired",
          premiumEntitled: false,
        };
      },
    });

    assert.equal(checks, 1);
    assert.equal(stopped, true);
    assert.equal(interaction.replies.length, 1);
  }
});

test("list, delete, and clear remain available without loading billing", async () => {
  for (const action of ["list", "delete", "clear"]) {
    const interaction = createCommandInteraction(action);
    let checks = 0;
    const availability = await getLearnWriteAvailability(interaction, {
      async getAvailability() {
        checks += 1;
        throw new Error("read and delete actions must not check premium writes");
      },
    });

    assert.equal(checks, 0);
    assert.equal(availability.available, true);
    assert.equal(availability.gated, false);
    assert.equal(availability.action, null);
  }
});

test("delete and clear component flows are not classified as premium writes", () => {
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

    assert.equal(getLearnWriteAction(interaction), null);
  }
});
