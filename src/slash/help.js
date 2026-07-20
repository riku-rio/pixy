const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
} = require("discord.js");

const EPHEMERAL = 64;
const GROQ_KEYS_URL = "https://console.groq.com/keys";
const GROQ_QUICKSTART_URL = "https://console.groq.com/docs/quickstart";

const PREFIX = Object.freeze({
  NAV: "help_nav:",
  HOME: "help_home:",
  CLOSE: "help_close:",
});

const PAGES = Object.freeze({
  HOME: "home",
  QUICKSTART: "quickstart",
  GROQ: "groq",
  FEATURES: "features",
  COMMANDS: "commands",
  TROUBLESHOOTING: "troubleshooting",
});

const TOPICS = Object.freeze([
  {
    label: "Quick Start",
    description: "Set up Pixy from ticket category to AI replies",
    value: PAGES.QUICKSTART,
    emoji: "🚀",
  },
  {
    label: "Groq API Key",
    description: "Create and connect your server's Groq key",
    value: PAGES.GROQ,
    emoji: "🔑",
  },
  {
    label: "Features",
    description: "Understand each Pixy feature toggle",
    value: PAGES.FEATURES,
    emoji: "🧩",
  },
  {
    label: "Commands",
    description: "See what each Pixy slash command does",
    value: PAGES.COMMANDS,
    emoji: "⌨️",
  },
  {
    label: "Troubleshooting",
    description: "Fix common setup, key, model, and permission issues",
    value: PAGES.TROUBLESHOOTING,
    emoji: "🛠️",
  },
]);

const scoped = (prefix, userId) => `${prefix}${userId}`;

async function assertOwner(interaction, userId) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "This help panel can only be used inside a server.",
      flags: EPHEMERAL,
    });
    return false;
  }

  if (interaction.user.id !== userId) {
    await interaction.reply({
      content: "Only the person who opened `/pixy-help` can use this panel.",
      flags: EPHEMERAL,
    });
    return false;
  }

  return true;
}

function topicMenu(userId) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(scoped(PREFIX.NAV, userId))
      .setPlaceholder("Choose a help topic...")
      .addOptions(...TOPICS)
  );
}

function navigation(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(scoped(PREFIX.HOME, userId))
      .setLabel("Home")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(scoped(PREFIX.CLOSE, userId))
      .setLabel("Close")
      .setStyle(ButtonStyle.Secondary)
  );
}

function home(userId) {
  const embed = new EmbedBuilder()
    .setTitle("🤖 Pixy Help")
    .setColor(0x5865f2)
    .setDescription([
      "Choose a topic below to learn how to set up and use Pixy.",
      "",
      "For a new server, start with **Quick Start**, then connect a Groq API key.",
    ].join("\n"))
    .addFields({
      name: "Recommended setup order",
      value: "`/pixy-setup` → `/pixy-settings` → **AI API** → **Features**",
    });

  return {
    content: null,
    embeds: [embed],
    components: [topicMenu(userId), navigation(userId)],
  };
}

function quickStart(userId) {
  const embed = new EmbedBuilder()
    .setTitle("🚀 Quick Start")
    .setColor(0x57f287)
    .setDescription("Follow these steps in order to get Pixy replying inside your ticket channels.")
    .addFields(
      {
        name: "1. Choose the ticket category",
        value: "Run `/pixy-setup` as a server administrator and select the category that contains your ticket channels.",
      },
      {
        name: "2. Connect Groq",
        value: "Open `/pixy-settings` → **AI API** → **Set API Key**, then paste your server's Groq API key.",
      },
      {
        name: "3. Check the model",
        value: "Keep the default model or choose another supported Groq chat model from the **AI API** page.",
      },
      {
        name: "4. Review features",
        value: "Open **Features** in `/pixy-settings` and enable only the replies and ticket actions you want Pixy to perform.",
      },
      {
        name: "5. Test in a ticket",
        value: "Send a normal support question inside a channel under the configured ticket category.",
      }
    );

  return {
    content: null,
    embeds: [embed],
    components: [topicMenu(userId), navigation(userId)],
  };
}

function groq(userId) {
  const embed = new EmbedBuilder()
    .setTitle("🔑 Groq API Key")
    .setColor(0xfee75c)
    .setDescription("Each server connects its own Groq API key. Pixy does not provide or share a global key.")
    .addFields(
      {
        name: "Create a key",
        value: [
          "1. Open the official **Groq API Keys** page below.",
          "2. Sign in or create a Groq account.",
          "3. Select **Create API Key** and give it a recognizable name.",
          "4. Copy the secret immediately and keep it private.",
        ].join("\n"),
      },
      {
        name: "Connect it to Pixy",
        value: "Run `/pixy-settings` → **AI API** → **Set API Key**, then paste the key into the private modal.",
      },
      {
        name: "How Pixy stores it",
        value: "Pixy validates the key, encrypts it before database storage, and never displays the saved secret again.",
      },
      {
        name: "Important",
        value: "Never post the key in a channel, screenshot, source file, or support message. Revoke and replace it immediately if it is exposed.",
      }
    );

  const links = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Create Groq API Key")
      .setEmoji("🔑")
      .setStyle(ButtonStyle.Link)
      .setURL(GROQ_KEYS_URL),
    new ButtonBuilder()
      .setLabel("Groq Quickstart")
      .setEmoji("📖")
      .setStyle(ButtonStyle.Link)
      .setURL(GROQ_QUICKSTART_URL)
  );

  return {
    content: null,
    embeds: [embed],
    components: [topicMenu(userId), links, navigation(userId)],
  };
}

function features(userId) {
  const embed = new EmbedBuilder()
    .setTitle("🧩 Pixy Features")
    .setColor(0x5865f2)
    .setDescription("Server administrators can enable or disable these from `/pixy-settings` → **Features**.")
    .addFields(
      {
        name: "🤖 AI Reply",
        value: "Allows Pixy to answer messages inside configured ticket channels.",
        inline: true,
      },
      {
        name: "🔒 Close Ticket",
        value: "Allows validated ticket actions to close or delete a ticket channel.",
        inline: true,
      },
      {
        name: "✏️ Rename Review",
        value: "Allows Pixy to review and apply ticket rename actions.",
        inline: true,
      },
      {
        name: "🚨 Escalation",
        value: "Allows Pixy to route a ticket to the configured human support team.",
        inline: true,
      },
      {
        name: "🛠️ Agent Actions",
        value: "Master switch for validated AI-requested ticket actions.",
        inline: true,
      },
      {
        name: "Execution safety",
        value: "A disabled action is rejected before Pixy changes the channel or ticket state; the toggle is not UI-only.",
      }
    );

  return {
    content: null,
    embeds: [embed],
    components: [topicMenu(userId), navigation(userId)],
  };
}

function commands(userId) {
  const embed = new EmbedBuilder()
    .setTitle("⌨️ Pixy Commands")
    .setColor(0x5865f2)
    .setDescription("The main commands used to configure and manage Pixy.")
    .addFields(
      {
        name: "/pixy-help",
        value: "Open this help center.",
        inline: true,
      },
      {
        name: "/pixy-setup",
        value: "Choose the Discord category containing ticket channels.",
        inline: true,
      },
      {
        name: "/pixy-settings",
        value: "Manage the Groq key, model, features, escalation status, and custom blocked words.",
        inline: true,
      },
      {
        name: "/pixy-learn",
        value: "Add, list, delete, or clear server-specific knowledge used by Pixy.",
        inline: true,
      },
      {
        name: "/pixy-admins",
        value: "Configure escalation roles, routing descriptions, categories, and notifications.",
        inline: true,
      },
      {
        name: "/pixy-clear",
        value: "Delete this server's saved Pixy data. It does not delete Discord channels or roles.",
        inline: true,
      }
    );

  return {
    content: null,
    embeds: [embed],
    components: [topicMenu(userId), navigation(userId)],
  };
}

function troubleshooting(userId) {
  const embed = new EmbedBuilder()
    .setTitle("🛠️ Troubleshooting")
    .setColor(0xed4245)
    .setDescription("Check the section matching the problem you are seeing.")
    .addFields(
      {
        name: "Pixy is not replying",
        value: [
          "• Confirm `/pixy-setup` points to the correct ticket category.",
          "• Confirm **AI Reply** is enabled in `/pixy-settings`.",
          "• Confirm a valid Groq API key is configured.",
          "• Confirm the bot can view the channel, send messages, and read message history.",
        ].join("\n"),
      },
      {
        name: "A ticket action was rejected",
        value: "Check **Agent Actions** and the action-specific toggle such as **Close Ticket**, **Rename Review**, or **Escalation**.",
      },
      {
        name: "Groq rejected the key",
        value: "Create a new key from the official Groq console, make sure it was copied completely, then replace it from the **AI API** settings page.",
      },
      {
        name: "The model is unavailable",
        value: "Reset to Pixy's default model or enter another chat model available to that Groq account.",
      },
      {
        name: "Rename, close, or escalation still fails",
        value: "Confirm Pixy has the Discord permissions needed to manage the ticket channel and access the configured escalation destination.",
      }
    );

  return {
    content: null,
    embeds: [embed],
    components: [topicMenu(userId), navigation(userId)],
  };
}

function render(page, userId) {
  if (page === PAGES.QUICKSTART) return quickStart(userId);
  if (page === PAGES.GROQ) return groq(userId);
  if (page === PAGES.FEATURES) return features(userId);
  if (page === PAGES.COMMANDS) return commands(userId);
  if (page === PAGES.TROUBLESHOOTING) return troubleshooting(userId);
  return home(userId);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Learn how to set up and use Pixy."),
  guildOnly: true,
  cooldown: 2,

  async execute(interaction) {
    await interaction.reply({
      ...render(PAGES.HOME, interaction.user.id),
      flags: EPHEMERAL,
    });
  },

  selectMenuHandlers: [
    {
      customIdPrefix: PREFIX.NAV,
      type: "string",
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.NAV.length);
        if (!(await assertOwner(interaction, userId))) return;
        await interaction.update(render(interaction.values[0], userId));
      },
    },
  ],

  buttonHandlers: [
    {
      customIdPrefix: PREFIX.HOME,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.HOME.length);
        if (!(await assertOwner(interaction, userId))) return;
        await interaction.update(render(PAGES.HOME, userId));
      },
    },
    {
      customIdPrefix: PREFIX.CLOSE,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.CLOSE.length);
        if (!(await assertOwner(interaction, userId))) return;
        await interaction.update({
          content: "Help panel closed.",
          embeds: [],
          components: [],
        });
      },
    },
  ],
};
