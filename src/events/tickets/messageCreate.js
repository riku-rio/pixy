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
    tooLong:
      "رسالتك طويلة جدًا على Pixy AI. حاول تخليها أقل من {max} حرف.",
    providerBusy:
      "Pixy AI مشغول شوية دلوقتي. جرّب تاني بعد لحظات.",
    providerFailed:
      "مش قادر أطلع رد دلوقتي. حد من الدعم يقدر يساعدك هنا.",
    emptyResponse:
      "مش قادر أطلع رد مفيد دلوقتي. حد من الدعم يقدر يساعدك هنا.",
    invalidActionJson:
      "حصلت مشكلة بسيطة وأنا بحاول أفهم الطلب. جرّب تكتب طلبك مرة تانية بشكل أوضح، أو استنى حد من الدعم يساعدك هنا.",
    actionFailed:
      "مش قادر أنفّذ الطلب ده دلوقتي. جرّب تاني أو استنى حد من الدعم يساعدك.",
    closeTicket:
      "تمام، هقفل التذكرة دلوقتي.",
    renameTicket:
      "تمام، حدّثت اسم التذكرة.",
  },
  en: {
    tooLong:
      "Your message is too long for Pixy AI to process. Please keep it under {max} characters.",
    providerBusy:
      "Pixy AI is a bit busy right now. Please try again in a moment.",
    providerFailed:
      "I couldn't generate a reply right now. A support member can still help you here.",
    emptyResponse:
      "I couldn't generate a helpful reply right now. A support member can still help you here.",
    invalidActionJson:
      "Something went wrong while I was trying to understand the request. Please try again more clearly, or wait for a support member to help here.",
    actionFailed:
      "I can't complete that request right now. Please try again or wait for a support member to help.",
    closeTicket:
      "Okay, I'll close the ticket now.",
    renameTicket:
      "Done, I updated the ticket name.",
  },
};

function t(lang, key, vars = {}) {
  const selectedLang = MESSAGES[lang] ? lang : "en";
  let text = MESSAGES[selectedLang][key] || MESSAGES.en[key] || key;

  Object.entries(vars).forEach(([name, value]) => {
    text = text.replaceAll(`{${name}}`, String(value));
  });

  return text;
}

function detectUserLanguage(text) {
  return /[\u0600-\u06FF]/.test(String(text || "")) ? "ar" : "en";
}

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

function limitActionText(text) {
  const maxLength = Math.max(1, Number(aiConfig.actionMaxReplyChars || 1000));

  return String(text || "")
    .trim()
    .slice(0, maxLength);
}

function getDefaultActionText({ action, lang }) {
  if (action === TICKET_ACTIONS.CLOSE_TICKET) {
    return t(lang, "closeTicket");
  }

  if (action === TICKET_ACTIONS.RENAME_TICKET) {
    return t(lang, "renameTicket");
  }

  return t(lang, "actionFailed");
}

function getActionText({ parsed, action, lang }) {
  const aiText = limitActionText(parsed.text);

  if (aiText) return aiText;

  return getDefaultActionText({
    action,
    lang,
  });
}

async function logAiUsage({ message, config, aiResult, status, error, ids }) {
  await prisma.aiUsageLog.create({
    data: {
      guildId: ids?.guildId || message.guild?.id,
      channelId: ids?.channelId || message.channel?.id,
      userId: ids?.userId || message.author?.id,
      provider: config.aiProvider || aiConfig.provider,
      model: aiResult?.model || config.aiModel || aiConfig.groq.model,
      promptTokens: aiResult?.usage?.prompt_tokens || null,
      completionTokens: aiResult?.usage?.completion_tokens || null,
      totalTokens: aiResult?.usage?.total_tokens || null,
      status,
      error: error ? String(error).slice(0, 1000) : null,
    },
  });
}

async function safeReply(message, content) {
  try {
    await message.reply(content);
  } catch (error) {
    console.error("Failed to send ticket reply:", error);
  }
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
      const lang = detectUserLanguage(userMessage);
      const ids = {
        guildId: message.guild.id,
        channelId: message.channel.id,
        userId: message.author.id,
      };

      if (userMessage.length > aiConfig.maxInputChars) {
        await message.reply(
          t(lang, "tooLong", {
            max: aiConfig.maxInputChars,
          })
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

        await logAiUsage({
          message,
          config,
          aiResult: null,
          status: status === 429 ? "rate_limited" : "provider_error",
          error: error?.message || error,
          ids,
        });

        if (status === 429) {
          await message.reply(t(lang, "providerBusy"));
          return;
        }

        console.error("AI provider failed:", error);

        await message.reply(t(lang, "providerFailed"));
        return;
      }

      const parsed = parseAiOutput(aiResult.text);

      if (parsed.kind === "invalid_json") {
        await logAiUsage({
          message,
          config,
          aiResult,
          status: "invalid_action_json",
          error: parsed.error || aiResult.text,
          ids,
        });

        await message.reply(t(lang, "invalidActionJson"));
        return;
      }

      if (parsed.kind === "action_request") {
        if (!aiConfig.agentActionsEnabled) {
          await logAiUsage({
            message,
            config,
            aiResult,
            status: "action_rejected:agent_disabled",
            error: "AI agent actions are disabled.",
            ids,
          });

          await message.reply(t(lang, "actionFailed"));
          return;
        }

        const validation = await validateTicketAction({
          actionRequest: parsed,
          message,
          ticket,
        });

        if (!validation.ok) {
          await logAiUsage({
            message,
            config,
            aiResult,
            status: `action_rejected:${validation.code}`,
            error: JSON.stringify({
              action: parsed.action,
              code: validation.code,
            ids,
            }),
          });

          console.warn("AI ticket action rejected:", {
            guildId: message.guild.id,
            channelId: message.channel.id,
            userId: message.author.id,
            action: parsed.action,
            code: validation.code,
          });

          await message.reply(t(lang, "actionFailed"));
          return;
        }

        const actionText = getActionText({
          parsed,
          action: validation.action,
          lang,
        });

        let execution;

        try {
          execution = await executeTicketAction({
            actionRequest: {
              ...parsed,
              text: actionText,
            },
            validation,
            message,
          });
        } catch (error) {
          await logAiUsage({
            message,
            config,
            aiResult,
            status: `action_failed:${validation.action}`,
            error: error?.message || error,
            ids,
          });

          console.error("AI ticket action execution failed:", error);

          await safeReply(message, t(lang, "actionFailed"));
          return;
        }

        await logAiUsage({
          message,
          config,
          aiResult,
          status: `action_success:${validation.action}`,
          ids,
        });

        if (
          validation.action !== TICKET_ACTIONS.CLOSE_TICKET &&
          !execution.replySent &&
          actionText
        ) {
          await message.reply(actionText);

          await prisma.ticketChannel.update({
            where: {
              channelId: message.channel.id,
            },
            data: {
              lastAiReplyAt: new Date(),
            },
          });
        }

        return;
      }

      const aiText = parsed.text;

      if (!aiText) {
        await logAiUsage({
          message,
          config,
          aiResult,
          status: "empty_response",
          ids,
        });

        await message.reply(t(lang, "emptyResponse"));
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

      await logAiUsage({
        message,
        config,
        aiResult,
        status: "success",
        ids,
      });
    } catch (error) {
      console.error("MessageCreate AI ticket handler failed:", error);
    }
  },
};
