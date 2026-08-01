const {
  getGuildLearnedKnowledgeWriteAvailability,
} = require("../billing/entitlementService");

const LEARN_COMMAND_NAMES = new Set(["learn", "pixy-learn"]);
const LEARN_ADD_ACTIONS = new Set(["add", "add-qna", "add-freeform"]);
const LEARN_QNA_MODAL_PREFIX = "learn_add_qna:";
const LEARN_FREEFORM_MODAL_PREFIX = "learn_add_freeform:";

const LEARN_WRITE_BLOCKED_MESSAGE = [
  "Adding learned knowledge requires an active Pixy Pro Trial, Pixy Pro, or Partner plan.",
  "Use `/pixy-billing` to view this server's billing status and activation options.",
].join("\n");

function isLearnCommand(interaction) {
  return LEARN_COMMAND_NAMES.has(
    String(interaction?.commandName || "").toLowerCase()
  );
}

function getLearnWriteAction(interaction) {
  if (interaction?.isChatInputCommand?.() && isLearnCommand(interaction)) {
    const action = interaction.options?.getString?.("action", true);
    return LEARN_ADD_ACTIONS.has(action) ? action : null;
  }

  if (!interaction?.isModalSubmit?.()) return null;

  const customId = String(interaction.customId || "");
  if (customId.startsWith(LEARN_QNA_MODAL_PREFIX)) return "add-qna";
  if (customId.startsWith(LEARN_FREEFORM_MODAL_PREFIX)) return "add-freeform";
  return null;
}

async function getLearnWriteAvailability(interaction, options = {}) {
  const action = getLearnWriteAction(interaction);
  if (!action) {
    return {
      available: true,
      action: null,
      gated: false,
    };
  }

  if (!interaction.guild?.id) {
    return {
      available: false,
      action,
      gated: true,
      code: "invalid_guild",
    };
  }

  const getAvailability =
    options.getAvailability || getGuildLearnedKnowledgeWriteAvailability;
  const availability = await getAvailability(interaction.guild.id, {
    client: options.client,
    now: options.now,
  });

  return {
    ...availability,
    action,
    gated: true,
  };
}

async function stopUnavailableLearnWrite(interaction, options = {}) {
  const availability = await getLearnWriteAvailability(interaction, options);
  if (!availability.gated || availability.available) return false;

  const reply = options.reply;
  const payload = {
    content: LEARN_WRITE_BLOCKED_MESSAGE,
    flags: 64,
  };

  if (reply) {
    await reply(interaction, payload);
  } else if (interaction.replied || interaction.deferred) {
    await interaction.followUp(payload);
  } else {
    await interaction.reply(payload);
  }

  return true;
}

module.exports = {
  LEARN_ADD_ACTIONS,
  LEARN_COMMAND_NAMES,
  LEARN_FREEFORM_MODAL_PREFIX,
  LEARN_QNA_MODAL_PREFIX,
  LEARN_WRITE_BLOCKED_MESSAGE,
  getLearnWriteAction,
  getLearnWriteAvailability,
  isLearnCommand,
  stopUnavailableLearnWrite,
};
