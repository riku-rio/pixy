const dotenv = require("dotenv");

const DISCORD_SNOWFLAKE_PATTERN = /^[1-9]\d{16,19}$/;

function isDiscordSnowflake(value) {
  return DISCORD_SNOWFLAKE_PATTERN.test(String(value || "").trim());
}

function parseOwners(value) {
  return new Set(
    String(value || "")
      .split(",")
      .map((ownerId) => ownerId.trim())
      .filter(Boolean)
  );
}

function getOwnerConfiguration(env) {
  const owners = parseOwners(env.OWNERS);
  const paypalOwnerId = String(env.PAYPAL_OWNER_ID || "").trim() || null;
  const vodafoneOwnerId = String(env.VODAFONE_OWNER_ID || "").trim() || null;
  const errors = [];

  if (owners.size === 0) {
    errors.push("OWNERS must contain at least one Discord user ID");
  }

  const invalidOwners = [...owners].filter((ownerId) => !isDiscordSnowflake(ownerId));
  if (invalidOwners.length > 0) {
    errors.push("OWNERS contains invalid Discord user IDs");
  }

  if (!isDiscordSnowflake(paypalOwnerId)) {
    errors.push("PAYPAL_OWNER_ID must be a valid Discord user ID");
  }

  if (!isDiscordSnowflake(vodafoneOwnerId)) {
    errors.push("VODAFONE_OWNER_ID must be a valid Discord user ID");
  }

  return {
    owners,
    paypalOwnerId,
    vodafoneOwnerId,
    errors,
  };
}

function loadEnv(env = process.env) {
  dotenv.config({ quiet: true });

  const token = env.DISCORD_TOKEN;
  const clientId = env.DISCORD_CLIENT_ID;
  const guildId = env.DISCORD_GUILD_ID;
  const prefix = env.PREFIX || "!";
  const nodeEnv = String(env.NODE_ENV || "development").toLowerCase();
  const isProduction = nodeEnv === "production";
  const ownerConfiguration = getOwnerConfiguration(env);

  const missing = [];
  if (!token) {
    missing.push("DISCORD_TOKEN");
  }
  if (!clientId) {
    missing.push("DISCORD_CLIENT_ID");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (isProduction && ownerConfiguration.errors.length > 0) {
    throw new Error(
      `Invalid owner environment configuration: ${ownerConfiguration.errors.join("; ")}`
    );
  }

  return {
    token,
    clientId,
    guildId,
    prefix,
    nodeEnv,
    isProduction,
    owners: ownerConfiguration.owners,
    paypalOwnerId: ownerConfiguration.paypalOwnerId,
    vodafoneOwnerId: ownerConfiguration.vodafoneOwnerId,
  };
}

module.exports = {
  DISCORD_SNOWFLAKE_PATTERN,
  getOwnerConfiguration,
  isDiscordSnowflake,
  loadEnv,
  parseOwners,
};
