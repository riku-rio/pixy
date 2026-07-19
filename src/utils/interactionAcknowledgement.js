const { MessageFlags } = require("discord.js");

const DEFAULT_ACKNOWLEDGEMENT_DELAY_MS = 1200;
const STATE = Symbol("pixyInteractionAcknowledgementState");

function isAnySelectMenu(interaction) {
  return Boolean(
    interaction?.isStringSelectMenu?.() ||
      interaction?.isUserSelectMenu?.() ||
      interaction?.isRoleSelectMenu?.() ||
      interaction?.isChannelSelectMenu?.() ||
      interaction?.isMention