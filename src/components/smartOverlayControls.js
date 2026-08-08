const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");

const ACTION_SELECT_ID = "ticket_control_action";

function buildSmartOverlayContent(aiEnabled = true, options = {}) {
  const escalationEnabled = options.settings?.escalationEnabled !== false;

  return [
    "Hello 👋 I'm Pixy AI. Ask your question here and I'll try to help using this server's knowledge.",
    "",
    "**Smart Overlay**",
    "Pixy works alongside this server's existing ticket system and won't close, rename, move, or delete this ticket.",
    escalationEnabled
      ? "If human review is needed, Pixy can hand the conversation off to the configured support team."
      : "Human handoff is currently disabled by this server's administrators.",
    "",
    aiEnabled
      ? "🤖 **Pixy AI is ON**"
      : "⏸️ **Pixy AI is OFF** — server staff can resume it when needed.",
  ].join("\n");
}

function buildSmartOverlayComponents(options = {}) {
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
    components: buildSmartOverlayComponents(options),
    allowedMentions: { parse: [] },
  };
}

module.exports = {
  ACTION_SELECT_ID,
  buildSmartOverlayComponents,
  buildSmartOverlayContent,
  buildSmartOverlayPayload,
};
