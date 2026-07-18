const { prisma } = require("../config/prisma");
const {
  DAY_MS,
  PLAN_STATES,
  TRIAL_DURATION_DAYS,
  TRIAL_DAILY_LIMIT,
  FREE_DAILY_LIMIT,
} = require("./planConstants");

function getPlanStatusFromSetting(setting, now = new Date()) {
  const current = now instanceof Date ? now : new Date(now);
  const startedAt = setting?.trialStartedAt ? new Date(setting.trialStartedAt) : null;
  const endsAt = setting?.trialEndsAt ? new Date(setting.trialEndsAt) : null;

  if (!startedAt) {
    return {
