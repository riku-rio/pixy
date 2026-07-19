const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { prisma } = require("../config/prisma");
const { defaultAiConfig, getOrCreateGuildSetting } = require("../config/ai");
const {
  getBadWordsStats,
  addCustomBadWord,
  removeCustomBadWord,
} = require("../utils/badWords");
const configurationPanel = require("../components/guildConfigurationPanel");

const EPHEMERAL = 64;
const PREFIX = {
  HOME: "settings_home:",
  BACK: "settings_back:",
  NAV: "settings_nav:",
  TOGGLE: "settings_toggle:",
  CLOSE: "settings_close:",
  BADWORD_ACTION: "settings_badwords_action:",
  BADWORD_REMOVE: "settings_badwords_remove:",
  BADWORD_MODAL: "settings_badwords_modal:",
};
const PAGES = {
  HOME: "home",
  FEATURES: "features",
  ESCALATION: "escalation",
  AIAPI: "aiapi",
  BADWORDS: "badwords",
  PLANS: "plans",
};
const FEATURE_OPTIONS = Object.freeze([
  Object.freeze({
    field: "aiReplyEnabled",
    label: "AI Reply",
    description: "Enable or disable automatic AI ticket replies",
    emoji: "🤖",
  }),
  Object.freeze({
    field: "closeTicketEnabled",
    label: "Close Ticket",
    description: "Allow Pixy to close tickets after validation",
    emoji: "🔒",
  }),
  Object.freeze({
    field: "renameReviewEnabled",
    label: "Rename Review",
    description: "Enable or disable AI review for ticket names",
    emoji: "✏️",
  }),
  Object.freeze({
    field: "escalationEnabled",
    label: "Escalation",
    description: "Enable or disable ticket escalation",
    emoji: "🚨",
  }),
  Object.freeze({
    field: "agentActionsEnabled",
    label: "Agent Actions",
    description: "Allow Pixy to perform validated ticket actions",
    emoji: "🛠️",
  }),
]);
const FEATURE_FIELDS = new Set(FEATURE_OPTIONS.map((option) => option.field));
const scoped = (prefix, userId) => `${prefix}${userId}`;

async function assertOwner(interaction, userId) {
  if (
    !interaction.guild ||
    interaction.user.id !== userId ||
    !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
  ) {
    await interaction.reply({
      content: "Only the administrator who opened /pixy-settings can use this control.",
      flags: EPHEMERAL,
    });
    return false;
  }
  return true;
}

function nav(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(scoped(PREFIX.HOME, userId))
      .setLabel("Home")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(scoped(PREFIX.BACK, userId))
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(scoped(PREFIX.CLOSE, userId))
      .setLabel("Close")
      .setStyle(ButtonStyle.Secondary)
  );
}

function home() {
  return new EmbedBuilder()
    .setTitle("🤖 Pixy Settings")
    .setColor(0x5865f2)
    .setDescription([
      "Select a category below to configure Pixy for this server.",
      "",
      "Each page shows its own current status and controls, keeping this home page clean and easy to navigate.",
    ].join("\n"));
}

function homeComponents(userId) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`${PREFIX.NAV}${userId}`)
    .setPlaceholder("Select a settings category...")
    .addOptions(
      {
        label: "Features",
        description: "Enable or disable Pixy's server features",
        value: PAGES.FEATURES,
        emoji: "📝",
      },
      {
        label: "Escalation",
        description: "View escalation category, notifications, and routes",
        value: PAGES.ESCALATION,
        emoji: "🚨",
      },
      {
        label: "AI API",
        description: "Manage the Groq API key and model",
        value: PAGES.AIAPI,
        emoji: "🔑",
      },
      {
        label: "Bad Words",
        description: "Manage custom words blocked during rename review",
        value: PAGES.BADWORDS,
        emoji: "🚫",
      },
      {
        label: "Plans & Usage",
        description: "View allowance, usage, reset, and trial status",
        value: PAGES.PLANS,
        emoji: "📊",
      }
    );

  return [new ActionRowBuilder().addComponents(menu)];
}

async function features(guildId) {
  const setting = await getOrCreateGuildSetting(guildId);
  return new EmbedBuilder()
    .setTitle("📝 Feature Settings")
    .setColor(0x5865f2)
    .setDescription("Each feature is a simple enabled or disabled setting for this server.")
    .addFields(
      ...FEATURE_OPTIONS.map((option) => ({
        name: option.label,
        value: setting[option.field] ? "✅ Enabled" : "❌ Disabled",
        inline: true,
      }))
    );
}

function featureComponents(userId) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(scoped(PREFIX.TOGGLE, userId))
    .setPlaceholder("Select a feature to toggle...")
    .addOptions(
      ...FEATURE_OPTIONS.map((option) => ({
        label: `Toggle ${option.label}`,
        description: option.description,
        value: option.field,
        emoji: option.emoji,
      }))
    );

  return [new ActionRowBuilder().addComponents(menu), nav(userId)];
}

async function escalation(guildId) {
  const [config, setting, routeCount] = await Promise.all([
    prisma.guildConfig.findUnique({ where: { guildId } }),
    getOrCreateGuildSetting(guildId),
    prisma.adminRoute.count({ where: { guildId, enabled: true } }),
  ]);

  return new EmbedBuilder()
    .setTitle("🚨 Escalation Settings")
    .setColor(0xed4245)
    .setDescription("Use /pixy-admins to change escalation routes and channels.")
    .addFields(
      {
        name: "Feature",
        value: setting.escalationEnabled ? "✅ Enabled" : "❌ Disabled",
        inline: true,
      },
      {
        name: "Category",
        value: config?.escalationCategoryId
          ? `<#${config.escalationCategoryId}>`
          : "Not configured",
        inline: true,
      },
      {
        name: "Notifications",
        value: config?.escalationNotificationChannelId
          ? `<#${config.escalationNotificationChannelId}>`
          : "Not configured",
        inline: true,
      },
      {
        name: "Routes",
        value: `${routeCount}/${config?.maxAdminRoutes || defaultAiConfig.maxAdminRoutesPerGuild}`,
        inline: true,
      }
    );
}

async function badwords(guildId) {
  const stats = await getBadWordsStats(guildId);
  const embed = new EmbedBuilder()
    .setTitle("🚫 Bad Words Settings")
    .setColor(0xeb459e)
    .addFields(
      { name: "Built-in", value: String(stats.builtInCount), inline: true },
      { name: "Custom", value: `${stats.customCount}/${stats.maxCustom}`, inline: true }
    );

  if (stats.customWords.length) {
    embed.addFields({
      name: "Custom list",
      value: `\`${stats.customWords.slice(0, 20).join(", ")}\``,
    });
  }

  return embed;
}

function badwordComponents(userId) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(scoped(PREFIX.BADWORD_ACTION, userId))
    .setPlaceholder("Select an action...")
    .addOptions(
      {
        label: "Add Custom Word",
        description: "Add a word to this server's custom blocked list",
        value: "add",
        emoji: "➕",
      },
      {
        label: "Remove Custom Word",
        description: "Remove a word from this server's custom blocked list",
        value: "remove",
        emoji: "➖",
      }
    );

  return [new ActionRowBuilder().addComponents(menu), nav(userId)];
}

async function render(page, guildId, userId) {
  if (page === PAGES.AIAPI) {
    return configurationPanel.renderAiApi(guildId, userId, "settings");
  }
  if (page === PAGES.PLANS) {
    return configurationPanel.renderPlans(guildId, userId, "settings");
  }
  if (page === PAGES.FEATURES) {
    return {
      content: null,
      embeds: [await features(guildId)],
      components: featureComponents(userId),
    };
  }
  if (page === PAGES.ESCALATION) {
    return {
      content: null,
      embeds: [await escalation(guildId)],
      components: [nav(userId)],
    };
  }
  if (page === PAGES.BADWORDS) {
    return {
      content: null,
      embeds: [await badwords(guildId)],
      components: badwordComponents(userId),
    };
  }
  return {
    content: null,
    embeds: [home()],
    components: homeComponents(userId),
  };
}

async function returnHome(interaction, userId) {
  if (!(await assertOwner(interaction, userId))) return;
  await interaction.update(await render(PAGES.HOME, interaction.guild.id, userId));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("Configure Pixy AI settings for this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  guildOnly: true,
  userPermissions: [PermissionFlagsBits.Administrator],

  async execute(interaction) {
    await getOrCreateGuildSetting(interaction.guild.id);
    await interaction.reply({
      ...(await render(PAGES.HOME, interaction.guild.id, interaction.user.id)),
      flags: EPHEMERAL,
    });
  },

  selectMenuHandlers: [
    {
      customIdPrefix: PREFIX.NAV,
      type: "string",
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.NAV.length);
        if (!(await assertOwner(interaction, userId))) return;
        await interaction.deferUpdate();
        await interaction.editReply(
          await render(interaction.values[0], interaction.guild.id, userId)
        );
      },
    },
    {
      customIdPrefix: PREFIX.TOGGLE,
      type: "string",
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.TOGGLE.length);
        if (!(await assertOwner(interaction, userId))) return;

        const field = interaction.values[0];
        if (!FEATURE_FIELDS.has(field)) return;

        const setting = await getOrCreateGuildSetting(interaction.guild.id);
        await prisma.guildSetting.update({
          where: { guildId: interaction.guild.id },
          data: { [field]: !setting[field] },
        });
        await interaction.update(
          await render(PAGES.FEATURES, interaction.guild.id, userId)
        );
      },
    },
    {
      customIdPrefix: PREFIX.BADWORD_ACTION,
      type: "string",
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.BADWORD_ACTION.length);
        if (!(await assertOwner(interaction, userId))) return;

        if (interaction.values[0] === "add") {
          const modal = new ModalBuilder()
            .setCustomId(scoped(PREFIX.BADWORD_MODAL, userId))
            .setTitle("Add Custom Bad Word")
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId("word")
                  .setLabel("Word to add")
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true)
              )
            );
          return interaction.showModal(modal);
        }

        const stats = await getBadWordsStats(interaction.guild.id);
        if (!stats.customWords.length) {
          return interaction.update({
            content: "No custom words to remove.",
            embeds: [],
            components: [nav(userId)],
          });
        }

        const menu = new StringSelectMenuBuilder()
          .setCustomId(scoped(PREFIX.BADWORD_REMOVE, userId))
          .setPlaceholder("Select a word to remove...")
          .addOptions(
            stats.customWords.slice(0, 25).map((word) => ({
              label: word,
              description: "Remove this word from the custom blocked list",
              value: word,
            }))
          );

        return interaction.update({
          content: "Select a word to remove:",
          embeds: [],
          components: [new ActionRowBuilder().addComponents(menu), nav(userId)],
        });
      },
    },
    {
      customIdPrefix: PREFIX.BADWORD_REMOVE,
      type: "string",
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.BADWORD_REMOVE.length);
        if (!(await assertOwner(interaction, userId))) return;
        await removeCustomBadWord(interaction.guild.id, interaction.values[0]);
        await interaction.update(
          await render(PAGES.BADWORDS, interaction.guild.id, userId)
        );
      },
    },
  ],

  buttonHandlers: [
    {
      customIdPrefix: PREFIX.HOME,
      async execute(interaction) {
        return returnHome(
          interaction,
          interaction.customId.slice(PREFIX.HOME.length)
        );
      },
    },
    {
      customIdPrefix: PREFIX.BACK,
      async execute(interaction) {
        return returnHome(
          interaction,
          interaction.customId.slice(PREFIX.BACK.length)
        );
      },
    },
    {
      customIdPrefix: PREFIX.CLOSE,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.CLOSE.length);
        if (!(await assertOwner(interaction, userId))) return;
        await interaction.update({
          content: "Settings panel closed.",
          embeds: [],
          components: [],
        });
      },
    },
    {
      customIdPrefix: "guild_config:settings:home:",
      async execute(interaction) {
        return returnHome(interaction, interaction.customId.split(":")[3]);
      },
    },
    {
      customIdPrefix: "guild_config:settings:back:",
      async execute(interaction) {
        return returnHome(interaction, interaction.customId.split(":")[3]);
      },
    },
  ],

  modalHandlers: [
    {
      customIdPrefix: PREFIX.BADWORD_MODAL,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.BADWORD_MODAL.length);
        if (!(await assertOwner(interaction, userId))) return;

        const result = await addCustomBadWord(
          interaction.guild.id,
          interaction.fields.getTextInputValue("word").trim()
        );
        await interaction.reply({
          content: result.ok
            ? "Custom word added."
            : `Could not add that word: ${result.code}.`,
          ...(await render(PAGES.BADWORDS, interaction.guild.id, userId)),
          flags: EPHEMERAL,
        });
      },
    },
  ],
};
