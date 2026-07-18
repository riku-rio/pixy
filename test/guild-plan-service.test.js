const assert = require("node:assert/strict");
const test = require("node:test");
const {
  getPlanStatusFromSetting,
} = require("../src/plans/guildPlanService");
const {
  PLAN_STATES,
  FREE_DAILY_LIMIT,
  TRIAL_DAILY_LIMIT,
} = require("../src/plans/planConstants");

test("unactivated guild receives the standard free allowance", () => {
  const status = getPlanStatusFromSetting({}, new Date("2026-07-18T00:00:00.000Z"));
  assert.equal(status.state, PLAN_STATES.FREE_NOT_ACTIVATED);
  assert.equal(status.dailyLimit, FREE_DAILY_LIMIT);
  assert.equal(status.canActivate, true);
});

test("trial remains active immediately before its end", () => {
  const setting = {
    trialStartedAt: new Date("2026-07-18T00:00:00.000Z"),
    trialEndsAt: new Date("2026-07-25T00:00:00.000Z"),
  };
  const status = getPlanStatusFromSetting(setting, new Date("2026-07-24T23:59:59.999Z"));
  assert.equal(status.state, PLAN_STATES.TRIAL_ACTIVE);
  assert.equal(status.dailyLimit, TRIAL_DAILY_LIMIT);
  assert.equal(status.trialDay, 7);
});

test("trial expires exactly at trialEndsAt", () => {
  const setting = {
    trialStartedAt: new Date("2026-07-18T00:00:00.000Z"),
    trialEndsAt: new Date("2026-07-25T00:00:00.000Z"),
  };
  const status = getPlanStatusFromSetting(setting, new Date("2026-07-25T00:00:00.000Z"));
  assert.equal(status.state, PLAN_STATES.FREE_TRIAL_EXPIRED);
  assert.equal(status.dailyLimit, FREE_DAILY_LIMIT);
  assert.equal(status.canActivate, false);
});
