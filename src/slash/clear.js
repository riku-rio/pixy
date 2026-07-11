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

function hasAdminPermission(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
}

async function assertOwnerAndAdmin(interaction, ownerUserId) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "This can only be used inside a server.",
      flags: EPHEMERAL,
    });
    return false;
  }

  if (interaction.user.id !== ownerUserId) {
    await interaction.reply({
      content: "Only the administrator who used `/pixy-clear` can confirm this action.",
      flags: EPHEMERAL,
    });
    return false;
  }

  if (!hasAdminPermission(interaction)) {
    await interaction.reply({
      content: "You need Administrator permission to use this action.",
      flags: EPHEMERAL,
    });
    return false;
  }

  return true;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Delete all Pixy data stored for this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  guildOnly: true,
  userPermissions: [PermissionFlagsBits.Administrator],

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used inside a server.",
        flags: EPHEMERAL,
      });
      return;
    }

    if (!hasAdminPermission(interaction)) {
      await interaction.reply({
        content: "You need Administrator permission to use this command.",
        flags: EPHEMERAL,
      });
      return;
    }

    const confirmButton = new ButtonBuilder()
      .setCustomId(`${CONFIRM_PREFIX}${interaction.user.id}`)
      .setLabel("Delete server data")
      .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
      .setCustomId(`${CANCEL_PREFIX}${interaction.user.id}`)
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    await interaction.reply({
      content: [
        "This will permanently delete all Pixy data stored for this server, including:",
        "- Ticket and escalation categories",
        "- Learned knowledge",
        "- Ticket records",
        "- Admin routes",
        "- AI configuration and usage logs",
        "",
        "Discord channels and roles themselves will not be deleted.",
        "You will need to run `/pixy-setup` again afterward.",
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

        const guildId = interaction.guild.id;

        const [usageLogs, ticketChannels, learnedAnswers, adminRoutes, guildConfigs] =
          await prisma.$transaction([
            prisma.aiUsageLog.deleteMany({ where: { guildId } }),
            prisma.ticketChannel.deleteMany({ where: { guildId } }),
            prisma.learnedAnswer.deleteMany({ where: { guildId } }),
            prisma.adminRoute.deleteMany({ where: { guildId } }),
            prisma.guildConfig.deleteMany({ where: { guildId } }),
          ]);

        const totalDeleted =
          usageLogs.count +
          ticketChannels.count +
          learnedAnswers.count +
          adminRoutes.count +
          guildConfigs.count;

        await interaction.update({
          content: [
            "Done. All Pixy database data for this server has been deleted.",
            `Deleted records: **${totalDeleted}**`,
            "Run `/pixy-setup` to configure the server again.",
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

        await interaction.update({
          content: "Cancelled. No Pixy data was deleted.",
          components: [],
        });
      },
    },
  ],
};
