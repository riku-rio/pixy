const { executePartner } = require("../billing/ownerCommandHandlers");

module.exports = {
  name: "partner",
  ownerOnly: true,
  minArgs: 1,
  maxArgs: 2,
  usage: "partner <add|remove> <guild-id> | partner list",
  async execute(message, args) {
    return executePartner(message, args);
  },
};
