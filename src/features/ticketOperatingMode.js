const TICKET_OPERATING_MODES = Object.freeze({
  OVERLAY: "overlay",
  FULL: "full",
  CUSTOM: "custom",
});

function resolveTicketOperatingMode(settings = {}) {
  const escalationEnabled = settings?.escalationEnabled !== false;
  const closeTicketEnabled = settings?.closeTicketEnabled === true;
  const renameReviewEnabled = settings?.renameReviewEnabled === true;

  if (escalationEnabled && !closeTicketEnabled && !renameReviewEnabled) {
    return TICKET_OPERATING_MODES.OVERLAY;
  }

  if (escalationEnabled && closeTicketEnabled && renameReviewEnabled) {
    return TICKET_OPERATING_MODES.FULL;
  }

  return TICKET_OPERATING_MODES.CUSTOM;
}

function isFullTicketControlEnabled(settings = {}) {
  return resolveTicketOperatingMode(settings) === TICKET_OPERATING_MODES.FULL;
}

function getTicketOperatingModePreferences(mode) {
  if (mode === TICKET_OPERATING_MODES.OVERLAY) {
    return {
      closeTicketEnabled: false,
      renameReviewEnabled: false,
      escalationEnabled: true,
    };
  }

  if (mode === TICKET_OPERATING_MODES.FULL) {
    return {
      closeTicketEnabled: true,
      renameReviewEnabled: true,
      escalationEnabled: true,
    };
  }

  return null;
}

module.exports = {
  TICKET_OPERATING_MODES,
  getTicketOperatingModePreferences,
  isFullTicketControlEnabled,
  resolveTicketOperatingMode,
};
