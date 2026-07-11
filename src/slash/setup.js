const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
} = require("discord.js");

const { prisma } = require("../config/prisma");

const EPHEMERAL = 64;

const SELECT_EXISTING_BUTTON_PREFIX = "setup_select_category_existing:";
const CREATE_AUTO_BUTTON_PREFIX = "setup_create_category_auto:";
const CATEGORY_SELECT_PREFIX = "setup_category_select:";

const AUTO_CATEGORY_NAMES = [
  "pixy-tickets",
  "pixy-support-tickets",
  "pixy-help-tickets",
];

async function getBotMember(guild) {
  if (!guild) return null;

  if (guild.members?.me) {
    return guild.members.me;
  }

  try {
    return await guild.members.fetchMe();
  } catch {
    return null;
  }
}

async function botCanManageGuildChannels(guild) {
  const botMember = await getBotMember(guild);

  if (!botMember) return false;

  return botMember.permissions.has(PermissionFlagsBits.ManageChannels);
}

async function createOrFindAutoCategory(guild) {
  await guild.channels.fetch().catch(() => null);

  const categories = guild.channels.cache.filter((channel) => {
    return channel.type === ChannelType.GuildCategory;
  });

  function findByName(name) {
    const wanted = String(name || "").toLowerCase();

    return categories.find((category) => {
      return String(category.name || "").toLowerCase() === wanted;
    });
  }

  const existingCategory = AUTO_CATEGORY_NAMES
    .map((name) => findByName(name))
    .find(Boolean);

  if (existingCategory) {
    return {
      category: existingCategory,
      created: false,
    };
  }

  const category = await guild.channels.create({
    name: AUTO_CATEGORY_NAMES[0],
    type: ChannelType.GuildCategory,
    reason: "Pixy AI ticket category setup",
  });

  return {
    category,
    created: true,
  };
}

function parseOwnerUserId(customId, prefix) {
  return String(customId || "").slice(prefix.length);
}

function buildCategoryChoicePayload({ ownerUserId, currentCategory }) {
  const selectExistingButton = new ButtonBuilder()
    .setCustomId(`${SELECT_EXISTING_BUTTON_PREFIX}${ownerUserId}`)
    .setLabel("Select existing category")
    .setStyle(ButtonStyle.Primary);

  const createAutoButton = new ButtonBuilder()
    .setCustomId(`${CREATE_AUTO_BUTTON_PREFIX}${ownerUserId}`)
    .setLabel("Create automatically")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(
    selectExistingButton,
    createAutoButton
  );

  const lines = [];

  if (currentCategory) {
    lines.push(`Current ticket category: **${currentCategory.name}**`);
    lines.push("");
  } else {
    lines.push("Ticket category is not configured yet.");
    lines.push("");
  }

  lines.push("Choose where Pixy should create ticket channels:");

  return {
    content: lines.join("\n"),
    components: [row],
  };
}

function buildCategorySelectPayload({ ownerUserId }) {
  const selectMenu = new ChannelSelectMenuBuilder()
    .setCustomId(`${CATEGORY_SELECT_PREFIX}${ownerUserId}`)
    .setPlaceholder("Select the ticket category")
    .setMinValues(1)
    .setMaxValues(1)
    .setChannelTypes(ChannelType.GuildCategory);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  return {
    content: "Choose the category where ticket channels are created:",
    components: [row],
  };
}

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

    const config = await prisma.guildConfig.findUnique({
      where: { guildId: interaction.guild.id },
    });

    let currentCategory = null;

    if (config?.ticketCategoryId) {
      const cached = interaction.guild.channels.cache.get(config.ticketCategoryId);

      if (cached?.type === ChannelType.GuildCategory) {
        currentCategory = cached;
      }
    }

    await interaction.reply({
      ...buildCategoryChoicePayload({
        ownerUserId: interaction.user.id,
        currentCategory,
      }),
      flags: EPHEMERAL,
    });
  },

  buttonHandlers: [
    {
      customIdPrefix: SELECT_EXISTING_BUTTON_PREFIX,

      async execute(interaction) {
        const ownerUserId = parseOwnerUserId(
          interaction.customId,
          SELECT_EXISTING_BUTTON_PREFIX
        );

        if (!interaction.guild) {
          await interaction.update({
            content: "This can only be used inside a server.",
            components: [],
          });
          return;
        }

        if (interaction.user.id !== ownerUserId) {
          await interaction.reply({
            content: "Only the admin who used `/pixy-setup` can use this interaction.",
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

        await interaction.update(
          buildCategorySelectPayload({ ownerUserId })
        );
      },
    },
    {
      customIdPrefix: CREATE_AUTO_BUTTON_PREFIX,

      async execute(interaction) {
        const ownerUserId = parseOwnerUserId(
          interaction.customId,
          CREATE_AUTO_BUTTON_PREFIX
        );

        if (!interaction.guild) {
          await interaction.update({
            content: "This can only be used inside a server.",
            components: [],
          });
          return;
        }

        if (interaction.user.id !== ownerUserId) {
          await interaction.reply({
            content: "Only the admin who used `/pixy-setup` can use this interaction.",
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

        const canManageChannels = await botCanManageGuildChannels(
          interaction.guild
        );

        if (!canManageChannels) {
          await interaction.update({
            content:
              "I need **Manage Channels** permission to create the ticket category automatically.",
            components: [],
          });
          return;
        }

        const result = await createOrFindAutoCategory(interaction.guild);

        if (!result.category) {
          await interaction.update({
            content:
              "I could not create or find a ticket category. Please choose an existing category instead.",
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
            ticketCategoryId: result.category.id,
            enabled: true,
            maxLearnedItems: 20,
          },
          update: {
            ticketCategoryId: result.category.id,
            enabled: true,
          },
        });

        const verb = result.created ? "created and saved" : "saved";

        await interaction.update({
          content: `Done. Ticket category has been ${verb} as **${result.category.name}**.`,
          components: [],
        });
      },
    },
  ],

  selectMenuHandlers: [
    {
      customIdPrefix: CATEGORY_SELECT_PREFIX,

      async execute(interaction) {
        const ownerUserId = parseOwnerUserId(
          interaction.customId,
          CATEGORY_SELECT_PREFIX
        );

        if (!interaction.guild) {
          await interaction.update({
            content: "This can only be used inside a server.",
            components: [],
          });
          return;
        }

        if (interaction.user.id !== ownerUserId) {
          await interaction.reply({
            content: "Only the admin who used `/pixy-setup` can choose this category.",
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

