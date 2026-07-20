const assert = require("node:assert/strict");
const test = require("node:test");
const { getDisabledActionCode } = require("../src/features/guildFeatureGate");
const { TICKET_ACTIONS } = require("../src/utils/tickets/actions/ticketActionTypes");

const enabled = {
  agentActionsEnabled: true,
  closeTicketEnabled: true,
  renameReviewEnabled: true,
  escalationEnabled: true,
};

test("enabled actions are allowed", () => {
  assert.equal(getDisabledActionCode(enabled, TICKET_ACTIONS.CLOSE_TICKET), null);
  assert.equal(getDisabledActionCode(enabled, TICKET_ACTIONS.RENAME_TICKET), null);
  assert.equal(getDisabledActionCode(enabled, TICKET_ACTIONS.ESCALATE_TICKET), null);
});

test("close ticket flag blocks close actions", () => {
  assert.equal(
    getDisabledActionCode({ ...enabled, closeTicketEnabled: false }, TICKET_ACTIONS.CLOSE_TICKET),
    "close_ticket_disabled"
  );
});

test("agent actions flag blocks every ticket action", () => {
  for (const action of Object.values(TICKET_ACTIONS)) {
    assert.equal(getDisabledActionCode({ ...enabled, agentActionsEnabled: false }, action), "agent_actions_disabled");
  }
});

test("rename and escalation flags block their own actions", () => {
  assert.equal(
    getDisabledActionCode({ ...enabled, renameReviewEnabled: false }, TICKET_ACTIONS.RENAME_TICKET),
    "rename_review_disabled"
  );
  assert.equal(
    getDisabledActionCode({ ...enabled, escalationEnabled: false }, TICKET_ACTIONS.ESCALATE_TICKET),
    "escalation_disabled"
  );
});
