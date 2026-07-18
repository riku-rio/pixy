const DAY_MS = 24 * 60 * 60 * 1000;

const PLAN_STATES = Object.freeze({
  FREE_NOT_ACTIVATED: "free_not_activated",
  TRIAL_ACTIVE: "trial_active",
  FREE_TRIAL_EXPIRED: "free_trial_expired",
});

const TRIAL_DURATION_DAYS = 7;
const TRIAL_DAILY_LIMIT = 1000;
const FREE_DAILY_LIMIT = 100;

function toUtcDayKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

function getNextUtcReset(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1
  ));
}

module.exports = {
  DAY_MS,
  PLAN_STATES,
  TRIAL_DURATION_DAYS,
  TRIAL_DAILY_LIMIT,
  FREE_DAILY_LIMIT,
  toUtcDayKey,
  getNextUtcReset,
};