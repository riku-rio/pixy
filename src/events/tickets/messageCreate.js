const { Events, ChannelType } = require("discord.js");
const { prisma } = require("../../config/prisma");

const { aiConfig } = require("../../config/ai");
const { buildTicketContext } = require("../../ai/buildTicketContext");
const { buildTicketPrompt } = require("../../ai/buildTicketPrompt");
const { generateAiReply } = require("../../ai/aiClient");
const { splitDiscordMessage } = require("../../utils/splitDiscordMessage");

const channelCooldowns = new Map();

function getErrorStatus(error) {
  return (
    error?.status ||
    error?.code ||
    error?.response?.status ||
    error?.cause?.status ||
    null
  );
}

function isOnCooldown(channelId) {
  const lastReplyAt = channelCooldowns.get(channelId);
  if (!lastReplyAt) return false;

  return Date.now() - lastReplyAt < aiConfig.replyCooldownMs;
}

function setCooldown(channelId) {
  channelCooldowns.set(channelId, Date.now());
}

function cleanInput(content) {
  return String(content || "")
    .replace(/\s+/g, " ")
    .trim();
}

function shouldIgnoreMessage(message) {
  if (!message) return true;
  if (!message.guild) return true;
  if (!message.channel) return true;
  if (message.author?.bot) return true;
  if (message.webhookId) return true;

  const content = cleanInput(message.content);

  if (!content) return true;

  // Ignore common command-looking messages.
  if (content.startsWith("/") || content.startsWith("^")) return true;

  return false;
}

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    try {
      if (shouldIgnoreMessage(message)) return;

      if (message.channel.type !== ChannelType.GuildText) return;

      const config = await prisma.guildConfig.findUnique({
        where: {
          guildId: message.guild.id,
        },
      });

      if (!config?.enabled) return;
      if (config.aiEnabled === false) return;

      const ticket = await prisma.ticketChannel.findUnique({
        where: {
          channelId: message.channel.id,
        },
      });

      if (!ticket) return;
      if (ticket.closed) return;
      if (ticket.aiEnabled === false) return;

      if (isOnCooldown(message.channel.id)) return;

      const userMessage = cleanInput(message.content);

      if (userMessage.length > aiConfig.maxInputChars) {
        await message.reply(
          `Your message is too long for Pixy AI to process. Please keep it under ${aiConfig.maxInputChars} characters.`
        );
        return;
      }

      setCooldown(message.channel.id);

      await prisma.ticketChannel.update({
        where: {
          channelId: message.channel.id,
        },
        data: {
          lastUserMessageAt: new Date(),
        },
      });

      await message.channel.sendTyping();

      const context = await buildTicketContext({ message });

      const messages = buildTicketPrompt({
        guildName: context.guildName,
        channelName: context.channelName,
        userName: message.member?.displayName || message.author.username,
        userMessage,
        recentMessages: context.recentMessages,
        learnedQna: context.learnedQna,
        learnedFreeform: context.learnedFreeform,
        customSystemPrompt: config.aiSystemPrompt,
      });

      let aiResult;

      try {
        aiResult = await generateAiReply({
          messages,
          provider: config.aiProvider || aiConfig.provider,
          model: config.aiModel || aiConfig.groq.model,
        });
      } catch (error) {
        const status = getErrorStatus(error);

        await prisma.aiUsageLog.create({
          data: {
            guildId: message.guild.id,
            channelId: message.channel.id,
            userId: message.author.id,
            provider: config.aiProvider || aiConfig.provider,
            model: config.aiModel || aiConfig.groq.model,
            status: status === 429 ? "rate_limited" : "provider_error",
            error: String(error?.message || error).slice(0, 1000),
          },
        });

        if (status === 429) {
          await message.reply(
            "Pixy AI is a bit busy right now. Please try again in a moment."
          );
          return;
        }

        console.error("AI provider failed:", error);

        await message.reply(
          "I couldn't generate a reply right now. A support member can still help you here."
        );
        return;
      }

      const aiText = aiResult.text;

      if (!aiText) {
        await prisma.aiUsageLog.create({
          data: {
            guildId: message.guild.id,
            channelId: message.channel.id,
            userId: message.author.id,
            provider: config.aiProvider || aiConfig.provider,
            model: aiResult.model || config.aiModel || aiConfig.groq.model,
            status: "empty_response",
          },
        });

        await message.reply(
          "I couldn't generate a helpful reply right now. A support member can still help you here."
        );
        return;
      }

      const chunks = splitDiscordMessage(aiText);

      for (const chunk of chunks) {
        await message.reply(chunk);
      }

      await prisma.ticketChannel.update({
        where: {
          channelId: message.channel.id,
        },
        data: {
          lastAiReplyAt: new Date(),
        },
      });

      await prisma.aiUsageLog.create({
        data: {
          guildId: message.guild.id,
          channelId: message.channel.id,
          userId: message.author.id,
          provider: config.aiProvider || aiConfig.provider,
          model: aiResult.model || config.aiModel || aiConfig.groq.model,
          promptTokens: aiResult.usage?.prompt_tokens || null,
          completionTokens: aiResult.usage?.completion_tokens || null,
          totalTokens: aiResult.usage?.total_tokens || null,
          status: "success",
        },
      });
    } catch (error) {
      console.error("MessageCreate AI ticket handler failed:", error);
    }
  },
};
