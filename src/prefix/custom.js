const { executeCustom } = require("../billing/ownerCommandHandlers");

module.exports = {
  name: "custom",
  ownerOnly: true,
  argsRequired: true,
  minArgs: 2,
  maxArgs: 2,
  usage: "custom <guild-id> <duration>",
  async execute(message, args) {
    return executeCustom(message, args);
  },
};
