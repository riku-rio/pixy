const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { createStringSelectMenus } = require("../utils/selectMenuHelper");

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
  BILLING: "billing",
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
    label: "Plans & Billing",
    description: "Understand Trial, Pro, Partner, and Expired mode",
    value: PAGES.BILLING,
    emoji: "💳",
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
    description: "Fix setup, subscription, key, model, and permission issues",
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
  return createStringSelectMenus({
    customId: scoped(PREFIX.NAV, userId),
    placeholder: "Choose a help topic...",
    options: TOPICS,
  });
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

function panel(embed, userId, extraRows = []) {
  return {
    content: null,
    embeds: [embed],
    components: [...topicMenu(userId), ...extraRows, navigation(userId)],
    allowedMentions: { parse: [] },
  };
}

function home(userId) {
  const embed = new EmbedBuilder()
    .setTitle("🤖 Pixy Help")
    .setColor(0x5865f2)
    .setDescription([
      "Choose a topic below to learn how to set up and use Pixy.",
      "",
      "For a new server, start with **Quick Start**, connect a guild-owned Groq API key, and review **Plans & Billing**.",
    ].join("\n"))
    .addFields({
      name: "Recommended setup order",
      value: "`/pixy-setup` → `/pixy-settings` → **AI API** → `/pixy-billing` → **Features**",
    });
  return panel(embed, userId);
}

function quickStart(userId) {
  const embed = new EmbedBuilder()
    .setTitle("🚀 Quick Start")
    .setColor(0x57f287)
    .setDescription("Follow these steps in order to get Pixy replying inside your ticket channels.")
    .addFields(
      {
        name: "1. Choose the ticket category",
        value: "Run `/pixy-setup` as a server administrator and select the category that contains your ticket channels. The first successful setup starts the one-time seven-day Trial.",
      },
      {
        name: "2. Connect Groq",
        value: "Open `/pixy-settings` → **AI API** → **Set API Key**, then paste your server's Groq API key. Groq usage and limits belong to the guild.",
      },
      {
        name: "3. Review billing",
        value: "Run `/pixy-billing` to see the effective plan, remaining time, feature availability, and manual activation options.",
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
  return panel(embed, userId);
}

function groq(userId) {
  const embed = new EmbedBuilder()
    .setTitle("🔑 Groq API Key")
    .setColor(0xfee75c)
    .setDescription("Each server connects and pays for its own Groq API usage. Pixy does not provide a shared key or quota.")
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
        name: "Storage and safety",
        value: "Pixy validates and encrypts the key before storage and never displays the saved secret again. Never send it to a payment owner or support contact.",
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
  return panel(embed, userId, [links]);
}

function billing(userId) {
  const embed = new EmbedBuilder()
    .setTitle("💳 Plans & Billing")
    .setColor(0x5865f2)
    .setDescription("Billing is manual. Pixy never collects payment credentials or activates a server automatically.")
    .addFields(
      {
        name: "Trial",
        value: "The first successful `/pixy-setup` starts one seven-day Pro Trial. Clearing configuration or reinviting Pixy does not restart it.",
      },
      {
        name: "Pro",
        value: "Provides learned AI context, learned-knowledge additions, and validated ticket agent actions for the active period.",
      },
      {
        name: "Partner",
        value: "Provides premium entitlement without an expiry. Any Trial or Pro dates remain stored underneath as the fallback state.",
      },
      {
        name: "Expired",
        value: "Generic ticket AI replies and AI On/Off remain available. Learned AI context, new learned entries, and agent ticket actions are locked.",
      },
      {
        name: "View or activate",
        value: "Run `/pixy-billing`. PayPal and Vodafone Cash choices show a configured owner mention and manual DM instructions; do not send passwords, tokens, or API keys.",
      }
    );
  return panel(embed, userId);
}

function features(userId) {
  const embed = new EmbedBuilder()
    .setTitle("🧩 Pixy Features")
    .setColor(0x5865f2)
    .setDescription("Server administrators can change stored preferences from `/pixy-settings`. Subscription gates are enforced separately at execution time.")
    .addFields(
      {
        name: "🤖 Generic AI Reply",
        value: "Available in every plan, including Expired, when the guild has configured its Groq key and enabled AI replies.",
        inline: true,
      },
      {
        name: "🧠 Learned context",
        value: "Trial, Pro, and Partner can use learned Q&A/free-form entries in AI context and add new entries.",
        inline: true,
      },
      {
        name: "🛠️ Agent actions",
        value: "Trial, Pro, and Partner can use validated close, rename, and escalation actions when their feature toggles permit them.",
        inline: true,
      },
      {
        name: "Expired controls",
        value: "Expired ticket controls show only AI On/Off. Existing learned entries can still be listed, deleted, or cleared.",
      },
      {
        name: "Execution safety",
        value: "Plan and feature availability are rechecked at execution time, so stale menus or modals cannot bypass expiration.",
      }
    );
  return panel(embed, userId);
}

function commands(userId) {
  const embed = new EmbedBuilder()
    .setTitle("⌨️ Pixy Commands")
    .setColor(0x5865f2)
    .setDescription("The main commands used to configure and manage Pixy.")
    .addFields(
      { name: "/pixy-help", value: "Open this help center.", inline: true },
      { name: "/pixy-setup", value: "Choose the ticket category and initialize the one-time Trial when no billing record exists.", inline: true },
      { name: "/pixy-billing", value: "View plan status, dates, availability, and manual payment-owner instructions.", inline: true },
      { name: "/pixy-settings", value: "Manage the Groq key, model, feature preferences, escalation status, and custom blocked words.", inline: true },
      { name: "/pixy-learn", value: "Manage server-specific knowledge; additions require Trial, Pro, or Partner.", inline: true },
      { name: "/pixy-admins", value: "Configure escalation roles, routing descriptions, categories, and notifications.", inline: true },
      { name: "/pixy-clear", value: "Delete operational server data while retaining minimal billing continuity and audit records.", inline: true }
    );
  return panel(embed, userId);
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
          "• Confirm a valid guild-owned Groq API key is configured.",
          "• Confirm the bot can view the channel, send messages, and read message history.",
        ].join("\n"),
      },
      {
        name: "A learned addition or ticket action is locked",
        value: "Run `/pixy-billing`. Expired mode intentionally blocks learned additions/context and agent actions while keeping generic AI replies available.",
      },
      {
        name: "A premium action was rejected despite a visible old menu",
        value: "Pixy rechecks entitlement at execution time. Refresh the panel or ticket controls after activation; stale components cannot bypass expiration.",
      },
      {
        name: "Groq rejected the key or model",
        value: "Create a new key from the official Groq console or reset to a model available to that guild's Groq account.",
      },
      {
        name: "Rename, close, or escalation still fails",
        value: "Confirm the guild has Trial, Pro, or Partner, the corresponding feature toggle is enabled, and Pixy has the Discord permissions required for the action.",
      }
    );
  return panel(embed, userId);
}

function render(page, userId) {
  if (page === PAGES.QUICKSTART) return quickStart(userId);
  if (page === PAGES.GROQ) return groq(userId);
  if (page === PAGES.BILLING) return billing(userId);
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
        const userId = interaction.customId.slice(PREFIX.NAV.length).split(":")[0];
        if (!(await assertOwner(interaction, userId))) return;
        await interaction.deferUpdate();
        const selected = interaction.values[0];
        const page = selected === "reset" ? PAGES.HOME : selected;
        await interaction.editReply(render(page, userId));
      },
    },
  ],

  buttonHandlers: [
    {
      customIdPrefix: PREFIX.HOME,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.HOME.length);
        if (!(await assertOwner(interaction, userId))) return;
        await interaction.deferUpdate();
        await interaction.editReply(render(PAGES.HOME, userId));
      },
    },
    {
      customIdPrefix: PREFIX.CLOSE,
      async execute(interaction) {
        const userId = interaction.customId.slice(PREFIX.CLOSE.length);
        if (!(await assertOwner(interaction, userId))) return;
        await interaction.deferUpdate();
        await interaction.editReply({
          content: "Help panel closed.",
          embeds: [],
          components: [],
          allowedMentions: { parse: [] },
        });
      },
    },
  ],
};
