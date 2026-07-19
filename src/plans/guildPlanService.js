const { prisma } = require("../config/prisma");
const { getOrCreateGuildSetting } = require("../config/ai");
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
      state: PLAN_STATES.FREE_NOT_ACTIVATED,
      dailyLimit: FREE_DAILY_LIMIT,
      canActivate: true,
      trialStartedAt: null,
      trialEndsAt: null,
    };
  }

  if (endsAt && current < endsAt) {
    const elapsedDays = Math.floor((current.getTime() - startedAt.getTime()) / DAY_MS);
    return {
      state: PLAN_STATES.TRIAL_ACTIVE,
      dailyLimit: TRIAL_DAILY_LIMIT,
      canActivate: false,
      trialStartedAt: startedAt,
      trialEndsAt: endsAt,
      trialDay: Math.max(1, Math.min(TRIAL_DURATION_DAYS, elapsedDays + 1)),
    };
  }

  return {
    state: PLAN_STATES.FREE_TRIAL_EXPIRED,
    dailyLimit: FREE_DAILY_LIMIT,
    canActivate: false,
    trialStartedAt: startedAt,
    trialEndsAt: endsAt,
  };
}

async function getGuildPlanStatus(guildId, now = new Date()) {
  const setting = await getOrCreateGuildSetting(guildId);
  return getPlanStatusFromSetting(setting, now);
}

async function activateGuildTrial(guildId, now = new Date()) {
  const current = now instanceof Date ? now : new Date(now);
  const setting = await getOrCreateGuildSetting(guildId);

  if (!setting.groqApiKeyEncrypted) {
    return { ok: false, code: "missing_groq_api_key" };
  }
  if (setting.trialStartedAt) {
    return { ok: false, code: "trial_already_used", status: getPlanStatusFromSetting(setting, current) };
  }

  const trialEndsAt = new Date(current.getTime() + TRIAL_DURATION_DAYS * DAY_MS);
  const updated = await prisma.guildSetting.updateMany({
    where: { guildId, trialStartedAt: null },
    data: { trialStartedAt: current, trialEndsAt },
  });
  if (updated.count !== 1) {
    return { ok: false, code: "trial_already_used", status: await getGuildPlanStatus(guildId, current) };
  }

  return {
    ok: true,
    status: {
      state: PLAN_STATES.TRIAL_ACTIVE,
      dailyLimit: TRIAL_DAILY_LIMIT,
      canActivate: false,
      trialStartedAt: current,
      trialEndsAt,
      trialDay: 1,
    },
  };
}

module.exports = {
  getPlanStatusFromSetting,
  getGuildPlanStatus,
  activateGuildTrial,
};