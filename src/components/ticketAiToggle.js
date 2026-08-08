const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");

const ACTION_SELECT_ID = "ticket_control_action";
const AI_ON_VALUE = "ai_on";
const AI_OFF_VALUE = "ai_off";

function buildTicketAiOption(aiEnabled = true) {
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

function buildAiOnlyTicketControlComponents(aiEnabled = true) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(ACTION_SELECT_ID)
    .setPlaceholder("Control Pixy AI...")
    .addOptions(buildTicketAiOption(aiEnabled));

  return [new ActionRowBuilder().addComponents(selectMenu)];
}

module.exports = {
  ACTION_SELECT_ID,
  AI_ON_VALUE,
  AI_OFF_VALUE,
  buildAiOnlyTicketControlComponents,
  buildTicketAiOption,
};
