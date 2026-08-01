const { executeResub } = require("../billing/ownerCommandHandlers");

module.exports = {
  name: "resub",
  ownerOnly: true,
  argsRequired: true,
  minArgs: 1,
  maxArgs: 1,
  usage: "resub <guild-id>",
  async execute(message, args) {
    return executeResub(message, args);
  },
};
