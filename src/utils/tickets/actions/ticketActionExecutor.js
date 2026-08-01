const { prisma } = require("../../../config/prisma");
const { aiConfig } = require("../../../config/ai");
const { TICKET_ACTIONS } = require("./ticketActionTypes");
const { getGuildActionRejection } = require("../../../features/guildFeatureGate");
const {
  getOrCreateEscalationNotificationChannel,
  sendEscalationNotification,
  canMentionRoleInChannel,
} = require("../escalationNotifications");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const limitReplyText = (text) => String(text || "").trim().slice(0, Math.max(1, Number(aiConfig.actionMaxReplyChars || 1000)));

async function sendActionReply(message, text) {
  const content = limitReplyText(text);
  if (!content) return false;
  await message.reply({ content, allowedMentions: { parse: [], repliedUser: false } });
  return true;
}

async function sendTicketEscalationReply({ message, roleName, text }) {
  const content = limitReplyText(text) || `This ticket has been escalated to ${roleName}. Please wait for them to respond here.`;
  await message.channel.send({ content, allowedMentions: { parse: [] } });
  return true;
}

async function refreshEscalatedTicketControls(channel) {
  const {
    refreshTicketControlMessage,
  } = require("../../../components/ticketAiControls");

  await refreshTicketControlMessage(channel, false);
}

async function executeRenameTicket({ message, validation }) {
  await message.channel.setName(validation.data.name, `Pixy AI safe action: rename_ticket requested by ${message.author?.tag || "user"}`);
  await prisma.ticketChannel.update({
    where: { channelId: message.channel.id },
    data: { renamedByAiAt: new Date(), lastAiAction: TICKET_ACTIONS.RENAME_TICKET, lastAiActionAt: new Date() },
  });
  return { ok: true, replySent: false, channelDeleted: false };
}

async function executeEscalateTicket({ actionRequest, message, validation }) {
  const { categoryId, roleId, reason, name, routeId, roleName } = validation.data;
  const auditReason = `Pixy AI safe action: escalate_ticket requested by ${message.author?.tag || "user"}`.slice(0, 512);
  const originalParentId = message.channel.parentId;
  const originalName = message.channel.name;
  let roleOverwriteCreated = false;

  const [config, role] = await Promise.all([
    prisma.guildConfig.findUnique({
      where: { guildId: message.guild.id },
      select: { escalationNotificationChannelId: true },
    }),
    message.guild.roles.fetch(roleId).catch(() => null),
  ]);
  if (!role) throw new Error("escalation_role_missing");

  const notificationResult = await getOrCreateEscalationNotificationChannel({
    guild: message.guild,
    categoryId,
    existingChannelId: config?.escalationNotificationChannelId,
  });
  if (!notificationResult.ok) throw new Error(notificationResult.code);
  if (!(await canMentionRoleInChannel(notificationResult.channel, role))) {
    throw new Error("missing_role_mention_permission_in_notification_channel");
  }

  try {
    const existingOverwrite = message.channel.permissionOverwrites.cache.get(role.id);
    roleOverwriteCreated = !existingOverwrite;
    await message.channel.permissionOverwrites.edit(
      role,
      { ViewChannel: true, SendMessages: true, ReadMessageHistory: true },
      { reason: auditReason }
    );

    if (message.channel.parentId !== categoryId) {
      await message.channel.setParent(categoryId, { lockPermissions: false, reason: auditReason });
    }
    if (name && name !== message.channel.name) await message.channel.setName(name, auditReason);

    const notificationMessage = await sendEscalationNotification({
      notificationChannel: notificationResult.channel,
      ticketChannel: message.channel,
      role,
      reason,
      routeId,
      requestedBy: message.author,
      newName: name,
      summary: actionRequest.data?.summary,
    });

    await prisma.ticketChannel.update({
      where: { channelId: message.channel.id },
      data: {
        escalated: true,
        escalatedAt: new Date(),
        escalatedRoleId: roleId,
        escalationReason: reason || null,
        escalationNotificationMessageId: notificationMessage.id,
        aiEnabled: false,
        lastAiAction: TICKET_ACTIONS.ESCALATE_TICKET,
        lastAiActionAt: new Date(),
        lastAiReplyAt: new Date(),
      },
    });

    const replySent = await sendTicketEscalationReply({ message, roleName: roleName || role.name, text: actionRequest.text });

    await refreshEscalatedTicketControls(message.channel).catch((error) => {
      console.error("Failed to refresh ticket controls after escalation:", error);
    });

    return { ok: true, replySent, channelDeleted: false };
  } catch (error) {
    if (message.channel.name !== originalName) {
      await message.channel.setName(originalName, "Rollback failed Pixy escalation").catch(() => null);
    }
    if (originalParentId && message.channel.parentId !== originalParentId) {
      await message.channel.setParent(originalParentId, { lockPermissions: false, reason: "Rollback failed Pixy escalation" }).catch(() => null);
    }
    if (roleOverwriteCreated) {
      await message.channel.permissionOverwrites.delete(role, "Rollback failed Pixy escalation").catch(() => null);
    }
    throw error;
  }
}

async function executeCloseTicket({ actionRequest, message }) {
  const replySent = await sendActionReply(message, actionRequest.text);
  await prisma.ticketChannel.update({
    where: { channelId: message.channel.id },
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
    const delayMs = Math.max(0, Math.min(Number(aiConfig.ticketCloseDeleteDelayMs || 2500), 10000));
    if (delayMs > 0) await sleep(delayMs);
    await message.channel.delete(`Pixy AI safe action: close_ticket requested by ${message.author?.tag || "user"}`);
    return { ok: true, replySent, channelDeleted: true };
  } catch (error) {
    await prisma.ticketChannel.update({
      where: { channelId: message.channel.id },
      data: {
        closed: false,
        status: "open",
        closedByAi: false,
        closedAt: null,
        lastAiAction: "close_ticket_failed",
        lastAiActionAt: new Date(),
      },
    }).catch((dbError) => console.error("Failed to revert ticket close state:", dbError));
    throw error;
  }
}

async function executeTicketAction({
  actionRequest,
  validation,
  message,
  getActionRejection = getGuildActionRejection,
}) {
  const rejectionCode = await getActionRejection(
    message.guild?.id,
    validation.action
  );
  if (rejectionCode) {
    const error = new Error(`Ticket action is unavailable: ${rejectionCode}`);
    error.code = rejectionCode;
    throw error;
  }
  if (validation.action === TICKET_ACTIONS.RENAME_TICKET) return executeRenameTicket({ message, validation });
  if (validation.action === TICKET_ACTIONS.CLOSE_TICKET) return executeCloseTicket({ actionRequest, message });
  if (validation.action === TICKET_ACTIONS.ESCALATE_TICKET) return executeEscalateTicket({ actionRequest, message, validation });
  throw new Error(`Unsupported ticket action executor: ${validation.action}`);
}

module.exports = { executeTicketAction };
