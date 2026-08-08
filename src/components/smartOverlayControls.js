const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const { hasPremiumEntitlement } = require("../billing/billingService");

const ACTION_SELECT_ID = "ticket_control_action";
const AI_ON_VALUE = "ai_on";
const AI_OFF_VALUE = "ai_off";

function isPremium(options = {}) {
  return options.plan ? hasPremiumEntitlement(options.plan) : true;
}

function buildSmartOverlayContent(aiEnabled = true, options = {}) {
  const escalationEnabled = options.settings?.escalationEnabled !== false;
  const premiumEntitled = isPremium(options);

  return [
    "Hello 👋 I'm Pixy AI. Ask your question here and I'll try to help using this server's knowledge.",
    "",
    "**Smart Overlay**",
    "Pixy works alongside this server's existing ticket system and won't close, rename, move, or delete this ticket.",
    premiumEntitled && escalationEnabled
      ? "If human review is needed, Pixy can hand the conversation off to the configured support team."
      : premiumEntitled
        ? "Human handoff is currently disabled by this server's administrators."
        : "Pixy Pro ticket actions are unavailable on the current plan.",
    "",
    aiEnabled
      ? "🤖 **Pixy AI is ON**"
      : "⏸️ **Pixy AI is OFF** — server staff can resume it when needed.",
  ].join("\n");
}

function buildAiToggleOption(aiEnabled = true) {
  return new StringSelectMenuOptionBuilder()
    .setLabel(aiEnabled ? "Turn Pixy AI Off" : "Turn Pixy AI On")
    .setDescription(
      aiEnabled
        ? "Pause automatic AI replies in this ticket."
        : "Resume automatic AI replies in this ticket."
    )
    .setValue(aiEnabled ? AI_OFF_VALUE : AI_ON_VALUE)
    .setEmoji(aiEnabled ? "⏸️" : "▶️");
}

function buildSmartOverlayComponents(aiEnabled = true, options = {}) {
  const premiumEntitled = isPremium(options);

  if (!premiumEntitled) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(ACTION_SELECT_ID)
      .setPlaceholder("Select a Pixy AI action...")
      .addOptions(buildAiToggleOption(aiEnabled));
    return [new ActionRowBuilder().addComponents(selectMenu)];
  }

  if (options.settings?.escalationEnabled === false) return [];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(ACTION_SELECT_ID)
    .setPlaceholder("Need a human?")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Request Human Support")
        .setDescription("Ask Pixy to route this ticket to the right support team.")
        .setValue("escalate")
        .setEmoji("🤝")
    );

  return [new ActionRowBuilder().addComponents(selectMenu)];
}

function buildSmartOverlayPayload(aiEnabled = true, options = {}) {
  return {
    content: buildSmartOverlayContent(aiEnabled, options),
    components: buildSmartOverlayComponents(aiEnabled, options),
    allowedMentions: { parse: [] },
  };
}

module.exports = {
  ACTION_SELECT_ID,
  buildSmartOverlayComponents,
  buildSmartOverlayContent,
  buildSmartOverlayPayload,
};
