const { Events } = require("discord.js");

const ACKNOWLEDGEMENT_DELAY_MS = 1200;

function isAnySelectMenu(interaction) {
  return Boolean(
    interaction.isStringSelectMenu?.() ||
      interaction.isUserSelectMenu?.() ||
      interaction.isRoleSelectMenu?.() ||
      interaction.isChannelSelectMenu?.() ||
      interaction.isMentionableSelectMenu?.()
  );
}

function canOpenModal(interaction) {
  if (interaction.isChatInputCommand?.()) {
    const commandName = String(interaction.commandName || "").replace(/^pixy-/, "");
    const action = interaction.options?.getString?.("action", false);

    if (commandName === "learn") {
      return ["add", "add-qna", "add-freeform", "delete"].includes(action);
    }

    if (commandName === "admins") {
      return action === "delete";
    }

    return false;
  }

  if (interaction.isButton?.()) {
    return /guild_config:(?:settings|setup):(api_set|model_set):/.test(
      String(interaction.customId || "")
    );
  }

  if (interaction.isStringSelectMenu?.()) {
    const customId = String(interaction.customId || "");

    if (customId.startsWith("settings_badwords_action:")) {
      return interaction.values?.[0] === "add";
    }

    return false;
  }

  if (interaction.isRoleSelectMenu?.()) {
    return String(interaction.customId || "").startsWith("admins_role_select:");
  }

  return false;
}

function withoutInitialResponseFlags(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const { flags, ephemeral, ...rest } = payload;
  return rest;
}

function installResponseCompatibility(interaction, state, clearTimer) {
  const originalReply = interaction.reply.bind(interaction);
  const originalUpdate = interaction.update?.bind(interaction);
  const originalDeferReply = interaction.deferReply?.bind(interaction);
  const originalDeferUpdate = interaction.deferUpdate?.bind(interaction);
  const originalShowModal = interaction.showModal?.bind(interaction);

  interaction.reply = async (payload) => {
    clearTimer();
    if (state.autoDeferred || interaction.deferred || interaction.replied) {
      return interaction.editReply(withoutInitialResponseFlags(payload));
    }
    return originalReply(payload);
  };

  if (originalUpdate) {
    interaction.update = async (payload) => {
      clearTimer();
      if (state.autoDeferred || interaction.deferred || interaction.replied) {
        return interaction.editReply(withoutInitialResponseFlags(payload));
      }
      return originalUpdate(payload);
    };
  }

  if (originalDeferReply) {
    interaction.deferReply = async (options) => {
      clearTimer();
      if (state.autoDeferred || interaction.deferred || interaction.replied) return undefined;
      return originalDeferReply(options);
    };
  }

  if (originalDeferUpdate) {
    interaction.deferUpdate = async (options) => {
      clearTimer();
      if (state.autoDeferred || interaction.deferred || interaction.replied) return undefined;
      return originalDeferUpdate(options);
    };
  }

  if (originalShowModal) {
    interaction.showModal = async (modal, options) => {
      clearTimer();
      return originalShowModal(modal, options);
    };
  }
}

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    if (
      interaction.isAutocomplete?.() ||
      (!interaction.isChatInputCommand?.() &&
        !interaction.isModalSubmit?.() &&
        !interaction.isButton?.() &&
        !isAnySelectMenu(interaction))
    ) {
      return;
    }

    if (canOpenModal(interaction)) return;

    const state = { autoDeferred: false };
    let timer = null;
    const clearTimer = () => {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
    };

    installResponseCompatibility(interaction, state, clearTimer);

    timer = setTimeout(async () => {
      timer = null;
      if (interaction.deferred || interaction.replied) return;

      try {
        if (interaction.isButton?.() || isAnySelectMenu(interaction)) {
          await interaction.deferUpdate();
        } else {
          await interaction.deferReply({ flags: 64 });
        }
        state.autoDeferred = true;
      } catch {
        // The command handler may have acknowledged the interaction at the same time.
      }
    }, ACKNOWLEDGEMENT_DELAY_MS);

    if (typeof timer.unref === "function") timer.unref();
  },
};
