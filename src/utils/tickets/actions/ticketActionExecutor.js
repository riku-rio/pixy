const { prisma } = require("../../../config/prisma");
const { aiConfig } = require("../../../config/ai");
const { TICKET_ACTIONS } = require("./ticketActionTypes");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function limitReplyText(text) {
  const maxLength = Math.max(1, Number(aiConfig.actionMaxReplyChars || 1000));

  return String(text || "")
    .trim()
    .slice(0, maxLength);
}

async function sendActionReply(message, text) {
  const replyText = limitReplyText(text);

  if (!replyText) return false;

  await message.reply(replyText);

  return true;
}

async function executeRenameTicket({ message, validation }) {
  const name = validation.data.name;

  await message.channel.setName(
    name,
    `Pixy AI safe action: rename_ticket requested by ${message.author?.tag || "user"}`
  );

  await prisma.ticketChannel.update({
    where: {
      channelId: message.channel.id,
    },
    data: {
      renamedByAiAt: new Date(),
      lastAiAction: TICKET_ACTIONS.RENAME_TICKET,
      lastAiActionAt: new Date(),
    },
  });

  return {
    ok: true,
    replySent: false,
    channelDeleted: false,
  };
}

async function executeCloseTicket({ actionRequest, message }) {
  const replySent = await sendActionReply(message, actionRequest.text);

  await prisma.ticketChannel.update({
    where: {
      channelId: message.channel.id,
    },
    data: {
      closed: true,
      status: "closed",
      closedByAi: true,
      closedAt: new Date(),
      lastAiAction: TICKET_ACTIONS.CLOSE_TICKET,
      lastAiActionAt: new Date(),
    },
  });

  try {
    const delayMs = Math.max(
      0,
      Math.min(Number(aiConfig.ticketCloseDeleteDelayMs || 2500), 10000)
    );

    if (delayMs > 0) {
      await sleep(delayMs);
    }

    await message.channel.delete(
      `Pixy AI safe action: close_ticket requested by ${
        message.author?.tag || "user"
      }`
    );

    return {
      ok: true,
      replySent,
      channelDeleted: true,
    };
  } catch (error) {
    await prisma.ticketChannel
      .update({
        where: {
          channelId: message.channel.id,
        },
        data: {
          closed: false,
          status: "open",
          closedByAi: false,
          closedAt: null,
          lastAiAction: "close_ticket_failed",
          lastAiActionAt: new Date(),
        },
      })
      .catch((dbError) => {
        console.error("Failed to revert ticket close state:", dbError);
      });

    throw error;
  }
}

async function executeTicketAction({ actionRequest, validation, message }) {
  if (validation.action === TICKET_ACTIONS.RENAME_TICKET) {
    return executeRenameTicket({
      message,
      validation,
    });
  }

  if (validation.action === TICKET_ACTIONS.CLOSE_TICKET) {
    return executeCloseTicket({
      actionRequest,
      message,
    });
  }

  throw new Error(`Unsupported ticket action executor: ${validation.action}`);
}

module.exports = {
  executeTicketAction,
};
