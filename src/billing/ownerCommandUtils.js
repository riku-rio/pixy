const { isDiscordSnowflake } = require("../config/env");
const {
  CUSTOM_DURATION_UNITS,
  DAY_MS,
  MAX_CUSTOM_DURATION_DAYS,
} = require("./constants");

const OWNER_RESPONSE_TONES = Object.freeze({
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
});
const OWNER_MESSAGE_LIMIT = 1_950;

class OwnerCommandInputError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "OwnerCommandInputError";
    this.code = code;
  }
}

function cleanOwnerText(value, maxLength = 300) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function validateGuildId(value) {
  const guildId = String(value || "").trim();
  if (!isDiscordSnowflake(guildId)) {
    throw new OwnerCommandInputError(
      "invalid_guild_id",
      "Guild ID must be a valid Discord snowflake."
    );
  }
  return guildId;
}

async function resolveAccessibleGuild(discordClient, value) {
  const guildId = validateGuildId(value);
  const cached = discordClient?.guilds?.cache?.get?.(guildId);
  if (cached) return cached;

  if (typeof discordClient?.guilds?.fetch === "function") {
    const fetched = await discordClient.guilds.fetch(guildId).catch(() => null);
    if (fetched) return fetched;
  }

  throw new OwnerCommandInputError(
    "guild_unavailable",
    "Pixy cannot access that guild. Confirm the ID and make sure the bot is still in the server."
  );
}

async function resolveGuildName(discordClient, guildId) {
  const cached = discordClient?.guilds?.cache?.get?.(guildId);
  if (cached?.name) return cleanOwnerText(cached.name, 100);

  if (typeof discordClient?.guilds?.fetch === "function") {
    const fetched = await discordClient.guilds.fetch(guildId).catch(() => null);
    if (fetched?.name) return cleanOwnerText(fetched.name, 100);
  }

  return null;
}

function parseDuration(value) {
  const raw = String(value || "").trim().toLowerCase();
  const match = /^([1-9]\d*)([dwmy])$/.exec(raw);
  if (!match) {
    throw new OwnerCommandInputError(
      "invalid_duration",
      "Duration must be a positive whole number followed by d, w, m, or y (for example: 14d, 8w, 6m, or 1y)."
    );
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const definition = CUSTOM_DURATION_UNITS[unit];
  if (!Number.isSafeInteger(amount) || amount <= 0 || !definition) {
    throw new OwnerCommandInputError(
      "invalid_duration",
      "Duration must use a supported positive whole-number value."
    );
  }

  const days = amount * definition.days;
  if (!Number.isSafeInteger(days) || days > MAX_CUSTOM_DURATION_DAYS) {
    throw new OwnerCommandInputError(
      "duration_too_large",
      `Duration cannot exceed ${MAX_CUSTOM_DURATION_DAYS} days (10 years).`
    );
  }

  return {
    amount,
    unit,
    days,
    milliseconds: days * DAY_MS,
    normalized: `${amount}${unit}`,
    unitLabel: amount === 1 ? definition.label : `${definition.label}s`,
  };
}

function buildOwnerResponse({ title, tone = "info", lines = [] }) {
  const icon = OWNER_RESPONSE_TONES[tone] || OWNER_RESPONSE_TONES.info;
  const body = [
    `${icon} **${cleanOwnerText(title, 120) || "Pixy owner operation"}**`,
    ...lines
      .map((line) => String(line ?? "").trim())
      .filter(Boolean),
  ].join("\n");

  return {
    content: body.slice(0, 2000),
    allowedMentions: { parse: [] },
  };
}

function buildOwnerResponsePages({ title, tone = "info", lines = [] }) {
  const normalizedLines = lines
    .map((line) => String(line ?? "").trim().slice(0, 700))
    .filter(Boolean);
  const groups = [];
  let current = [];

  for (const line of normalizedLines) {
    const candidate = buildOwnerResponse({ title, tone, lines: [...current, line] });
    if (candidate.content.length > OWNER_MESSAGE_LIMIT && current.length > 0) {
      groups.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }

  if (current.length > 0 || groups.length === 0) groups.push(current);

  return groups.map((group, index) =>
    buildOwnerResponse({
      title: groups.length > 1 ? `${title} (${index + 1}/${groups.length})` : title,
      tone,
      lines: group,
    })
  );
}

function buildOwnerSuccess(title, lines) {
  return buildOwnerResponse({ title, tone: "success", lines });
}

function buildOwnerError(title, lines) {
  return buildOwnerResponse({ title, tone: "error", lines });
}

function buildOwnerInfo(title, lines) {
  return buildOwnerResponse({ title, tone: "info", lines });
}

async function replyOwner(message, payload) {
  return message.reply(payload);
}

async function replyOwnerPages(message, payloads) {
  const sent = [];
  for (const payload of payloads) {
    sent.push(await message.reply(payload));
  }
  return sent;
}

function formatOwnerDate(value) {
  if (!value) return "Not recorded";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  const unix = Math.floor(date.getTime() / 1000);
  return `<t:${unix}:F> (<t:${unix}:R>)`;
}

function getOwnerCommandPrefix(message) {
  return cleanOwnerText(message?.client?.appEnv?.prefix, 8) || "^";
}

module.exports = {
  OWNER_MESSAGE_LIMIT,
  OWNER_RESPONSE_TONES,
  OwnerCommandInputError,
  buildOwnerError,
  buildOwnerInfo,
  buildOwnerResponse,
  buildOwnerResponsePages,
  buildOwnerSuccess,
  cleanOwnerText,
  formatOwnerDate,
  getOwnerCommandPrefix,
  parseDuration,
  replyOwner,
  replyOwnerPages,
  resolveAccessibleGuild,
  resolveGuildName,
  validateGuildId,
};
