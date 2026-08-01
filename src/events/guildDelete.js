const { Events } = require("discord.js");
const {
  deleteGuildOperationalData,
} = require("../data/guildOperationalCleanup");

async function deleteRemovedGuildOperationalData(guild, options = {}) {
  if (!guild?.id) return null;
  const result = await deleteGuildOperationalData(guild.id, {
    client: options.client,
  });
  return result;
}

const event = {
  name: Events.GuildDelete,
  async execute(guild) {
    if (!guild?.id) return;
    try {
      const result = await deleteRemovedGuildOperationalData(guild);
      console.log(
        `Deleted ${result.totalDeleted} operational Pixy record(s) for removed guild ${guild.id}; billing continuity records were retained.`
      );
    } catch (error) {
      console.error(
        `Failed to delete operational data for removed guild ${guild.id}:`,
        error
      );
    }
  },
};

module.exports = Object.assign(event, {
  deleteRemovedGuildOperationalData,
});
