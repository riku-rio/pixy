const { executeActivate } = require("../billing/ownerCommandHandlers");

module.exports = {
  name: "activate",
  ownerOnly: true,
  argsRequired: true,
  minArgs: 1,
  maxArgs: 1,
  usage: "activate <guild-id>",
  async execute(message, args) {
    return executeActivate(message, args);
  },
};
