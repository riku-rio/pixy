const { ChannelType, PermissionFlagsBits } = require("discord.js");
const {
  TICKET_ACTIONS,
  isAllowedTicketAction,
} = require("./ticketActionTypes");

function sanitizeTicketName(value) {
  const text = String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 90)
    .replace(/^[-_]+|[-_]+$/g, "");

  return text;
}

async function getBotMember(guild) {
  if (!guild) return null;

  if (guild.members?.me) {
    return guild.members.me;
  }

  try {
    return await guild.members.fetchMe();
  } catch {
    return null;
  }
}

async function botCanManageChannel(channel) {
  const botMember = await getBotMember(channel.guild);

  if (!botMember) return false;

  const permissions = channel.permissionsFor(botMember);

  return Boolean(permissions?.has(PermissionFlagsBits.ManageChannels));
}

async function validateTicketAction({ actionRequest, message, ticket }) {
  const action = String(actionRequest?.action || "").trim();

  if (!isAllowedTicketAction(action)) {
    return {
      ok: false,
      code: "unsupported_action",
    };
  }

  if (!message?.guild || !message?.channel) {
    return {
      ok: false,
      code: "invalid_context",
    };
  }

  if (message.channel.type !== ChannelType.GuildText) {
    return {
      ok: false,
      code: "invalid_channel_type",
    };
  }

  if (!ticket) {
    return {
      ok: false,
      code: "ticket_not_found",
    };
  }

  if (ticket.closed) {
    return {
      ok: false,
      code: "ticket_already_closed",
    };
  }

  const canManageChannel = await botCanManageChannel(message.channel);

  if (!canManageChannel) {
    return {
      ok: false,
      code: "missing_manage_channels_permission",
    };
  }

  if (action === TICKET_ACTIONS.CLOSE_TICKET) {
    if (message.channel.deletable === false) {
      return {
        ok: false,
        code: "channel_not_deletable",
      };
    }

    return {
      ok: true,
      action,
      data: {},
    };
  }

  if (action === TICKET_ACTIONS.RENAME_TICKET) {
    const proposedName =
      actionRequest.data?.name ||
      actionRequest.data?.channelName ||
      actionRequest.data?.newName ||
      actionRequest.data?.new_name;

    const sanitizedName = sanitizeTicketName(proposedName);

    if (!sanitizedName || sanitizedName.length < 2) {
      return {
        ok: false,
        code: "invalid_ticket_name",
      };
    }

    if (sanitizedName.length > 90) {
      return {
        ok: false,
        code: "ticket_name_too_long",
      };
    }

    if (sanitizedName === message.channel.name) {
      return {
        ok: false,
        code: "same_ticket_name",
      };
    }

    if (message.channel.manageable === false) {
      return {
        ok: false,
        code: "channel_not_manageable",
      };
    }

    return {
      ok: true,
      action,
      data: {
        name: sanitizedName,
      },
    };
  }

  return {
    ok: false,
    code: "unsupported_action",
  };
}

module.exports = {
  validateTicketAction,
  sanitizeTicketName,
};
