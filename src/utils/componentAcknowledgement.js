const DEFAULT_ACKNOWLEDGEMENT_DELAY_MS = 1000;

function isMessageComponentInteraction(interaction) {
  return Boolean(
    interaction?.isButton?.() ||
    interaction?.isStringSelectMenu?.() ||
    interaction?.isUserSelectMenu?.() ||
    interaction?.isRoleSelectMenu?.() ||
    interaction?.isChannelSelectMenu?.() ||
    interaction?.isMentionableSelectMenu?.()
  );
}

function startComponentAcknowledgementGuard(
  interaction,
  delayMs = DEFAULT_ACKNOWLEDGEMENT_DELAY_MS
) {
  if (!