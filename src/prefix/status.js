const { executeStatus } = require("../billing/ownerCommandHandlers");

module.exports = {
  name: "status",
  ownerOnly: true,
  argsRequired: true,
  minArgs: 1,
  maxArgs: 1,
  usage: "status <guild-id>",
  async execute(message, args) {
    return executeStatus(message, args);
  },
};
