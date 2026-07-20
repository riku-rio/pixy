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
const { defaultAiConfig, getGuildAiConfig, getOrCreateGuildSetting } = require("../config/ai");