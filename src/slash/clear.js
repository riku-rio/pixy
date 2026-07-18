const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { prisma } = require("../config/prisma");

const EPHEMERAL = 64;
const CONFIRM_PREFIX = "clear_guild_confirm:";
const CANCEL_PREFIX = "clear_guild_cancel:";

async function assertOwnerAndAdmin(interaction, ownerUserId) {
  if (!interaction.guild || interaction.user.id !== ownerUserId || !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: "Only the administrator who used /pixy-clear can confirm this action.", flags: EPHEMERAL });
    return false;
  }
  return true;
}

module.exports = {
  data: new SlashCommandBuilder().setName("clear").setDescription("Delete all Pixy data stored for this server.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  guildOnly: true,
  userPermissions: [PermissionFlagsBits.Administrator],
  async execute(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${CONFIRM_PREFIX}${interaction.user.id}`).setLabel("Delete server data").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`${CANCEL_PREFIX}${interaction.user.id}`).setLabel("Cancel").setStyle(ButtonStyle.Secondary)
    );
    await interaction.reply({
      content: [
        "This permanently deletes all Pixy data stored for this server, including:",
        "- Ticket and escalation configuration",
        "- Learned knowledge and ticket records",
        "- Admin routes and AI usage logs",
        "- Feature settings, model selection, and the encrypted Groq credential",
        "- Trial activation history and daily usage totals",
        "",
        "Discord channels and roles themselves are not deleted.",
      ].join("\n"),
      components: [row],
      flags: EPHEMERAL,
    });
  },
  buttonHandlers: [
    {
      customIdPrefix: CONFIRM_PREFIX,
      async execute(interaction) {
        const ownerUserId = interaction.customId.slice(CONFIRM_PREFIX.length);
        if (!(await assertOwnerAndAdmin(interaction, ownerUserId))) return;
        await interaction.deferUpdate();
        const guildId = interaction.guild.id;
        const results = await prisma.$transaction([
          prisma.guildDailyAiUsage.deleteMany({ where: { guildId } }),
          prisma.aiUsageLog.deleteMany({ where: { guildId } }),
          prisma.ticketChannel.deleteMany({ where: { guildId } }),
          prisma.learnedAnswer.deleteMany({ where: { guildId } }),
          prisma.adminRoute.deleteMany({ where: { guildId } }),
          prisma.guildSetting.deleteMany({ where: { guildId } }),
          prisma.guildConfig.deleteMany({ where: { guildId } }),
        ]);
        const totalDeleted = results.reduce((sum, result) => sum + result.count, 0);
        await interaction.editReply({
          content: [
            "Done. All Pixy database data for this server has been deleted.",
            `Deleted records: **${totalDeleted}**`,
            "The Groq credential, trial history, and usage totals were removed. Run /pixy-setup to configure the server again.",
          ].join("\n"),
          components: [],
        });
      },
    },
    {
      customIdPrefix: CANCEL_PREFIX,
      async execute(interaction) {
        const ownerUserId = interaction.customId.slice(CANCEL_PREFIX.length);
        if (!(await assertOwnerAndAdmin(interaction, ownerUserId))) return;
        await interaction.update({ content: "Cancelled. No Pixy data was deleted.", components: [] });
      },
    },
  ],
};
