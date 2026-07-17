const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
} = require("discord.js");

const { prisma } = require("../config/prisma");
const { defaultAiConfig, getOrCreateGuildSetting } = require("../config/ai");
const {
  getBadWordsStats,
  addCustomBadWord,
  removeCustomBadWord,
} = require("../utils/badWords");

const EPHEMERAL = 64;

// Custom ID prefixes
const HOME_PREFIX = "settings_home:";
const NAV_PREFIX = "settings_nav:";
const TOGGLE_PREFIX = "settings_toggle:";
const BADWORD_ADD_PREFIX = "settings_badwords_add:";
const BADWORD_REMOVE_PREFIX = "settings_badwords_remove:";
const CLOSE_PREFIX = "settings_close:";

// Pages
const PAGES = {
  HOME: "home",
  FEATURES: "features",
  ESCALATION: "escalation",
  AIAPI: "aiapi",
  BADWORDS: "badwords",
  PLANS: "plans",
};

// Helper functions
function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function createResponder(interaction) {
  return (payload) => {
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply(payload);
    }
    return interaction.update(payload);
  };
}

function buildScopedId(prefix, userId) {
  return `${prefix}${userId}`;
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
      content: "Only the admin who used `/pixy-settings` can use this interaction.",
      flags: EPHEMERAL,
    });
    return false;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: "You need Administrator permission to use this.",
      flags: EPHEMERAL,
    });
    return false;
  }

  return true;
}

// Build navigation buttons
function buildNavButtons(userId, page) {
  const homeButton = new ButtonBuilder()
    .setCustomId(`${HOME_PREFIX}${userId}`)
    .setLabel("Home")
    .setEmoji("🏠")
    .setStyle(ButtonStyle.Secondary);

  const backButton = new ButtonBuilder()
    .setCustomId(`${NAV_PREFIX}${userId}:${PAGES.HOME}`)
    .setLabel("Back")
    .setEmoji("◀️")
    .setStyle(ButtonStyle.Secondary);

  const closeButton = new ButtonBuilder()
    .setCustomId(`${CLOSE_PREFIX}${userId}`)
    .setLabel("Close")
    .setEmoji("✖️")
    .setStyle(ButtonStyle.Secondary);

  return [new ActionRowBuilder().addComponents(homeButton, backButton, closeButton)];
}

// Build home page
async function buildHomePage(guildId) {
  const setting = await getOrCreateGuildSetting(guildId);
  const badWordsStats = await getBadWordsStats(guildId);

  const embed = new EmbedBuilder()
    .setTitle("🤖 Pixy Settings")
    .setDescription(
      "Configure Pixy AI for your server. Select a category below to manage settings."
    )
    .setColor(0x5865f2)
    .addFields(
      {
        name: "📝 Features",
        value: [
          `AI Reply: ${setting.aiReplyEnabled ? "✅" : "❌"}`,
          `Close Ticket: ${setting.closeTicketEnabled ? "✅" : "❌"}`,
          `Rename Review: ${setting.renameReviewEnabled ? "✅" : "❌"}`,
          `Escalation: ${setting.escalationEnabled ? "✅" : "❌"}`,
          `Agent Actions: ${setting.agentActionsEnabled ? "✅" : "❌"}`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "🔑 AI-API",
        value: [
          `API Key: ${setting.groqApiKey ? "✅ Configured" : "❌ Not Set"}`,
          `Model: \`${setting.aiModel || defaultAiConfig.groq.model}\``,
        ].join("\n"),
        inline: true,
      },
      {
        name: "🚫 Bad Words",
        value: [
          `Built-in: ${badWordsStats.builtInCount} words`,
          `Custom: ${badWordsStats.customCount}/${badWordsStats.maxCustom}`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "📊 Plan",
        value: `Current: **${setting.plan.charAt(0).toUpperCase() + setting.plan.slice(1)}**`,
        inline: true,
      }
    )
    .setFooter({ text: "Select a category from the menu below" });

  return embed;
}

// Build home select menu
function buildHomeSelectMenu(userId) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`${NAV_PREFIX}${userId}:home_select`)
    .setPlaceholder("Select a settings category...")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Features")
        .setDescription("Toggle AI features on/off")
        .setEmoji("📝")
        .setValue(PAGES.FEATURES),
      new StringSelectMenuOptionBuilder()
        .setLabel("Escalation")
        .setDescription("Configure escalation settings")
        .setEmoji("🚨")
        .setValue(PAGES.ESCALATION),
      new StringSelectMenuOptionBuilder()
        .setLabel("AI-API")
        .setDescription("Connect your Groq API key")
        .setEmoji("🔑")
        .setValue(PAGES.AIAPI),
      new StringSelectMenuOptionBuilder()
        .setLabel("Bad Words")
        .setDescription("Manage custom bad words")
        .setEmoji("🚫")
        .setValue(PAGES.BADWORDS),
      new StringSelectMenuOptionBuilder()
        .setLabel("Plans & Usage")
        .setDescription("View plan information")
        .setEmoji("📊")
        .setValue(PAGES.PLANS)
    );

  return [new ActionRowBuilder().addComponents(selectMenu)];
}

// Build features page
async function buildFeaturesPage(guildId) {
  const setting = await getOrCreateGuildSetting(guildId);

  const embed = new EmbedBuilder()
    .setTitle("📝 Feature Settings")
    .setDescription("Toggle AI features for your server.")
    .setColor(0x5865f2)
    .addFields(
      {
        name: "AI Reply",
        value: setting.aiReplyEnabled ? "✅ **Enabled**" : "❌ **Disabled**",
        inline: true,
      },
      {
        name: "Close Ticket",
        value: setting.closeTicketEnabled ? "✅ **Enabled**" : "❌ **Disabled**",
        inline: true,
      },
      {
        name: "Rename Review",
        value: setting.renameReviewEnabled ? "✅ **Enabled**" : "❌ **Disabled**",
        inline: true,
      },
      {
        name: "Escalation",
        value: setting.escalationEnabled ? "✅ **Enabled**" : "❌ **Disabled**",
        inline: true,
      },
      {
        name: "Agent Actions",
        value: setting.agentActionsEnabled ? "✅ **Enabled**" : "❌ **Disabled**",
        inline: true,
      }
    )
    .setFooter({ text: "Click a button below to toggle a feature" });

  return embed;
}

// Build features select menu
function buildFeaturesSelectMenu(userId) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`${TOGGLE_PREFIX}${userId}`)
    .setPlaceholder("Select a feature to toggle...")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Toggle AI Reply")
        .setDescription("Enable/disable AI auto-replies")
        .setValue("aiReplyEnabled"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Toggle Close Ticket")
        .setDescription("Enable/disable AI ticket closing")
        .setValue("closeTicketEnabled"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Toggle Rename Review")
        .setDescription("Enable/disable AI rename review")
        .setValue("renameReviewEnabled"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Toggle Escalation")
        .setDescription("Enable/disable ticket escalation")
        .setValue("escalationEnabled"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Toggle Agent Actions")
        .setDescription("Enable/disable agent actions")
        .setValue("agentActionsEnabled")
    );

  return [new ActionRowBuilder().addComponents(selectMenu)];
}

// Build escalation page
async function buildEscalationPage(guildId) {
  const guildConfig = await prisma.guildConfig.findUnique({
    where: { guildId },
  });

  const category = guildConfig?.escalationCategoryId
    ? await prisma.guildConfig.findUnique({ where: { guildId } })
    : null;

  const embed = new EmbedBuilder()
    .setTitle("🚨 Escalation Settings")
    .setDescription("Configure how ticket escalation works.")
    .setColor(0xed4245)
    .addFields(
      {
        name: "Escalation Category",
        value: guildConfig?.escalationCategoryId
          ? `<#${guildConfig.escalationCategoryId}>`
          : "❌ **Not configured**",
        inline: true,
      },
      {
        name: "Notification Channel",
        value: guildConfig?.escalationNotificationChannelId
          ? `<#${guildConfig.escalationNotificationChannelId}>`
          : "❌ **Not configured**",
        inline: true,
      },
      {
        name: "Admin Routes",
        value: `Max: **${guildConfig?.maxAdminRoutes || defaultAiConfig.maxAdminRoutesPerGuild}**`,
        inline: true,
      }
    )
    .setFooter({ text: "Use /pixy-admins to configure escalation routes" });

  return embed;
}

// Build AI-API page
async function buildAiApiPage(guildId) {
  const setting = await getOrCreateGuildSetting(guildId);

  const embed = new EmbedBuilder()
    .setTitle("🔑 AI-API Settings")
    .setDescription("Configure your Groq API key for AI features.")
    .setColor(0xfee75c)
    .addFields(
      {
        name: "API Key Status",
        value: setting.groqApiKey
          ? "✅ **Configured**"
          : "❌ **Not Set** (using global default)",
        inline: true,
      },
      {
        name: "Current Model",
        value: `\`${setting.aiModel || defaultAiConfig.groq.model}\``,
        inline: true,
      }
    )
    .setFooter({ text: "Your API key is encrypted and stored securely" });

  if (!setting.groqApiKey) {
    embed.addFields({
      name: "⚠️ Note",
      value:
        "Without a guild API key, Pixy uses the global API key. To use your own, please provide it via a secure method (contact server owner).",
    });
  }

  return embed;
}

// Build bad words page
async function buildBadWordsPage(guildId) {
  const stats = await getBadWordsStats(guildId);

  const embed = new EmbedBuilder()
    .setTitle("🚫 Bad Words Settings")
    .setDescription("Manage the bad words filter for your server.")
    .setColor(0xeb459e)
    .addFields(
      {
        name: "Built-in Words",
        value: `**${stats.builtInCount}** words`,
        inline: true,
      },
      {
        name: "Custom Words",
        value: `**${stats.customCount}**/${stats.maxCustom}`,
        inline: true,
      },
      {
        name: "Remaining",
        value: `**${stats.remaining}** slots available`,
        inline: true,
      }
    )
    .setFooter({ text: "Select an option below to add or remove custom words" });

  if (stats.customWords.length > 0) {
    const wordList = stats.customWords.slice(0, 10).join(", ");
    const moreText = stats.customWords.length > 10 ? ` and ${stats.customWords.length - 10} more...` : "";
    embed.addFields({
      name: "Custom Words List",
      value: `\`${wordList}\`${moreText}`,
    });
  }

  return embed;
}

// Build bad words action select menu
function buildBadWordsSelectMenu(userId) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`${BADWORD_ADD_PREFIX}${userId}`)
    .setPlaceholder("Select an action...")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Add Custom Word")
        .setDescription("Add a new word to the filter")
        .setEmoji("➕")
        .setValue("add"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Remove Custom Word")
        .setDescription("Remove a word from your custom list")
        .setEmoji("➖")
        .setValue("remove")
    );

  return [new ActionRowBuilder().addComponents(selectMenu)];
}

// Build plans page
async function buildPlansPage(guildId) {
  const setting = await getOrCreateGuildSetting(guildId);

  const embed = new EmbedBuilder()
    .setTitle("📊 Plans & Usage")
    .setDescription("View your current plan and usage information.")
    .setColor(0x57f287)
    .addFields(
      {
        name: "Current Plan",
        value: `**${setting.plan.charAt(0).toUpperCase() + setting.plan.slice(1)}**`,
        inline: true,
      },
      {
        name: "Status",
        value: "✅ Active",
        inline: true,
      }
    )
    .setFooter({ text: "Premium features coming soon!" });

  if (setting.planExpiresAt) {
    embed.addFields({
      name: "Expires At",
      value: `<t:${Math.floor(setting.planExpiresAt.getTime() / 1000)}:R>`,
      inline: true,
    });
  }

  embed.addFields({
    name: "🚧 Coming Soon",
    value:
      "Premium plans with advanced features are under development. Stay tuned for updates!",
  });

  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("Configure Pixy AI settings for this server.")
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

    // Ensure guild setting exists
    await getOrCreateGuildSetting(interaction.guild.id);

    const embed = await buildHomePage(interaction.guild.id);
    const selectMenu = buildHomeSelectMenu(interaction.user.id);

    await interaction.reply({
      embeds: [embed],
      components: selectMenu,
      flags: EPHEMERAL,
    });
  },

  selectMenuHandlers: [
    // Home page category selector
    {
      customIdPrefix: `${NAV_PREFIX}`,
      type: "string",

      async execute(interaction) {
        const rest = interaction.customId.slice(NAV_PREFIX.length);
        const [userId, source] = rest.split(":");

        if (!(await assertOwnerAndAdmin(interaction, userId))) return;

        const respond = createResponder(interaction);
        const page = interaction.values?.[0];
        const guildId = interaction.guild.id;

        if (!page || !Object.values(PAGES).includes(page)) {
          await respond({
            content: "Invalid selection.",
            components: [],
          });
          return;
        }

        let embed;
        let components = [];

        switch (page) {
          case PAGES.FEATURES:
            embed = await buildFeaturesPage(guildId);
            components = [
              ...buildFeaturesSelectMenu(userId),
              ...buildNavButtons(userId, page),
            ];
            break;

          case PAGES.ESCALATION:
            embed = await buildEscalationPage(guildId);
            components = buildNavButtons(userId, page);
            break;

          case PAGES.AIAPI:
            embed = await buildAiApiPage(guildId);
            components = buildNavButtons(userId, page);
            break;

          case PAGES.BADWORDS:
            embed = await buildBadWordsPage(guildId);
            components = [
              ...buildBadWordsSelectMenu(userId),
              ...buildNavButtons(userId, page),
            ];
            break;

          case PAGES.PLANS:
            embed = await buildPlansPage(guildId);
            components = buildNavButtons(userId, page);
            break;

          default:
            embed = await buildHomePage(guildId);
            components = buildHomeSelectMenu(userId);
        }

        await respond({
          embeds: [embed],
          components,
        });
      },
    },

    // Features toggle selector
    {
      customIdPrefix: `${TOGGLE_PREFIX}`,
      type: "string",

      async execute(interaction) {
        const userId = interaction.customId.slice(TOGGLE_PREFIX.length);

        if (!(await assertOwnerAndAdmin(interaction, userId))) return;

        const respond = createResponder(interaction);
        const setting = interaction.values?.[0];
        const guildId = interaction.guild.id;

        if (!setting) {
          await respond({
            content: "Invalid selection.",
            components: [],
          });
          return;
        }

        // Toggle the setting
        const currentSetting = await getOrCreateGuildSetting(guildId);
        const newValue = !currentSetting[setting];

        await prisma.guildSetting.update({
          where: { guildId },
          data: { [setting]: newValue },
        });

        // Rebuild the page
        const embed = await buildFeaturesPage(guildId);
        const components = [
          ...buildFeaturesSelectMenu(userId),
          ...buildNavButtons(userId, PAGES.FEATURES),
        ];

        await respond({
          embeds: [embed],
          components,
        });
      },
    },

    // Bad words add/remove selector
    {
      customIdPrefix: `${BADWORD_ADD_PREFIX}`,
      type: "string",

      async execute(interaction) {
        const userId = interaction.customId.slice(BADWORD_ADD_PREFIX.length);

        if (!(await assertOwnerAndAdmin(interaction, userId))) return;

        const respond = createResponder(interaction);
        const action = interaction.values?.[0];
        const guildId = interaction.guild.id;

        if (action === "add") {
          // Show modal for adding word
          const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: ModalActionRowBuilder } = require("discord.js");

          const modal = new ModalBuilder()
            .setCustomId(`settings_badwords_modal:${userId}`)
            .setTitle("Add Custom Bad Word");

          const wordInput = new TextInputBuilder()
            .setCustomId("word")
            .setLabel("Word to add")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100)
            .setPlaceholder("Enter the word to filter");

          modal.addComponents(new ModalActionRowBuilder().addComponents(wordInput));

          await interaction.showModal(modal);
          return;
        }

        if (action === "remove") {
          const stats = await getBadWordsStats(guildId);

          if (stats.customWords.length === 0) {
            await respond({
              content: "No custom words to remove.",
              components: [],
            });
            return;
          }

          // Build select menu with custom words
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`${BADWORD_REMOVE_PREFIX}${userId}`)
            .setPlaceholder("Select a word to remove...")
            .setMinValues(1)
            .setMaxValues(1);

          stats.customWords.slice(0, 25).forEach((word) => {
            selectMenu.addOptions(
              new StringSelectMenuOptionBuilder()
                .setLabel(word)
                .setValue(word)
            );
          });

          const components = [
            new ActionRowBuilder().addComponents(selectMenu),
            ...buildNavButtons(userId, PAGES.BADWORDS),
          ];

          await respond({
            content: "Select a custom word to remove:",
            components,
          });
          return;
        }

        await respond({
          content: "Invalid action.",
          components: [],
        });
      },
    },

    // Bad words remove selector
    {
      customIdPrefix: `${BADWORD_REMOVE_PREFIX}`,
      type: "string",

      async execute(interaction) {
        const userId = interaction.customId.slice(BADWORD_REMOVE_PREFIX.length);

        if (!(await assertOwnerAndAdmin(interaction, userId))) return;

        const respond = createResponder(interaction);
        const word = interaction.values?.[0];
        const guildId = interaction.guild.id;

        if (!word) {
          await respond({
            content: "Invalid word selected.",
            components: [],
          });
          return;
        }

        const result = await removeCustomBadWord(guildId, word);

        if (!result.ok) {
          await respond({
            content: `Failed to remove word: ${result.code}`,
            components: [],
          });
          return;
        }

        const embed = await buildBadWordsPage(guildId);
        const components = [
          ...buildBadWordsSelectMenu(userId),
          ...buildNavButtons(userId, PAGES.BADWORDS),
        ];

        await respond({
          content: `Removed custom word: \`${word}\``,
          embeds: [embed],
          components,
        });
      },
    },
  ],

  buttonHandlers: [
    // Home button
    {
      customIdPrefix: `${HOME_PREFIX}`,

      async execute(interaction) {
        const userId = interaction.customId.slice(HOME_PREFIX.length);

        if (!(await assertOwnerAndAdmin(interaction, userId))) return;

        const respond = createResponder(interaction);
        const embed = await buildHomePage(interaction.guild.id);
        const selectMenu = buildHomeSelectMenu(userId);

        await respond({
          embeds: [embed],
          components: selectMenu,
        });
      },
    },

    // Navigation button
    {
      customIdPrefix: `${NAV_PREFIX}`,

      async execute(interaction) {
        const rest = interaction.customId.slice(NAV_PREFIX.length);
        const [userId, page] = rest.split(":");

        if (!(await assertOwnerAndAdmin(interaction, userId))) return;

        const respond = createResponder(interaction);
        const guildId = interaction.guild.id;

        let embed;
        let components = [];

        switch (page) {
          case PAGES.FEATURES:
            embed = await buildFeaturesPage(guildId);
            components = [
              ...buildFeaturesSelectMenu(userId),
              ...buildNavButtons(userId, page),
            ];
            break;

          case PAGES.ESCALATION:
            embed = await buildEscalationPage(guildId);
            components = buildNavButtons(userId, page);
            break;

          case PAGES.AIAPI:
            embed = await buildAiApiPage(guildId);
            components = buildNavButtons(userId, page);
            break;

          case PAGES.BADWORDS:
            embed = await buildBadWordsPage(guildId);
            components = [
              ...buildBadWordsSelectMenu(userId),
              ...buildNavButtons(userId, page),
            ];
            break;

          case PAGES.PLANS:
            embed = await buildPlansPage(guildId);
            components = buildNavButtons(userId, page);
            break;

          default:
            embed = await buildHomePage(guildId);
            components = buildHomeSelectMenu(userId);
        }

        await respond({
          embeds: [embed],
          components,
        });
      },
    },

    // Close button
    {
      customIdPrefix: `${CLOSE_PREFIX}`,

      async execute(interaction) {
        const userId = interaction.customId.slice(CLOSE_PREFIX.length);

        if (!(await assertOwnerAndAdmin(interaction, userId))) return;

        const respond = createResponder(interaction);

        await respond({
          content: "Settings panel closed.",
          embeds: [],
          components: [],
        });
      },
    },
  ],

  modalHandlers: [
    // Bad words add modal
    {
      customIdPrefix: "settings_badwords_modal:",

      async execute(interaction) {
        const userId = interaction.customId.slice("settings_badwords_modal:".length);

        if (!(await assertOwnerAndAdmin(interaction, userId))) return;

        const word = cleanText(interaction.fields.getTextInputValue("word"));
        const guildId = interaction.guild.id;

        if (!word) {
          await interaction.reply({
            content: "Please enter a valid word.",
            flags: EPHEMERAL,
          });
          return;
        }

        const result = await addCustomBadWord(guildId, word);

        if (!result.ok) {
          let message = "Failed to add word.";
          if (result.code === "already_builtin") {
            message = "This word is already in the built-in filter.";
          } else if (result.code === "already_exists") {
            message = "This word is already in your custom list.";
          } else if (result.code === "max_reached") {
            message = `You've reached the maximum of ${result.max} custom words.`;
          }

          await interaction.reply({
            content: message,
            flags: EPHEMERAL,
          });
          return;
        }

        const embed = await buildBadWordsPage(guildId);
        const selectMenu = buildBadWordsSelectMenu(userId);

        await interaction.reply({
          content: `Added custom word: \`${word}\` (${result.count} total)`,
          embeds: [embed],
          components: [
            ...buildBadWordsSelectMenu(userId),
            ...buildNavButtons(userId, PAGES.BADWORDS),
          ],
          flags: EPHEMERAL,
        });
      },
    },
  ],
};
