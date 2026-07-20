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
    .setDescription("Exclude specific ticket-category channels from Pixy AI.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Stop Pixy from reading or replying in a channel.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel to exclude")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Optional private admin note")
            .setMaxLength(300)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Allow Pixy AI in an excluded channel again.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel to restore")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List excluded channels.")
    ),
  guildOnly: true,
  userPermissions: [PermissionFlagsBits.Administrator],

  async execute(interaction) {
    const action = interaction.options.getSubcommand();

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
              ...ignored.map((entry) =>
                `- <#${entry.channelId}>${entry.reason ? ` — ${entry.reason}` : ""}`
              ),
            ].join("\n")
          : "No channels are excluded from Pixy AI.",
        flags: EPHEMERAL,
        allowedMentions: { parse: [] },
      });
      return;
    }

    const channel = interaction.options.getChannel("channel", true);
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
        prisma.ticketChannel.updateMany({
          where: { guildId: interaction.guild.id, channelId: channel.id },
          data: { aiEnabled: false },
        }),
      ]);

      await interaction.reply({
        content: `<#${channel.id}> is now excluded. Pixy will not read, learn from, or reply in it.`,
        flags: EPHEMERAL,
        allowedMentions: { parse: [] },
      });
      return;
    }

    const removed = await prisma.guildIgnoredChannel.deleteMany({
      where: { guildId: interaction.guild.id, channelId: channel.id },
    });
    await prisma.ticketChannel.updateMany({
      where: { guildId: interaction.guild.id, channelId: channel.id },
      data: { aiEnabled: true },
    });

    await interaction.reply({
      content: removed.count
        ? `<#${channel.id}> is no longer excluded from Pixy AI.`
        : `<#${channel.id}> was not on the Pixy blacklist.`,
      flags: EPHEMERAL,
      allowedMentions: { parse: [] },
    });
  },
};
