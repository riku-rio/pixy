const { AsyncLocalStorage } = require("node:async_hooks");

const guildContext = new AsyncLocalStorage();

function runWithGuildContext(guildId, callback) {
  return guildContext.run(
    { guildId: guildId ? String(guildId) : null },
    callback
  );
}

function getCurrentGuildId() {
  return guildContext.getStore()?.guildId || null;
}

module.exports = {
  getCurrentGuildId,
  runWithGuildContext,
};
