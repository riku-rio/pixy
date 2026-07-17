const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");

const { prisma } = require("../config/prisma");
const { aiConfig } = require("../config/ai");

const {
  getOrCreateEscalationNotificationChannel,
} = require("../utils/tickets/escalationNotifications");

const EPHEMERAL = 64;

const AUTO_CATEGORY_NAMES = [
  "pixy-escalated-tickets",
  "pixy-human-support",
  "pixy-admin-review",
];

const SELECT_EXISTING_BUTTON_PREFIX = "admins_select_category_existing:";
const CREATE_AUTO_BUTTON_PREFIX = "admins_create_category_auto:";
const CATEGORY_SELECT_PREFIX = "admins_category_select:";
const ROLE_SELECT_PREFIX = "admins_role_select:";
const ROLE_DESCRIPTION_MODAL_PREFIX = "admins_role_description:";
const DELETE_MODAL_PREFIX = "admins_delete_route:";
const CLEAR_CONFIRM_PREFIX = "admins_clear_confirm:";
const CLEAR_CANCEL_PREFIX = "admins_clear_cancel:";

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

// Helper to respond to deferred interactions safely
function createResponder(interaction) {
  return (payload) => {
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply(payload);
    }
    return interaction.update(payload);
  };
}

function truncateText(value, maxLength = 220) {
  const text = cleanText(value);

  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function shortId(id) {
  return String(id || "").slice(0, 8);
}

function hasAdminPermission(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
}

function getDefaultMaxAdminRoutes() {
  return Math.max(
    1,
    Math.min(Number(aiConfig.maxAdminRoutesPerGuild || 10), 25)
  );
}

function getMaxAdminRoutes(config) {
  return Math.max(
    1,
    Math.min(Number(config?.maxAdminRoutes || getDefaultMaxAdminRoutes()), 25)
  );
}

function parseOwnerAndMode(customId, prefix) {
  const rest = String(customId || "").slice(prefix.length);
  const [ownerUserId, modeRaw] = rest.split(":");

  return {
    ownerUserId,
    mode: modeRaw || "add",
  };
}

function extractRoleId(input) {
  const text = cleanText(input);

  const mentionMatch = text.match(/^<@&(\d+)>$/);
  if (mentionMatch?.[1]) return mentionMatch[1];

  const idMatch = text.match(/\d{15,25}/);
  if (idMatch?.[0]) return idMatch[0];

  return null;
}

async function ensureGuildConfig(guildId) {
  let config = await prisma.guildConfig.findUnique({
    where: {
      guildId,
    },
  });

  if (!config) {
    config = await prisma.guildConfig.create({
      data: {
        guildId,
        enabled: true,
        maxLearnedItems: 20,
        maxAdminRoutes: getDefaultMaxAdminRoutes(),
      },
    });
  }

  return config;
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
      content: "Only the admin who used `/pixy-admins` can use this interaction.",
      flags: EPHEMERAL,
    });
    return false;
  }

  if (!hasAdminPermission(interaction)) {
    await interaction.reply({
      content: "You need Administrator permission to use this.",
      flags: EPHEMERAL,
    });
    return false;
  }

  return true;
}

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

async function getCategoryById(guild, categoryId) {
  if (!guild || !categoryId) return null;

  const cached = guild.channels.cache.get(categoryId);

  if (cached?.type === ChannelType.GuildCategory) {
    return cached;
  }

  try {
    const fetched = await guild.channels.fetch(categoryId);
    return fetched?.type === ChannelType.GuildCategory ? fetched : null;
  } catch {
    return null;
  }
}

async function getValidEscalationCategory(guild, config) {
  return getCategoryById(guild, config?.escalationCategoryId);
}

async function getRoleById(guild, roleId) {
  if (!guild || !roleId) return null;

  const cached = guild.roles.cache.get(roleId);

  if (cached) return cached;

  try {
    return await guild.roles.fetch(roleId);
  } catch {
    return null;
  }
}

async function saveEscalationCategory(guildId, categoryId) {
  return prisma.guildConfig.upsert({
    where: {
      guildId,
    },
    create: {
      guildId,
      enabled: true,
      maxLearnedItems: 20,
      maxAdminRoutes: getDefaultMaxAdminRoutes(),
      escalationCategoryId: categoryId,
    },
    update: {
      escalationCategoryId: categoryId,
    },
  });
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
    reason: "Pixy AI escalation category setup",
  });

  return {
    category,
    created: true,
  };
}

function buildCategoryChoicePayload({ ownerUserId, mode, currentCategory }) {
  const selectExistingButton = new ButtonBuilder()
    .setCustomId(`${SELECT_EXISTING_BUTTON_PREFIX}${ownerUserId}:${mode}`)
    .setLabel("Select existing category")
    .setStyle(ButtonStyle.Primary);

  const createAutoButton = new ButtonBuilder()
    .setCustomId(`${CREATE_AUTO_BUTTON_PREFIX}${ownerUserId}:${mode}`)
    .setLabel("Create automatically")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(
    selectExistingButton,
    createAutoButton
  );

  const lines = [];

  if (currentCategory) {
    lines.push(`Current escalation category: **${currentCategory.name}**`);
    lines.push("");
  } else {
    lines.push("Escalation category is not configured yet.");
    lines.push("");
  }

  lines.push("Choose where Pixy should move escalated tickets:");

  return {
    content: lines.join("\n"),
    components: [row],
  };
}

function buildCategorySelectPayload({ ownerUserId, mode }) {
  const selectMenu = new ChannelSelectMenuBuilder()
    .setCustomId(`${CATEGORY_SELECT_PREFIX}${ownerUserId}:${mode}`)
    .setPlaceholder("Select the escalation category")
    .setMinValues(1)
    .setMaxValues(1)
    .setChannelTypes(ChannelType.GuildCategory);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  return {
    content: "Choose the category where escalated tickets should be moved:",
    components: [row],
  };
}

function buildRoleSelectPayload({ ownerUserId, category }) {
  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId(`${ROLE_SELECT_PREFIX}${ownerUserId}`)
    .setPlaceholder("Select a support/admin role")
    .setMinValues(1)
    .setMaxValues(1);

  const row = new ActionRowBuilder().addComponents(roleSelect);

  return {
    content: [
      `Escalation category: **${category.name}**`,
      "",
      "Now choose the role Pixy should route matching tickets to:",
    ].join("\n"),
    components: [row],
  };
}

async function handleCategoryConfigured({ interaction, ownerUserId, mode, category }) {
  // Defer before async work
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate();
  }

  await saveEscalationCategory(interaction.guild.id, category.id);

  const notificationResult = await getOrCreateEscalationNotificationChannel({
    guild: interaction.guild,
    categoryId: category.id,
    existingChannelId: null,
  });

  const respond = createResponder(interaction);

  if (!notificationResult.ok) {
    await respond({
      content: [
        `Escalation category saved as **${category.name}**, but I could not create/find the notification channel.`,
        `Reason: \`${notificationResult.code}\``,
        "",
        "Fix my permissions, then run `/pixy-admins action:category` again.",
      ].join("\n"),
      components: [],
    });
    return;
  }

  if (mode === "add") {
    await respond(
      buildRoleSelectPayload({
        ownerUserId,
        category,
      })
    );
    return;
  }

  await respond({
    content: [
      `Done. Escalation category has been saved as **${category.name}**.`,
      `Notification channel: <#${notificationResult.channel.id}>`,
    ].join("\n"),
    components: [],
  });
}

async function buildRoutesEmbed(guild) {
  const config = await ensureGuildConfig(guild.id);
  const category = await getValidEscalationCategory(guild, config);

  await guild.roles.fetch().catch(() => null);

  const routes = await prisma.adminRoute.findMany({
    where: {
      guildId: guild.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const maxRoutes = getMaxAdminRoutes(config);

  const embed = new EmbedBuilder()
    .setTitle("Pixy Admin Routes")
    .setFooter({
      text: `Total ${routes.length}/${maxRoutes}`,
    });

  const descriptionLines = [
    `Escalation category: ${
      category ? `**${category.name}**` : "**Not configured**"
    }`,
    "",
  ];

  if (!routes.length) {
    descriptionLines.push("No admin/support routes have been configured yet.");
    embed.setDescription(descriptionLines.join("\n"));
    return embed;
  }

  descriptionLines.push(
    "These roles can be selected by Pixy AI when requesting human escalation."
  );

  embed.setDescription(descriptionLines.join("\n"));

  routes.forEach((route, index) => {
    const role = guild.roles.cache.get(route.roleId);
    const roleName = role?.name || "Missing role";

    embed.addFields({
      name: `${index + 1}. ${roleName} • Route ID: ${shortId(route.id)}`,
      value: [
        `Role: <@&${route.roleId}>`,
        `Status: **${route.enabled ? "Enabled" : "Disabled"}**`,
        `Description: ${truncateText(route.description, 500)}`,
      ].join("\n"),
    });
  });

  return embed;
}

async function findAdminRoute(guild, input) {
  const query = cleanText(input);
  const queryLower = query.toLowerCase();

  if (!query) {
    return {
      status: "empty",
      matches: [],
    };
  }

  await guild.roles.fetch().catch(() => null);

  const routes = await prisma.adminRoute.findMany({
    where: {
      guildId: guild.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const roleId = extractRoleId(query);

  if (roleId) {
    const exactRoleMatch = routes.find((route) => route.roleId === roleId);

    if (exactRoleMatch) {
      return {
        status: "found",
        route: exactRoleMatch,
        matches: [exactRoleMatch],
      };
    }
  }

  const idMatches = routes.filter((route) => {
    const routeId = String(route.id).toLowerCase();
    const savedRoleId = String(route.roleId).toLowerCase();

    return (
      routeId === queryLower ||
      routeId.startsWith(queryLower) ||
      savedRoleId === queryLower ||
      savedRoleId.startsWith(queryLower)
    );
  });

  if (idMatches.length === 1) {
    return {
      status: "found",
      route: idMatches[0],
      matches: idMatches,
    };
  }

  if (idMatches.length > 1) {
    return {
      status: "multiple",
      matches: idMatches,
    };
  }

  const nameMatches = routes.filter((route) => {
    const role = guild.roles.cache.get(route.roleId);
    const roleName = cleanText(role?.name).toLowerCase();

    return roleName && roleName.includes(queryLower);
  });

  if (nameMatches.length === 1) {
    return {
      status: "found",
      route: nameMatches[0],
      matches: nameMatches,
    };
  }

  if (nameMatches.length > 1) {
    return {
      status: "multiple",
      matches: nameMatches,
    };
  }

  return {
    status: "not_found",
    matches: [],
  };
}

function formatRouteMatches(guild, matches) {
  return matches
    .slice(0, 10)
    .map((route, index) => {
      const role = guild.roles.cache.get(route.roleId);

      return [
        `${index + 1}. Role: ${role?.name || "Missing role"}`,
        `Route ID: \`${route.id}\``,
        `Role ID: \`${route.roleId}\``,
        `Description: ${truncateText(route.description, 120)}`,
      ].join("\n");
    })
    .join("\n\n");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("admins")
    .setDescription("Configure Pixy AI human escalation routing.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("What do you want to configure?")
        .setRequired(true)
        .addChoices(
          {
            name: "Add support role route",
            value: "add",
          },
          {
            name: "List routes",
            value: "list",
          },
          {
            name: "Delete route",
            value: "delete",
          },
          {
            name: "Set escalation category",
            value: "category",
          },
          {
            name: "Clear all routes",
            value: "clear",
          }
        )
    ),

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

    const action = interaction.options.getString("action", true);
    const config = await ensureGuildConfig(interaction.guild.id);

    if (action === "add") {
      const category = await getValidEscalationCategory(interaction.guild, config);

      if (!category) {
        await interaction.reply({
          ...buildCategoryChoicePayload({
            ownerUserId: interaction.user.id,
            mode: "add",
            currentCategory: null,
          }),
          flags: EPHEMERAL,
        });
        return;
      }

      await interaction.reply({
        ...buildRoleSelectPayload({
          ownerUserId: interaction.user.id,
          category,
        }),
        flags: EPHEMERAL,
      });
      return;
    }

    if (action === "category") {
      const currentCategory = await getValidEscalationCategory(
        interaction.guild,
        config
      );

      await interaction.reply({
        ...buildCategoryChoicePayload({
          ownerUserId: interaction.user.id,
          mode: "category",
          currentCategory,
        }),
        flags: EPHEMERAL,
      });
      return;
    }

    if (action === "list") {
      const embed = await buildRoutesEmbed(interaction.guild);

      await interaction.reply({
        embeds: [embed],
        flags: EPHEMERAL,
        allowedMentions: {
          roles: [],
        },
      });
      return;
    }

    if (action === "delete") {
      const modal = new ModalBuilder()
        .setCustomId(`${DELETE_MODAL_PREFIX}${interaction.user.id}`)
        .setTitle("Delete admin route");

      const deleteInput = new TextInputBuilder()
        .setCustomId("delete_query")
        .setLabel("Role ID, role mention, role name, or route ID")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(200)
        .setPlaceholder("Example: @Billing, Billing, role ID, or route ID");

      modal.addComponents(new ActionRowBuilder().addComponents(deleteInput));

      await interaction.showModal(modal);
      return;
    }

    if (action === "clear") {
      const confirmButton = new ButtonBuilder()
        .setCustomId(`${CLEAR_CONFIRM_PREFIX}${interaction.user.id}`)
        .setLabel("Confirm")
        .setStyle(ButtonStyle.Danger);

      const cancelButton = new ButtonBuilder()
        .setCustomId(`${CLEAR_CANCEL_PREFIX}${interaction.user.id}`)
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

      await interaction.reply({
        content:
          "Are you sure you want to delete **all admin/support routes** for this server?",
        components: [row],
        flags: EPHEMERAL,
      });
    }
  },

  buttonHandlers: [
    {
      customIdPrefix: SELECT_EXISTING_BUTTON_PREFIX,

      async execute(interaction) {
        const { ownerUserId, mode } = parseOwnerAndMode(
          interaction.customId,
          SELECT_EXISTING_BUTTON_PREFIX
        );

        if (!(await assertOwnerAndAdmin(interaction, ownerUserId))) return;

        const respond = createResponder(interaction);
        await respond(
          buildCategorySelectPayload({
            ownerUserId,
            mode,
          })
        );
      },
    },
    {
      customIdPrefix: CREATE_AUTO_BUTTON_PREFIX,

      async execute(interaction) {
        const { ownerUserId, mode } = parseOwnerAndMode(
          interaction.customId,
          CREATE_AUTO_BUTTON_PREFIX
        );

        if (!(await assertOwnerAndAdmin(interaction, ownerUserId))) return;

        // Defer before async work
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferUpdate();
        }

        const respond = createResponder(interaction);

        const canManageChannels = await botCanManageGuildChannels(
          interaction.guild
        );

        if (!canManageChannels) {
          await respond({
            content:
              "I need **Manage Channels** permission to create the escalation category automatically.",
            components: [],
          });
          return;
        }

        const result = await createOrFindAutoCategory(interaction.guild);

        if (!result.category) {
          await respond({
            content:
              "I could not create or find an escalation category. Please choose an existing category instead.",
            components: [],
          });
          return;
        }

        await handleCategoryConfigured({
          interaction,
          ownerUserId,
          mode,
          category: result.category,
        });
      },
    },
    {
      customIdPrefix: CLEAR_CONFIRM_PREFIX,

      async execute(interaction) {
        const ownerUserId = interaction.customId.slice(CLEAR_CONFIRM_PREFIX.length);

        if (!(await assertOwnerAndAdmin(interaction, ownerUserId))) return;

        const respond = createResponder(interaction);

        const result = await prisma.adminRoute.deleteMany({
          where: {
            guildId: interaction.guild.id,
          },
        });

        await respond({
          content: `Done. Deleted **${result.count}** admin/support route(s).`,
          components: [],
          embeds: [],
        });
      },
    },
    {
      customIdPrefix: CLEAR_CANCEL_PREFIX,

      async execute(interaction) {
        const ownerUserId = interaction.customId.slice(CLEAR_CANCEL_PREFIX.length);

        if (!(await assertOwnerAndAdmin(interaction, ownerUserId))) return;

        const respond = createResponder(interaction);

        await respond({
          content: "Cancelled. No admin/support routes were deleted.",
          components: [],
          embeds: [],
        });
      },
    },
  ],

  selectMenuHandlers: [
    {
      customIdPrefix: CATEGORY_SELECT_PREFIX,
      type: "channel",

      async execute(interaction) {
        const { ownerUserId, mode } = parseOwnerAndMode(
          interaction.customId,
          CATEGORY_SELECT_PREFIX
        );

        if (!(await assertOwnerAndAdmin(interaction, ownerUserId))) return;

        const respond = createResponder(interaction);
        const categoryId = interaction.values?.[0];
        const category = await getCategoryById(interaction.guild, categoryId);

        if (!category) {
          await respond({
            content: "Invalid category selected.",
            components: [],
          });
          return;
        }

        await handleCategoryConfigured({
          interaction,
          ownerUserId,
          mode,
          category,
        });
      },
    },
    {
      customIdPrefix: ROLE_SELECT_PREFIX,
      type: "role",

      async execute(interaction) {
        const ownerUserId = interaction.customId.slice(ROLE_SELECT_PREFIX.length);

        if (!(await assertOwnerAndAdmin(interaction, ownerUserId))) return;

        const respond = createResponder(interaction);
        const roleId = interaction.values?.[0];
        const role = await getRoleById(interaction.guild, roleId);

        if (!role || role.id === interaction.guild.id) {
          await respond({
            content: "Please select a valid server role. `@everyone` cannot be used.",
            components: [],
          });
          return;
        }

        const config = await ensureGuildConfig(interaction.guild.id);
        const maxRoutes = getMaxAdminRoutes(config);

        const existing = await prisma.adminRoute.findUnique({
          where: {
            guildId_roleId: {
              guildId: interaction.guild.id,
              roleId: role.id,
            },
          },
        });

        const totalRoutes = await prisma.adminRoute.count({
          where: {
            guildId: interaction.guild.id,
          },
        });

        if (!existing && totalRoutes >= maxRoutes) {
          await respond({
            content: `This server already reached the admin route limit: **${maxRoutes}** route(s).`,
            components: [],
          });
          return;
        }

        const modal = new ModalBuilder()
          .setCustomId(`${ROLE_DESCRIPTION_MODAL_PREFIX}${interaction.user.id}:${role.id}`)
          .setTitle(existing ? "Update role route" : "Add role route");

        const descriptionInput = new TextInputBuilder()
          .setCustomId("description")
          .setLabel("What should this role handle?")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(700)
          .setPlaceholder(
            "Example: Handles billing, payment issues, refunds, failed purchases, and chargebacks."
          );

        if (existing?.description) {
          descriptionInput.setValue(existing.description.slice(0, 700));
        }

        modal.addComponents(new ActionRowBuilder().addComponents(descriptionInput));

        await interaction.showModal(modal);
      },
    },
  ],

  modalHandlers: [
    {
      customIdPrefix: ROLE_DESCRIPTION_MODAL_PREFIX,

      async execute(interaction) {
        const rest = interaction.customId.slice(ROLE_DESCRIPTION_MODAL_PREFIX.length);
        const [ownerUserId, roleId] = rest.split(":");

        if (!(await assertOwnerAndAdmin(interaction, ownerUserId))) return;

        const role = await getRoleById(interaction.guild, roleId);

        if (!role || role.id === interaction.guild.id) {
          await interaction.reply({
            content: "This role no longer exists or cannot be used.",
            flags: EPHEMERAL,
          });
          return;
        }

        const description = cleanText(
          interaction.fields.getTextInputValue("description")
        );

        if (!description) {
          await interaction.reply({
            content: "Role description is required.",
            flags: EPHEMERAL,
          });
          return;
        }

        const config = await ensureGuildConfig(interaction.guild.id);
        const maxRoutes = getMaxAdminRoutes(config);

        const existing = await prisma.adminRoute.findUnique({
          where: {
            guildId_roleId: {
              guildId: interaction.guild.id,
              roleId: role.id,
            },
          },
        });

        const totalRoutes = await prisma.adminRoute.count({
          where: {
            guildId: interaction.guild.id,
          },
        });

        if (!existing && totalRoutes >= maxRoutes) {
          await interaction.reply({
            content: `This server already reached the admin route limit: **${maxRoutes}** route(s).`,
            flags: EPHEMERAL,
          });
          return;
        }

        const route = await prisma.adminRoute.upsert({
          where: {
            guildId_roleId: {
              guildId: interaction.guild.id,
              roleId: role.id,
            },
          },
          create: {
            guildId: interaction.guild.id,
            roleId: role.id,
            description,
            enabled: true,
          },
          update: {
            description,
            enabled: true,
          },
        });

        await interaction.reply({
          content: [
            existing ? "Done. Admin route has been updated." : "Done. Admin route has been saved.",
            `Role: <@&${role.id}>`,
            `Route ID: \`${route.id}\``,
            `Total: **${existing ? totalRoutes : totalRoutes + 1}/${maxRoutes}**`,
          ].join("\n"),
          flags: EPHEMERAL,
          allowedMentions: {
            roles: [],
          },
        });
      },
    },
    {
      customIdPrefix: DELETE_MODAL_PREFIX,

      async execute(interaction) {
        const ownerUserId = interaction.customId.slice(DELETE_MODAL_PREFIX.length);

        if (!(await assertOwnerAndAdmin(interaction, ownerUserId))) return;

        const query = cleanText(interaction.fields.getTextInputValue("delete_query"));
        const result = await findAdminRoute(interaction.guild, query);

        if (result.status === "empty") {
          await interaction.reply({
            content: "Please enter a role ID, role mention, role name, or route ID.",
            flags: EPHEMERAL,
          });
          return;
        }

        if (result.status === "not_found") {
          await interaction.reply({
            content:
              "No admin route matched that input. Use `/pixy-admins action:list` and try again with the route ID or role ID.",
            flags: EPHEMERAL,
          });
          return;
        }

        if (result.status === "multiple") {
          await interaction.reply({
            content: [
              "Multiple routes matched that input. Please run `/pixy-admins action:delete` again using one exact route ID or role ID.",
              "",
              formatRouteMatches(interaction.guild, result.matches),
            ].join("\n"),
            flags: EPHEMERAL,
            allowedMentions: {
              roles: [],
            },
          });
          return;
        }

        const route = result.route;
        const role = interaction.guild.roles.cache.get(route.roleId);

        await prisma.adminRoute.delete({
          where: {
            id: route.id,
          },
        });

        await interaction.reply({
          content: [
            "Done. Admin route has been deleted.",
            `Role: ${role ? `<@&${role.id}>` : "`Missing role`"}`,
            `Route ID: \`${route.id}\``,
          ].join("\n"),
          flags: EPHEMERAL,
          allowedMentions: {
            roles: [],
          },
        });
      },
    },
  ],
};
