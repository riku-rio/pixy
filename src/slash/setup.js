const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} = require("discord.js");

const { prisma } = require("../config/prisma");

const EPHEMERAL = 64;
const CUSTOM_ID_PREFIX = "setup_ticket_category:";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Setup Pixy AI ticket category.")
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

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: "You need Administrator permission to use this command.",
        flags: EPHEMERAL,
      });
      return;
    }

    const selectMenu = new ChannelSelectMenuBuilder()
      .setCustomId(`${CUSTOM_ID_PREFIX}${interaction.user.id}`)
      .setPlaceholder("Select the ticket category")
      .setMinValues(1)
      .setMaxValues(1)
      .setChannelTypes(ChannelType.GuildCategory);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      content: "Choose the category where ticket channels are created:",
      components: [row],
      flags: EPHEMERAL,
    });
  },

  selectMenuHandlers: [
    {
      customIdPrefix: CUSTOM_ID_PREFIX,

      async execute(interaction) {
        if (!interaction.guild) {
          await interaction.update({
            content: "This can only be used inside a server.",
            components: [],
          });
          return;
        }

        const ownerUserId = interaction.customId.slice(CUSTOM_ID_PREFIX.length);

        if (interaction.user.id !== ownerUserId) {
          await interaction.reply({
            content: "Only the admin who used `/setup` can choose this category.",
            flags: EPHEMERAL,
          });
          return;
        }

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply({
            content: "You need Administrator permission to do this.",
            flags: EPHEMERAL,
          });
          return;
        }

        const categoryId = interaction.values[0];
        const category = interaction.guild.channels.cache.get(categoryId);

        if (!category || category.type !== ChannelType.GuildCategory) {
          await interaction.update({
            content: "Invalid category selected.",
            components: [],
          });
          return;
        }

        await prisma.guildConfig.upsert({
          where: {
            guildId: interaction.guild.id,
          },
          create: {
            guildId: interaction.guild.id,
            ticketCategoryId: category.id,
            enabled: true,
            maxLearnedItems: 20,
          },
          update: {
            ticketCategoryId: category.id,
            enabled: true,
          },
        });

        await interaction.update({
          content: `Done. Pixy AI ticket category has been saved as **${category.name}**.`,
          components: [],
        });
      },
    },
  ],
};
