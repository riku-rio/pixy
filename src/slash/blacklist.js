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
  if (!channel