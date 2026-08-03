const { executeStatus } = require("../billing/ownerCommandHandlers");
const { executeStatusAnalysis } = require("../analytics/statusAnalysisCommand");

module.exports = {
  name: "status",
  ownerOnly: true,
  argsRequired: true,
  minArgs: 1,
  maxArgs: 1,
  usage: "status <guild-id|analyze>",
  async execute(message, args) {
    if (String(args[0] || "").trim().toLowerCase() === "analyze") {
      return executeStatusAnalysis(message);
    }
    return executeStatus(message, args);
  },
};
