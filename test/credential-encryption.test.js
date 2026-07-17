const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { after, before, test } = require("node:test");

const originalKey = process.env.PIXY_CREDENTIAL_ENCRYPTION_KEY;

before(() => {
  process.env.PIXY_CREDENTIAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
});

after(() => {
  if (originalKey === undefined) {
    delete process.env.PIXY_CREDENTIAL_ENCRYPTION_KEY;
  } else {
    process.env.PIXY_CREDENTIAL_ENCRYPTION_KEY = originalKey;
  }
});

test("encrypts and decrypts a guild-bound credential", () => {
  const {
    decryptCredential,
    encryptCredential,
  } = require("../src/security/credentialEncryption");

  const context = { guildId: "guild-alpha", credentialType: "groq-api-key" };
  const encrypted = encryptCredential("gsk_example_secret", context);

  assert.notEqual(encrypted, "gsk_example_secret");
  assert.equal(encrypted.includes("gsk_example_secret"), false);
  assert.equal(decryptCredential(encrypted, context), "gsk_example_secret");
});

test("uses a random IV for every encryption", () => {
  const { encryptCredential } = require("../src/security/credentialEncryption");
  const context = { guildId: "guild-alpha", credentialType: "groq-api-key" };

  assert.notEqual(
    encryptCredential("gsk_same", context),
    encryptCredential("gsk_same", context)
  );
});

test("rejects ciphertext copied to another guild", () => {
  const {
    decryptCredential,
    encryptCredential,
  } = require("../src/security/credentialEncryption");

  const encrypted = encryptCredential("gsk_secret", {
    guildId: "guild-alpha",
    credentialType: "groq-api-key",
  });

  assert.throws(
    () => decryptCredential(encrypted, {
      guildId: "guild-beta",
      credentialType: "groq-api-key",
    }),
    (error) => error.code === "decrypt_failed"
  );
});

test("rejects a changed encryption key and tampered ciphertext", () => {
  const {
    decryptCredential,
    encryptCredential,
  } = require("../src/security/credentialEncryption");
  const context = { guildId: "guild-alpha", credentialType: "groq-api-key" };
  const encrypted = encryptCredential("gsk_secret", context);

  process.env.PIXY_CREDENTIAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
  assert.throws(() => decryptCredential(encrypted, context));

  process.env.PIXY_CREDENTIAL_ENCRYPTION_KEY = originalKey || crypto.randomBytes(32).toString("base64");
});

test("rejects malformed envelopes and invalid key lengths", () => {
  const {
    decryptCredential,
    validateCredentialEncryptionKey,
  } = require("../src/security/credentialEncryption");

  assert.throws(() => decryptCredential("plaintext", {
    guildId: "guild-alpha",
    credentialType: "groq-api-key",
  }));

  process.env.PIXY_CREDENTIAL_ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");
  assert.throws(() => validateCredentialEncryptionKey());
});
