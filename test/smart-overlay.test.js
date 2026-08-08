const assert = require("node:assert/strict");
const test = require("node:test");

const { BILLING_PLANS } = require("../src/billing/constants");
const {
  buildSmartOverlayPayload,
} = require("../src/components/smartOverlayControls");
const {
  TICKET_OPERATING_MODES,
  getTicketOperatingModePreferences,
  isFullTicketControlEnabled,
  resolveTicketOperatingMode,
} = require("../src/features/ticketOperatingMode");

function optionValues(payload) {
  return payload.components.flatMap((row) =>
    row.toJSON().components.flatMap((component) =>
      (component.options || []).map((option) => option.value)
    )
  );
}

test("smart overlay is the non-destructive preset", () => {
  const settings = getTicketOperatingModePreferences(TICKET_OPERATING_MODES.OVERLAY);

  assert.deepEqual(settings, {
    closeTicketEnabled: false,
    renameReviewEnabled: false,
    escalationEnabled: true,
  });
  assert.equal(resolveTicketOperatingMode(settings), TICKET_OPERATING_MODES.OVERLAY);
  assert.equal(isFullTicketControlEnabled(settings), false);
});

test("full mode explicitly opts into lifecycle controls", () => {
  const settings = getTicketOperatingModePreferences(TICKET_OPERATING_MODES.FULL);

  assert.equal(settings.closeTicketEnabled, true);
  assert.equal(settings.renameReviewEnabled, true);
  assert.equal(settings.escalationEnabled, true);
  assert.equal(resolveTicketOperatingMode(settings), TICKET_OPERATING_MODES.FULL);
  assert.equal(isFullTicketControlEnabled(settings), true);
});

test("premium overlay exposes only human handoff", () => {
  const payload = buildSmartOverlayPayload(true, {
    plan: BILLING_PLANS.PRO,
    settings: getTicketOperatingModePreferences(TICKET_OPERATING_MODES.OVERLAY),
  });

  assert.deepEqual(optionValues(payload), ["escalate"]);
  assert.match(payload.content, /won't close, rename, move, or delete/i);
});

test("expired overlay keeps only the staff AI toggle", () => {
  const payload = buildSmartOverlayPayload(true, {
    plan: BILLING_PLANS.EXPIRED,
    settings: getTicketOperatingModePreferences(TICKET_OPERATING_MODES.OVERLAY),
  });

  assert.deepEqual(optionValues(payload), ["ai_off"]);
  assert.match(payload.content, /ticket actions are unavailable/i);
});
