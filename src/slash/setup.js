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
const configurationPanel = require("../components/guildConfigurationPanel");

const EPHEMERAL = 64;
const SELECT_EXISTING = "setup_select_category_existing:";
const CREATE_AUTO = "setup_create_category_auto:";
const CATEGORY_SELECT = "setup_category_select:";
const SETUP_NAV = "guild_config:setup:nav:";
const AUTO_NAMES = ["pixy-tickets", "pixy-support-tickets", "pixy-help-tickets"];

async function assertOwner(interaction, userId) {
  if (!interaction.guild || interaction.user.id !== userId || !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: "Only the administrator who opened /pixy-setup can use this control.", flags: EPHEMERAL });
    return false;
  }
  return true;
}
async function currentCategory(guild) {
  const config = await prisma.guildConfig.findUnique({ where: { guildId: guild.id } });
  if (!config?.ticketCategoryId) return null;
  const cached = guild.channels.cache.get(config.ticketCategoryId);
  if (cached?.type === ChannelType.GuildCategory) return cached;
  return guild.channels.fetch(config.ticketCategoryId).catch(() => null);
}
function categoryPayload(userId, category) {
  const lines = [category ? `Current ticket category: **${category.name}**` : "Ticket category is not configured yet.", "", "Choose where Pixy should create ticket channels:"];
  return {
    content: lines.join("\n"), embeds: [],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${SELECT_EXISTING}${userId}`).setLabel("Select existing category").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`${CREATE_AUTO}${userId}`).setLabel("Create automatically").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`${SETUP_NAV}${userId}:aiapi`).setLabel("Next").setStyle(ButtonStyle.Primary).setDisabled(!category)
    )],
  };
}
function categorySelectPayload(userId) {
  return {
    content: "Choose the category where ticket channels are created:", embeds: [],
    components: [new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder().setCustomId(`${CATEGORY_SELECT}${userId}`).setPlaceholder("Select the ticket category").setChannelTypes(ChannelType.GuildCategory)
    )],
  };
}
async function saveCategory(guildId, categoryId) {
  return prisma.guildConfig.upsert({
    where: { guildId },
    create: { guildId, ticketCategoryId: categoryId, enabled: true, maxLearnedItems: 20 },
    update: { ticketCategoryId: categoryId, enabled: true },
  });
}
async function createOrFind(guild) {
  await guild.channels.fetch().catch(() => null);
  const existing = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && AUTO_NAMES.includes(String(channel.name).toLowerCase()));
  if (existing) return existing;
  const member = guild.members.me || await guild.members.fetchMe().catch(() => null);
  if (!member?.permissions.has(PermissionFlagsBits.ManageChannels)) return null;
  return guild.channels.create({ name: AUTO_NAMES[0], type: ChannelType.GuildCategory, reason: "Pixy AI ticket category setup" });
}

module.exports = {
  data: new SlashCommandBuilder().setName("setup").setDescription("Setup Pixy AI for this server.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  guildOnly: true,
  userPermissions: [PermissionFlagsBits.Administrator],
  async execute(interaction) {
    const category = await currentCategory(interaction.guild);
    await interaction.reply({ ...categoryPayload(interaction.user.id, category), flags: EPHEMERAL });
  },
  buttonHandlers: [
    {
      customIdPrefix: SELECT_EXISTING,
      async execute(interaction) {
        const userId = interaction.customId.slice(SELECT_EXISTING.length);
        if (!(await assertOwner(interaction, userId))) return;
        await interaction.update(categorySelectPayload(userId));
      },
    },
    {
      customIdPrefix: CREATE_AUTO,
      async execute(interaction) {
        const userId = interaction.customId.slice(CREATE_AUTO.length);
        if (!(await assertOwner(interaction, userId))) return;
        await interaction.deferUpdate();
        const category = await createOrFind(interaction.guild);
        if (!category) {
          await interaction.editReply({ content: "I need Manage Channels permission to create the ticket category automatically.", embeds: [], components: [] });
          return;
        }
        await saveCategory(interaction.guild.id, category.id);
        await interaction.editReply({ content: `Ticket category saved as **${category.name}**.`, ...(await configurationPanel.renderAiApi(interaction.guild.id, userId, "setup")) });
      },
    },
    {
      customIdPrefix: SETUP_NAV,
      async execute(interaction) {
        const [userId, page] = interaction.customId.slice(SETUP_NAV.length).split(":");
        if (!(await assertOwner(interaction, userId))) return;
        if (page === "category") {
          const category = await currentCategory(interaction.guild);
          await interaction.update(categoryPayload(userId, category));
          return;
        }
        await interaction.update(await configurationPanel.render(page, interaction.guild.id, userId, "setup"));
      },
    },
  ],
  selectMenuHandlers: [{
    customIdPrefix: CATEGORY_SELECT,
    type: "channel",
    async execute(interaction) {
      const userId = interaction.customId.slice(CATEGORY_SELECT.length);
      if (!(await assertOwner(interaction, userId))) return;
      const categoryId = interaction.values?.[0];
      const category = interaction.guild.channels.cache.get(categoryId) || await interaction.guild.channels.fetch(categoryId).catch(() => null);
      if (!category || category.type !== ChannelType.GuildCategory) {
        await interaction.update({ content: "Invalid category selected.", embeds: [], components: [] });
        return;
      }
      await saveCategory(interaction.guild.id, category.id);
      await interaction.update({ content: `Ticket category saved as **${category.name}**.`, ...(await configurationPanel.renderAiApi(interaction.guild.id, userId, "setup")) });
    },
  }],
};
