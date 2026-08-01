const { executeDeactivate } = require("../billing/ownerCommandHandlers");

module.exports = {
  name: "deactivate",
  ownerOnly: true,
  argsRequired: true,
  minArgs: 1,
  maxArgs: 1,
  usage: "deactivate <guild-id>",
  async execute(message, args) {
    return executeDeactivate(message, args);
  },
};
