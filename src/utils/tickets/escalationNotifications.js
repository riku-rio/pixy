const {
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");

const { prisma } = require("../../config/prisma");
const { aiConfig } = require("../../config/ai");

function getNotificationChannelName() {
  return String(
    aiConfig.escalationNotificationChannelName || "pixy-notifications"
  )
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "") || "pixy-notifications";
}

async function getBotMember(guild) {
  if (!guild) return null;

  if (guild.members?.me) return guild.members.me;

  try {
    return await guild.members.fetchMe();
  } catch {
    return null;
  }
}

async function getExistingTextChannel(guild, channelId, categoryId) {
  if (!guild || !channelId) return null;

  const cached = guild.channels.cache.get(channelId);

  if (
    cached?.type === ChannelType.GuildText &&
    (!categoryId || cached.parentId === categoryId)
  ) {
    return cached;
  }

  try {
    const fetched = await guild.channels.fetch(channelId);

    if (
      fetched?.type === ChannelType.GuildText &&
      (!categoryId || fetched.parentId === categoryId)
    ) {
      return fetched;
    }
  } catch {
    return null;
  }

  return null;
}

async function findNotificationChannelInCategory(guild, categoryId) {
  if (!guild || !categoryId) return null;

  await guild.channels.fetch().catch(() => null);

  const wantedName = getNotificationChannelName();

  return (
    guild.channels.cache.find((channel) => {
      return (
        channel.type === ChannelType.GuildText &&
        channel.parentId === categoryId &&
        String(channel.name || "").toLowerCase() === wantedName
      );
    }) || null
  );
}

async function canSendInChannel(channel) {
  const botMember = await getBotMember(channel.guild);
  if (!botMember) return false;

  const permissions = channel.permissionsFor(botMember);

  return Boolean(
    permissions?.has(PermissionFlagsBits.ViewChannel) &&
      permissions?.has(PermissionFlagsBits.SendMessages)
  );
}

async function canMentionRoleInChannel(channel, role) {
  if (!channel || !role) return false;

  if (role.mentionable) return true;

  const botMember = await getBotMember(channel.guild);
  if (!botMember) return false;

  const permissions = channel.permissionsFor(botMember);

  return Boolean(permissions?.has(PermissionFlagsBits.MentionEveryone));
}

async function getOrCreateEscalationNotificationChannel({
  guild,
  categoryId,
  existingChannelId,
}) {
  if (!guild || !categoryId) {
    return {
      ok: false,
      code: "missing_escalation_category",
    };
  }

  let channel = await getExistingTextChannel(
    guild,
    existingChannelId,
    categoryId
  );

  if (!channel) {
    channel = await findNotificationChannelInCategory(guild, categoryId);
  }

  if (!channel) {
    const botMember = await getBotMember(guild);

    if (!botMember?.permissions?.has(PermissionFlagsBits.ManageChannels)) {
      return {
        ok: false,
        code: "missing_manage_channels_permission",
      };
    }

    try {
      channel = await guild.channels.create({
        name: getNotificationChannelName(),
        type: ChannelType.GuildText,
        parent: categoryId,
        reason: "Pixy AI escalation notification channel setup",
      });
    } catch {
      return {
        ok: false,
        code: "notification_channel_create_failed",
      };
    }
  }

  const canSend = await canSendInChannel(channel);

  if (!canSend) {
    return {
      ok: false,
      code: "missing_notification_channel_send_permission",
    };
  }

  await prisma.guildConfig.update({
    where: {
      guildId: guild.id,
    },
    data: {
      escalationNotificationChannelId: channel.id,
    },
  });

  return {
    ok: true,
    channel,
  };
}

async function sendEscalationNotification({
  notificationChannel,
  ticketChannel,
  role,
  reason,
  routeId,
  requestedBy,
  newName,
}) {
  const content = [
    "🚨 **Ticket Escalated**",
    "",
    `**Ticket Channel:** <#${ticketChannel.id}>`,
    `**Support Role:** <@&${role.id}>`,
    `**Support Team:** ${role.name}`,
    `**Reason:** ${reason || "No reason provided."}`,
    `**New Ticket Name:** ${newName || ticketChannel.name}`,
    routeId ? `**Route ID:** \`${routeId}\`` : null,
    requestedBy
      ? `**Requested By:** ${requestedBy.tag || requestedBy.username || requestedBy.id} (${requestedBy.id})`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return notificationChannel.send({
    content,
    allowedMentions: {
      roles: [role.id],
      users: [],
      repliedUser: false,
    },
  });
}

module.exports = {
  getOrCreateEscalationNotificationChannel,
  sendEscalationNotification,
  canMentionRoleInChannel,
};
