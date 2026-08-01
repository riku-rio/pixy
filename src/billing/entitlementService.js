const { BILLING_CAPABILITIES } = require("./constants");
const {
  getPlanCapabilities,
  hasPremiumEntitlement,
  loadBillingState,
  normalizeGuildId,
  resolveEffectivePlan,
} = require("./billingService");
const { getDisabledActionCode } = require("../features/guildFeatureRules");
const {
  TICKET_ACTIONS,
} = require("../utils/tickets/actions/ticketActionTypes");

const SUBSCRIPTION_REJECTION_CODES = Object.freeze({
  TRIAL_EXPIRED: "subscription_trial_expired",
  PRO_REQUIRED: "subscription_pro_required",
});

const SUBSCRIPTION_REJECTION_MESSAGES = Object.freeze({
  [SUBSCRIPTION_REJECTION_CODES.TRIAL_EXPIRED]:
    "This server's seven-day Pixy Pro Trial has ended. Ask a server administrator to activate Pixy Pro to use this action.",
  [SUBSCRIPTION_REJECTION_CODES.PRO_REQUIRED]:
    "This action requires Pixy Pro. Ask a server administrator to activate Pixy Pro for this server.",
});

const ACTION_CAPABILITY_MAP = Object.freeze({
  [TICKET_ACTIONS.CLOSE_TICKET]: BILLING_CAPABILITIES.CLOSE_TICKET,
  [TICKET_ACTIONS.RENAME_TICKET]: BILLING_CAPABILITIES.RENAME_TICKET,
  [TICKET_ACTIONS.ESCALATE_TICKET]: BILLING_CAPABILITIES.ESCALATE_TICKET,
});

function getDefaultPrisma() {
  return require("../config/prisma").prisma;
}

function getSubscriptionRejectionCode(billing, now = new Date()) {
  const plan = resolveEffectivePlan(billing, now);
  if (hasPremiumEntitlement(plan)) return null;

  return billing?.trialStartedAt || billing?.trialEndsAt
    ? SUBSCRIPTION_REJECTION_CODES.TRIAL_EXPIRED
    : SUBSCRIPTION_REJECTION_CODES.PRO_REQUIRED;
}

function isSubscriptionRejectionCode(code) {
  return Object.values(SUBSCRIPTION_REJECTION_CODES).includes(code);
}

function getSubscriptionRejectionMessage(code) {
  return SUBSCRIPTION_REJECTION_MESSAGES[code] || null;
}

function getSubscriptionRejectionStatus(code) {
  return isSubscriptionRejectionCode(code)
    ? `action_rejected:${code}`
    : null;
}

async function loadGuildFeatureSettings(guildId, options = {}) {
  const normalizedGuildId = normalizeGuildId(guildId);
  const client = options.client || getDefaultPrisma();

  return client.guildSetting.findUnique({
    where: { guildId: normalizedGuildId },
    select: {
      closeTicketEnabled: true,
      renameReviewEnabled: true,
      escalationEnabled: true,
      agentActionsEnabled: true,
    },
  });
}

function getFeatureRejectionForCapability(settings, capability) {
  if (capability === BILLING_CAPABILITIES.AGENT_ACTIONS) {
    return settings?.agentActionsEnabled === false
      ? "agent_actions_disabled"
      : null;
  }

  const action = Object.entries(ACTION_CAPABILITY_MAP)
    .find(([, mappedCapability]) => mappedCapability === capability)?.[0];

  return action ? getDisabledActionCode(settings, action) : null;
}

function resolveCapabilityAvailability({ billing, settings, capability, now }) {
  const plan = resolveEffectivePlan(billing, now);
  const premiumEntitled = hasPremiumEntitlement(plan);
  const capabilities = getPlanCapabilities(plan);

  if (capabilities[capability] !== true) {
    return {
      available: false,
      code: getSubscriptionRejectionCode(billing, now),
      plan,
      premiumEntitled,
      billing,
      settings,
      capability,
    };
  }

  const featureRejection = getFeatureRejectionForCapability(settings, capability);
  if (featureRejection) {
    return {
      available: false,
      code: featureRejection,
      plan,
      premiumEntitled,
      billing,
      settings,
      capability,
    };
  }

  return {
    available: true,
    code: null,
    plan,
    premiumEntitled,
    billing,
    settings,
    capability,
  };
}

async function hasGuildPremiumEntitlement(guildId, options = {}) {
  const billing = await loadBillingState(guildId, options);
  return hasPremiumEntitlement(
    resolveEffectivePlan(billing, options.now ?? new Date())
  );
}

async function getGuildPremiumCapabilityAvailability(
  guildId,
  capability,
  options = {}
) {
  const normalizedGuildId = normalizeGuildId(guildId);
  const client = options.client || getDefaultPrisma();
  const now = options.now ?? new Date();

  const [billing, settings] = await Promise.all([
    loadBillingState(normalizedGuildId, { client }),
    loadGuildFeatureSettings(normalizedGuildId, { client }),
  ]);

  return resolveCapabilityAvailability({
    billing,
    settings,
    capability,
    now,
  });
}

async function getGuildTicketActionAvailability(
  guildId,
  action,
  options = {}
) {
  const capability = ACTION_CAPABILITY_MAP[action];
  if (!capability) {
    return {
      available: false,
      code: "unsupported_ticket_action",
      action,
      capability: null,
    };
  }

  const availability = await getGuildPremiumCapabilityAvailability(
    guildId,
    capability,
    options
  );

  return { ...availability, action };
}

async function getGuildAgentActionAvailability(guildId, options = {}) {
  return getGuildPremiumCapabilityAvailability(
    guildId,
    BILLING_CAPABILITIES.AGENT_ACTIONS,
    options
  );
}

module.exports = {
  ACTION_CAPABILITY_MAP,
  SUBSCRIPTION_REJECTION_CODES,
  SUBSCRIPTION_REJECTION_MESSAGES,
  getFeatureRejectionForCapability,
  getGuildAgentActionAvailability,
  getGuildPremiumCapabilityAvailability,
  getGuildTicketActionAvailability,
  getSubscriptionRejectionCode,
  getSubscriptionRejectionMessage,
  getSubscriptionRejectionStatus,
  hasGuildPremiumEntitlement,
  isSubscriptionRejectionCode,
  loadGuildFeatureSettings,
  resolveCapabilityAvailability,
};
