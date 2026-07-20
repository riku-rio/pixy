const { Events, ChannelType } = require("discord.js");
const { prisma } = require("../../config/prisma");
const { aiConfig } = require("../../config/ai");
const { buildTicketContext } = require("../../ai/buildTicketContext");
const { buildTicketPrompt } = require("../../ai/buildTicketPrompt");
const { generateAiReply } = require("../../ai/aiClient");
const { parseAiOutput } = require("../../ai/parseAiAction");
const { splitDiscordMessage } = require("../../utils/splitDiscordMessage");
const { validateTicketAction } = require("../../utils/tickets/actions/ticketActionValidator");
const { executeTicketAction } = require("../../utils/tickets/actions/ticketActionExecutor");
const { TICKET_ACTIONS } = require("../../utils/tickets/actions/ticketActionTypes");

const channelCooldowns = new Map();
const MESSAGES = {
  ar: {
    tooLong: "رسالتك طويلة جدًا على Pixy AI. حاول تخليها أقل من {max} حرف.",
    providerBusy: "Pixy AI مشغول شوية دلوقتي. جرّب تاني بعد لحظات.",
    providerFailed: "مش قادر أطلع رد دلوقتي. حد من الدعم يقدر يساعدك هنا.",
    emptyResponse: "مش قادر أطلع رد مفيد دلوقتي. حد من الدعم يقدر يساعدك هنا.",
    invalidActionJson: "حصلت مشكلة بسيطة وأنا بحاول أفهم الطلب. جرّب تكتب طلبك مرة تانية بشكل أوضح.",
    actionFailed: "مش قادر أنفّذ الطلب ده دلوقتي. جرّب تاني أو استنى حد من الدعم يساعدك.",
  },
  en: {
    tooLong: "Your message is too long for Pixy AI to process. Please keep it under {max} characters.",
    providerBusy: "Pixy AI is a bit busy right now. Please try again in a moment.",
    providerFailed: "I couldn't generate a reply right now. A support member can still help you here.",
    emptyResponse: "I couldn't generate a helpful reply right now. A support member can still help you here.",
    invalidActionJson: "Something went wrong while I was trying to understand the request. Please try again more clearly.",
    actionFailed: "I can't complete that request right now. Please try again or wait for a support member to help.",
  },
};

function t(lang, key, vars = {}) {
  let text = MESSAGES[MESSAGES[lang] ? lang : "en"][key] || key;
  for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
  return text;
}

const cleanInput = (value) => String(value || "").replace(/\s+/g, " ").trim();
const detectUserLanguage = (value) => /[\u0600-\u06FF]/.test(String(value || "")) ? "ar" : "en";

function shouldIgnoreMessage(message) {
  if (!message?.guild || !message.channel || message.author?.bot || message.webhookId) return true;
  const content = cleanInput(message.content);
  return !content || content.startsWith("/") || content.startsWith("^");
}

function hasExplicitCloseIntent(value) {
  const text = cleanInput(value).toLowerCase();
  if (!text) return false;
  const english = /\b(close|delete|end|finish|resolve)\b.{0,28}\b(ticket|channel|case)\b|\b(ticket|channel|case)\b.{0,28}\b(close|delete|end|finish|resolve)\b/i;
  const arabic = /(اقفل|اغلق|إغلاق|انهاء|إنهاء|احذف).{0,20}(التذكرة|التكت|التيكت|القناة)|(التذكرة|التكت|التيكت|القناة).{0,20}(اقفل|اغلق|إغلاق|انهاء|إنهاء|احذف)/i;
  return english.test(text) || arabic.test(text);
}

function getErrorStatus(error) {
  return error?.status || error?.code || error?.response?.status || error?.cause?.status || null;
}

async function safeReply(message, content) {
  try {
    await message.reply({
      content: String(content || ""),
      allowedMentions: { parse: [], repliedUser: false },
    });
    return true;
  } catch (error) {
    console.error("Failed to send ticket reply:", error);
    return false;
  }
}

async function logAiUsage({ message, config, aiResult, status, error }) {
  await prisma.aiUsageLog.create({
    data: {
      guildId: message.guild.id,
      channelId: message.channelId,
      userId: message.author.id,
      provider: config.aiProvider || aiConfig.provider,
      model: aiResult?.model || config.aiModel || aiConfig.groq.model,
      promptTokens: aiResult?.usage?.prompt_tokens || null,
      completionTokens: aiResult?.usage?.completion_tokens || null,
      totalTokens: aiResult?.usage?.total_tokens || null,
      status,
      error: error ? String(error).slice(0, 1000) : null,
    },
  }).catch((logError) => console.error("Failed to write AI usage log:", logError));
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    try {
      if (shouldIgnoreMessage(message) || message.channel.type !== ChannelType.GuildText) return;

      const channelId = message.channelId;
      const guildId = message.guild.id;

      const [config, ticket, ignoredChannel] = await Promise.all([
        prisma.guildConfig.findUnique({ where: { guildId } }),
        prisma.ticketChannel.findUnique({ where: { channelId } }),
        prisma.guildIgnoredChannel.findUnique({
          where: { guildId_channelId: { guildId, channelId } },
        }),
      ]);
      if (!config?.enabled || config.aiEnabled === false || !ticket || ticket.closed || ticket.aiEnabled === false || ignoredChannel) return;

      const now = Date.now();
      const lastReplyAt = channelCooldowns.get(channelId) || 0;
      if (now - lastReplyAt < aiConfig.replyCooldownMs) return;
      channelCooldowns.set(channelId, now);
      const cleanupTimer = setTimeout(() => channelCooldowns.delete(channelId), aiConfig.replyCooldownMs + 1000);
      cleanupTimer.unref?.();

      const userMessage = cleanInput(message.content);
      const lang = detectUserLanguage(userMessage);
      if (userMessage.length > aiConfig.maxInputChars) {
        await safeReply(message, t(lang, "tooLong", { max: aiConfig.maxInputChars }));
        return;
      }

      await prisma.ticketChannel.update({ where: { channelId }, data: { lastUserMessageAt: new Date() } });
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
        adminRoutes: context.adminRoutes,
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
        await logAiUsage({ message, config, status: status === 429 ? "rate_limited" : "provider_error", error: error?.message || error });
        await safeReply(message, t(lang, status === 429 ? "providerBusy" : "providerFailed"));
        return;
      }

      const parsed = parseAiOutput(aiResult.text);
      if (parsed.kind === "invalid_json") {
        await logAiUsage({ message, config, aiResult, status: "invalid_action_json", error: parsed.error || aiResult.text });
        await safeReply(message, t(lang, "invalidActionJson"));
        return;
      }

      if (parsed.kind === "action_request") {
        if (!aiConfig.agentActionsEnabled) {
          await logAiUsage({ message, config, aiResult, status: "action_rejected:agent_disabled", error: "AI agent actions are disabled." });
          await safeReply(message, t(lang, "actionFailed"));
          return;
        }
        if (parsed.action === TICKET_ACTIONS.CLOSE_TICKET && !hasExplicitCloseIntent(userMessage)) {
          await logAiUsage({ message, config, aiResult, status: "action_rejected:close_not_explicit", error: "Current message did not explicitly request closing the ticket." });
          await safeReply(message, t(lang, "actionFailed"));
          return;
        }

        const validation = await validateTicketAction({ actionRequest: parsed, message, ticket });
        if (!validation.ok) {
          await logAiUsage({ message, config, aiResult, status: `action_rejected:${validation.code}`, error: validation.code });
          await safeReply(message, t(lang, "actionFailed"));
          return;
        }

        try {
          const execution = await executeTicketAction({ actionRequest: parsed, validation, message });
          await logAiUsage({ message, config, aiResult, status: `action_success:${validation.action}` });
          if (validation.action !== TICKET_ACTIONS.CLOSE_TICKET && !execution.replySent && parsed.text) {
            await safeReply(message, String(parsed.text).slice(0, Number(aiConfig.actionMaxReplyChars || 1000)));
            await prisma.ticketChannel.update({ where: { channelId }, data: { lastAiReplyAt: new Date() } });
          }
        } catch (error) {
          await logAiUsage({ message, config, aiResult, status: `action_failed:${validation.action}`, error: error?.message || error });
          console.error("AI ticket action execution failed:", error);
          await safeReply(message, t(lang, "actionFailed"));
        }
        return;
      }

      if (!parsed.text) {
        await logAiUsage({ message, config, aiResult, status: "empty_response" });
        await safeReply(message, t(lang, "emptyResponse"));
        return;
      }

      for (const chunk of splitDiscordMessage(parsed.text)) await safeReply(message, chunk);
      await prisma.ticketChannel.update({ where: { channelId }, data: { lastAiReplyAt: new Date() } });
      await logAiUsage({ message, config, aiResult, status: "success" });
    } catch (error) {
      console.error("MessageCreate AI ticket handler failed:", error);
    }
  },
};
