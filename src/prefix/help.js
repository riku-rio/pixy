const { executeHelp } = require("../billing/ownerCommandHandlers");

module.exports = {
  name: "help",
  ownerOnly: true,
  maxArgs: 0,
  async execute(message) {
    return executeHelp(message);
  },
};
