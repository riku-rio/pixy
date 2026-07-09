const TICKET_ACTIONS = Object.freeze({
  CLOSE_TICKET: "close_ticket",
  RENAME_TICKET: "rename_ticket",
  ESCALATE_TICKET: "escalate_ticket",
});

const ALLOWED_TICKET_ACTIONS = new Set(Object.values(TICKET_ACTIONS));

function isAllowedTicketAction(action) {
  return ALLOWED_TICKET_ACTIONS.has(String(action || "").trim());
}

module.exports = {
  TICKET_ACTIONS,
  ALLOWED_TICKET_ACTIONS,
  isAllowedTicketAction,
};
