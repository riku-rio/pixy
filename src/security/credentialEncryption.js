const crypto = require("node:crypto");

const ENVIRONMENT_VARIABLE = "PIXY_CREDENTIAL_ENCRYPTION_KEY";
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const ENVELOPE_VERSION = "v1";

class CredentialEncryptionError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "CredentialEncryptionError";
    this.code = code;
  }
}

function decodeEncryptionKey(value = process.env[ENVIRONMENT_VARIABLE]) {
  const encoded = String(value || "").trim();

  if (!encoded) {
    throw new CredentialEncryptionError(
      `${ENVIRONMENT_VARIABLE} is required and must be a base64-encoded 32-byte key.`,
      "missing_key"
    );
  }

  let key;
  try {
    key = Buffer.from(encoded, "base64");
  } catch {
    throw new CredentialEncryptionError(
      `${ENVIRONMENT_VARIABLE} must be valid base64.`,
      "invalid_key_encoding"
    );
  }

  if (key.length !== KEY_LENGTH || key.toString("base64").replace(/=+$/u, "") !== encoded.replace(/=+$/u, "")) {
    throw new CredentialEncryptionError(
      `${ENVIRONMENT_VARIABLE} must decode to exactly ${KEY_LENGTH} bytes.`,
      "invalid_key_length"
    );
  }

  return key;
}

function buildContext({ guildId, credentialType = "groq-api-key" } = {}) {
  const normalizedGuildId = String(guildId || "").trim();
  const normalizedType = String(credentialType || "").trim();

  if (!normalizedGuildId || !normalizedType) {
    throw new CredentialEncryptionError(
      "Credential encryption requires a guild ID and credential type.",
      "invalid_context"
    );
  }

  return Buffer.from(`pixy:${normalizedType}:${normalizedGuildId}`, "utf8");
}

function isEncryptedCredential(value) {
  return String(value || "").startsWith(`${ENVELOPE_VERSION}:`);
}

function encryptCredential(plaintext, context) {
  const value = String(plaintext || "").trim();
  if (!value) {
    throw new CredentialEncryptionError("Credential cannot be empty.", "empty_credential");
  }

  const key = decodeEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const aad = buildContext(context);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(aad);

  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    ENVELOPE_VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

function decryptCredential(envelope, context) {
  const serialized = String(envelope || "").trim();
  const parts = serialized.split(":");

  if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) {
    throw new CredentialEncryptionError(
      "Stored credential has an unsupported or malformed format.",
      "invalid_envelope"
    );
  }

  try {
    const key = decodeEncryptionKey();
    const iv = Buffer.from(parts[1], "base64");
    const tag = Buffer.from(parts[2], "base64");
    const ciphertext = Buffer.from(parts[3], "base64");

    if (iv.length !== IV_LENGTH || tag.length !== 16 || ciphertext.length === 0) {
      throw new Error("Invalid encrypted credential fields.");
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(buildContext(context));
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    if (error instanceof CredentialEncryptionError) throw error;
    throw new CredentialEncryptionError(
      "Stored credential could not be decrypted or failed authentication.",
      "decrypt_failed"
    );
  }
}

function validateCredentialEncryptionKey() {
  decodeEncryptionKey();
  return true;
}

module.exports = {
  CredentialEncryptionError,
  decryptCredential,
  encryptCredential,
  isEncryptedCredential,
  validateCredentialEncryptionKey,
};
