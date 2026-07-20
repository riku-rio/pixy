const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const { prisma } = require("../config/prisma");

const EPHEMERAL = 64;

async function getConfiguredTicketCategory(guildId) {
  return prisma.guildConfig.findUnique({
    where: { guildId },
    select: { ticketCategoryId: true },
  });
}

async function assertTicketCategoryChannel(interaction, channel) {
  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: "Select a normal text channel.",
      flags: EPHEMERAL,
    });
    return false;
  }

  const config = await getConfiguredTicketCategory(interaction.guild.id);
  if (!config?.ticketCategoryId) {
    await interaction.reply({
      content: "Configure the Pixy ticket category with `/pixy-setup` first.",
      flags: EPHEMERAL,
    });
    return false;
  }

  if (channel.parentId !== config.ticketCategoryId) {
    await interaction.reply({
      content: "That channel is not inside the configured Pixy ticket category.",
      flags: EPHEMERAL,
    });
    return false;
  }

  return true;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("blacklist")
    .setDescription("Manage channels excluded from Pixy AI.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("Choose what to do")
        .setRequired(true)
        .addChoices(
          { name: "Add", value: "add" },
          { name: "Remove", value: "remove" },
          { name: "List", value: "list" }
        )
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Ticket channel for add or remove")
        .addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Optional private admin note for add")
        .setMaxLength(300)
    ),
  guildOnly: true,
  userPermissions: [PermissionFlagsBits.Administrator],

  async execute(interaction) {
    const action = interaction.options.getString("action", true);

    if (action === "list") {
      const ignored = await prisma.guildIgnoredChannel.findMany({
        where: { guildId: interaction.guild.id },
        orderBy: { createdAt: "asc" },
        take: 50,
      });

      await interaction.reply({
        content: ignored.length
          ? [
              "**Channels excluded from Pixy AI**",
              ...ignored.map(
                (entry) =>
                  `- <#${entry.channelId}>${
                    entry.reason ? ` - ${entry.reason}` : ""
                  }`
              ),
            ].join("\n")
          : "No channels are excluded from Pixy AI.",
        flags: EPHEMERAL,
        allowedMentions: { parse: [] },
      });
      return;
    }

    const channel = interaction.options.getChannel("channel");
    if (!channel) {
      await interaction.reply({
        content: "Select a channel when using the add or remove action.",
        flags: EPHEMERAL,
      });
      return;
    }

    if (!(await assertTicketCategoryChannel(interaction, channel))) return;

    if (action === "add") {
      const reason = interaction.options.getString("reason")?.trim() || null;

      await prisma.$transaction([
        prisma.guildIgnoredChannel.upsert({
          where: {
            guildId_channelId: {
              guildId: interaction.guild.id,
              channelId: channel.id,
            },
          },
          create: {
            guildId: interaction.guild.id,
            channelId: channel.id,
            reason,
          },
          update: { reason },
        }),
        prisma.ticketChannel.deleteMany({
          where: {
            guildId: interaction.guild.id,
            channelId: channel.id,
          },
        }),
      ]);

      await interaction.reply({
        content: `<#${channel.id}> is now excluded. Pixy will not read, learn from, or reply in it.`,
        flags: EPHEMERAL,
        allowedMentions: { parse: [] },
      });
      return;
    }

    if (action === "remove") {
      const [removed] = await prisma.$transaction([
        prisma.guildIgnoredChannel.deleteMany({
          where: {
            guildId: interaction.guild.id,
            channelId: channel.id,
          },
        }),
        prisma.ticketChannel.upsert({
          where: { channelId: channel.id },
          create: {
            guildId: interaction.guild.id,
            channelId: channel.id,
            aiEnabled: true,
          },
          update: {
            guildId: interaction.guild.id,
            aiEnabled: true,
            closed: false,
            status: "open",
            closedAt: null,
            closedByAi: false,
          },
        }),
      ]);

      await interaction.reply({
        content: removed.count
          ? `<#${channel.id}> is no longer excluded from Pixy AI.`
          : `<#${channel.id}> was not on the Pixy blacklist.`,
        flags: EPHEMERAL,
        allowedMentions: { parse: [] },
      });
      return;
    }

    await interaction.reply({
      content: "Unsupported blacklist action.",
      flags: EPHEMERAL,
    });
  },
};
