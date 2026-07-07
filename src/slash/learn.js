const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");

const { prisma } = require("../config/prisma");

const EPHEMERAL = 64;
const PAGE_SIZE = 10;

const ADD_MODAL_PREFIX = "learn_add:";
const DELETE_MODAL_PREFIX = "learn_delete:";
const LIST_BUTTON_PREFIX = "learn_list:";
const CLEAR_CONFIRM_PREFIX = "learn_clear_confirm:";
const CLEAR_CANCEL_PREFIX = "learn_clear_cancel:";
const DELETE_SELECT_PREFIX = "learn_delete_select:";

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForCompare(value) {
  return cleanText(value).toLowerCase();
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
      content: "Only the user who used `/learn` can use this interaction.",
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

async function buildListPayload({ guildId, ownerUserId, page }) {
  const total = await prisma.learnedAnswer.count({
    where: {
      guildId,
    },
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(Number(page) || 0, 0), totalPages - 1);

  const items = await prisma.learnedAnswer.findMany({
    where: {
      guildId,
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: safePage * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const embed = new EmbedBuilder()
    .setTitle("Learned Q&A Items")
    .setFooter({
      text: `Page ${safePage + 1}/${totalPages} • Total ${total} • Delete accepts full ID or unique short ID`,
    });

  if (!items.length) {
    embed.setDescription("No learned Q&A items have been added for this server yet.");
  } else {
    embed.setDescription("Use `/learn action:delete` and enter the full ID or a unique short ID.");

    items.forEach((item, index) => {
      const number = safePage * PAGE_SIZE + index + 1;

      embed.addFields({
        name: `${number}. ID: ${shortId(item.id)}`,
        value: [
          `Full ID: \`${item.id}\``,
          `**Q:** ${truncateText(item.question, 220)}`,
          `**A:** ${truncateText(item.answer, 220)}`,
        ].join("\n"),
      });
    });
  }

  const previousButton = new ButtonBuilder()
    .setCustomId(`${LIST_BUTTON_PREFIX}${ownerUserId}:${safePage - 1}`)
    .setLabel("Previous")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(safePage <= 0);

  const nextButton = new ButtonBuilder()
    .setCustomId(`${LIST_BUTTON_PREFIX}${ownerUserId}:${safePage + 1}`)
    .setLabel("Next")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(safePage >= totalPages - 1);

  const row = new ActionRowBuilder().addComponents(previousButton, nextButton);

  return {
    embeds: [embed],
    components: [row],
  };
}

async function findLearnedAnswer(guildId, input) {
  const query = cleanText(input);
  const queryLower = query.toLowerCase();

  if (!query) {
    return {
      status: "empty",
      matches: [],
    };
  }

  const items = await prisma.learnedAnswer.findMany({
    where: {
      guildId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const idMatches = items.filter((item) => {
    const id = String(item.id).toLowerCase();
    return id === queryLower || id.startsWith(queryLower);
  });

  if (idMatches.length === 1) {
    return {
      status: "found",
      item: idMatches[0],
      matches: idMatches,
    };
  }

  if (idMatches.length > 1) {
    return {
      status: "multiple",
      matches: idMatches,
    };
  }

  const exactTextMatches = items.filter((item) => {
    return (
      normalizeForCompare(item.question) === queryLower ||
      normalizeForCompare(item.answer) === queryLower
    );
  });

  if (exactTextMatches.length === 1) {
    return {
      status: "found",
      item: exactTextMatches[0],
      matches: exactTextMatches,
    };
  }

  if (exactTextMatches.length > 1) {
    return {
      status: "multiple",
      matches: exactTextMatches,
    };
  }

  const containsMatches = items.filter((item) => {
    return (
      normalizeForCompare(item.question).includes(queryLower) ||
      normalizeForCompare(item.answer).includes(queryLower)
    );
  });

  if (containsMatches.length === 1) {
    return {
      status: "found",
      item: containsMatches[0],
      matches: containsMatches,
    };
  }

  if (containsMatches.length > 1) {
    return {
      status: "multiple",
      matches: containsMatches,
    };
  }

  return {
    status: "not_found",
    matches: [],
  };
}

function formatMatches(matches) {
  return matches
    .slice(0, 5)
    .map((item, index) => {
      return [
        `${index + 1}. ID: \`${item.id}\``,
        `Q: ${truncateText(item.question, 90)}`,
        `A: ${truncateText(item.answer, 90)}`,
      ].join("\n");
    })
    .join("\n\n");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("learn")
    .setDescription("Manage Pixy AI learned Q&A items for this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("What do you want to do?")
        .setRequired(true)
        .addChoices(
          {
            name: "add",
            value: "add",
          },
          {
            name: "delete",
            value: "delete",
          },
          {
            name: "list",
            value: "list",
          },
          {
            name: "clear",
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

    if (action === "add") {
      const modal = new ModalBuilder()
        .setCustomId(`${ADD_MODAL_PREFIX}${interaction.user.id}`)
        .setTitle("Add learned Q&A");

      const questionInput = new TextInputBuilder()
        .setCustomId("question")
        .setLabel("Question")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500)
        .setPlaceholder("Example: How do I buy Nitro?");

      const answerInput = new TextInputBuilder()
        .setCustomId("answer")
        .setLabel("Answer")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1500)
        .setPlaceholder("Write the answer Pixy AI should learn.");

      modal.addComponents(
        new ActionRowBuilder().addComponents(questionInput),
        new ActionRowBuilder().addComponents(answerInput)
      );

      await interaction.showModal(modal);
      return;
    }

    if (action === "delete") {
      const modal = new ModalBuilder()
        .setCustomId(`${DELETE_MODAL_PREFIX}${interaction.user.id}`)
        .setTitle("Delete learned Q&A");

      const deleteInput = new TextInputBuilder()
        .setCustomId("delete_query")
        .setLabel("ID, question, or answer")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(500)
        .setPlaceholder("Paste full ID, short unique ID, question, or answer.");

      modal.addComponents(new ActionRowBuilder().addComponents(deleteInput));

      await interaction.showModal(modal);
      return;
    }

    if (action === "list") {
      await ensureGuildConfig(interaction.guild.id);

      const payload = await buildListPayload({
        guildId: interaction.guild.id,
        ownerUserId: interaction.user.id,
        page: 0,
      });

      await interaction.reply({
        ...payload,
        flags: EPHEMERAL,
      });
      return;
    }

    if (action === "clear") {
      await ensureGuildConfig(interaction.guild.id);

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
          "Are you sure you want to delete **all learned Q&A items** for this server?",
        components: [row],
        flags: EPHEMERAL,
      });
    }
  },

  modalHandlers: [
    {
      customIdPrefix: ADD_MODAL_PREFIX,

      async execute(interaction) {
        const ownerUserId = interaction.customId.slice(ADD_MODAL_PREFIX.length);

        if (!(await assertOwnerAndAdmin(interaction, ownerUserId))) return;

        const question = cleanText(interaction.fields.getTextInputValue("question"));
        const answer = cleanText(interaction.fields.getTextInputValue("answer"));

        if (!question || !answer) {
          await interaction.reply({
            content: "Question and answer are required.",
            flags: EPHEMERAL,
          });
          return;
        }

        const config = await ensureGuildConfig(interaction.guild.id);
        const maxItems = Number(config.maxLearnedItems || 20);

        if (maxItems <= 0) {
          await interaction.reply({
            content: "Learning is currently disabled because `maxLearnedItems` is 0.",
            flags: EPHEMERAL,
          });
          return;
        }

        const existingItems = await prisma.learnedAnswer.findMany({
          where: {
            guildId: interaction.guild.id,
          },
          select: {
            id: true,
            question: true,
          },
        });

        const duplicate = existingItems.find((item) => {
          return normalizeForCompare(item.question) === normalizeForCompare(question);
        });

        if (duplicate) {
          await interaction.reply({
            content: `This question is already learned. Existing ID: \`${duplicate.id}\``,
            flags: EPHEMERAL,
          });
          return;
        }

        if (existingItems.length >= maxItems) {
          await interaction.reply({
            content: `This server already reached the learned Q&A limit: **${maxItems}** items.`,
            flags: EPHEMERAL,
          });
          return;
        }

        const item = await prisma.learnedAnswer.create({
          data: {
            guildId: interaction.guild.id,
            question,
            answer,
          },
        });

        await interaction.reply({
          content: [
            "Done. The Q&A item has been learned.",
            `ID: \`${item.id}\``,
            `Total: **${existingItems.length + 1}/${maxItems}**`,
          ].join("\n"),
          flags: EPHEMERAL,
        });
      },
    },
    {
      customIdPrefix: DELETE_MODAL_PREFIX,

      async execute(interaction) {
        const ownerUserId = interaction.customId.slice(DELETE_MODAL_PREFIX.length);

        if (!(await assertOwnerAndAdmin(interaction, ownerUserId))) return;

        await ensureGuildConfig(interaction.guild.id);

        const query = cleanText(interaction.fields.getTextInputValue("delete_query"));
        const result = await findLearnedAnswer(interaction.guild.id, query);

        if (result.status === "empty") {
          await interaction.reply({
            content: "Please enter an ID, question, or answer.",
            flags: EPHEMERAL,
          });
          return;
        }

        if (result.status === "not_found") {
          await interaction.reply({
            content:
              "No learned Q&A item matched that input. Use `/learn action:list` and try deleting with the ID.",
            flags: EPHEMERAL,
          });
          return;
        }

        if (result.status === "multiple") {
          const matches = result.matches.slice(0, 25);

          const embed = new EmbedBuilder()
            .setTitle("Multiple matches found")
            .setDescription(
              [
                "Select the item you want to delete from the menu below.",
                "",
                "Tip: You can also use `/learn action:list` to see all learned items.",
              ].join("\n")
            );

          matches.slice(0, 10).forEach((item, index) => {
            embed.addFields({
              name: `${index + 1}. ID: ${shortId(item.id)}`,
              value: [
                `Full ID: \`${item.id}\``,
                `**Q:** ${truncateText(item.question, 180)}`,
                `**A:** ${truncateText(item.answer, 180)}`,
              ].join("\n"),
            });
          });

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`${DELETE_SELECT_PREFIX}${interaction.user.id}`)
            .setPlaceholder("Choose the item to delete")
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(
              matches.map((item) => ({
                label: truncateText(item.question || item.id, 90),
                description: `ID: ${shortId(item.id)} • ${truncateText(item.answer, 60)}`,
                value: item.id,
              }))
            );

          const row = new ActionRowBuilder().addComponents(selectMenu);

          await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: EPHEMERAL,
          });
          return;
        }

        const item = result.item;

        await prisma.learnedAnswer.delete({
          where: {
            id: item.id,
          },
        });

        await interaction.reply({
          content: [
            "Done. The learned Q&A item has been deleted.",
            `ID: \`${item.id}\``,
            `Q: ${truncateText(item.question, 160)}`,
          ].join("\n"),
          flags: EPHEMERAL,
        });
      },
    },
  ],

  buttonHandlers: [
    {
      customIdPrefix: LIST_BUTTON_PREFIX,

      async execute(interaction) {
        const [, ownerUserId, pageRaw] = interaction.customId.split(":");

        if (!(await assertOwnerAndAdmin(interaction, ownerUserId))) return;

        const payload = await buildListPayload({
          guildId: interaction.guild.id,
          ownerUserId,
          page: Number(pageRaw) || 0,
        });

        await interaction.update(payload);
      },
    },
    {
      customIdPrefix: CLEAR_CONFIRM_PREFIX,

      async execute(interaction) {
        const ownerUserId = interaction.customId.slice(CLEAR_CONFIRM_PREFIX.length);

        if (!(await assertOwnerAndAdmin(interaction, ownerUserId))) return;

        await ensureGuildConfig(interaction.guild.id);

        const result = await prisma.learnedAnswer.deleteMany({
          where: {
            guildId: interaction.guild.id,
          },
        });

        await interaction.update({
          content: `Done. Deleted **${result.count}** learned Q&A item(s) from this server.`,
          embeds: [],
          components: [],
        });
      },
    },
    {
      customIdPrefix: CLEAR_CANCEL_PREFIX,

      async execute(interaction) {
        const ownerUserId = interaction.customId.slice(CLEAR_CANCEL_PREFIX.length);

        if (!(await assertOwnerAndAdmin(interaction, ownerUserId))) return;

        await interaction.update({
          content: "Cancelled. No learned Q&A items were deleted.",
          embeds: [],
          components: [],
        });
      },
    },
  ],
};
