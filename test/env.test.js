const assert = require("node:assert/strict");
const test = require("node:test");

const {
  isDiscordSnowflake,
  loadEnv,
  parseOwners,
} = require("../src/config/env");

const BASE_ENV = {
  DISCORD_TOKEN: "test-token",
  DISCORD_CLIENT_ID: "1363512743667302653",
  NODE_ENV: "test",
};

const VALID_OWNER_A = "1363512743667302653";
const VALID_OWNER_B = "575366733616119838";

function makeEnv(overrides = {}) {
  return {
    ...BASE_ENV,
    OWNERS: `${VALID_OWNER_A},${VALID_OWNER_B}`,
    PAYPAL_OWNER_ID: VALID_OWNER_A,
    VODAFONE_OWNER_ID: VALID_OWNER_B,
    ...overrides,
  };
}

test("parseOwners trims, removes empty entries, and deduplicates IDs", () => {
  const owners = parseOwners(
    ` ${VALID_OWNER_A},${VALID_OWNER_B}, ${VALID_OWNER_A},, `
  );

  assert.ok(owners instanceof Set);
  assert.deepEqual([...owners], [VALID_OWNER_A, VALID_OWNER_B]);
});

test("Discord snowflake validation accepts only 17-20 digit positive IDs", () => {
  assert.equal(isDiscordSnowflake(VALID_OWNER_A), true);
  assert.equal(isDiscordSnowflake(VALID_OWNER_B), true);
  assert.equal(isDiscordSnowflake("1234567890123456"), false);
  assert.equal(isDiscordSnowflake("01234567890123456"), false);
  assert.equal(isDiscordSnowflake("1234567890123456a"), false);
  assert.equal(isDiscordSnowflake("123456789012345678901"), false);
});

test("loadEnv exposes parsed owner configuration", () => {
  const env = loadEnv(
    makeEnv({ OWNERS: ` ${VALID_OWNER_A}, ${VALID_OWNER_B},${VALID_OWNER_A} ` })
  );

  assert.deepEqual([...env.owners], [VALID_OWNER_A, VALID_OWNER_B]);
  assert.equal(env.paypalOwnerId, VALID_OWNER_A);
  assert.equal(env.vodafoneOwnerId, VALID_OWNER_B);
});

test("production rejects an empty owner set", () => {
  assert.throws(
    () => loadEnv(makeEnv({ NODE_ENV: "production", OWNERS: " , " })),
    /OWNERS must contain at least one Discord user ID/
  );
});

test("production rejects invalid owner IDs", () => {
  assert.throws(
    () => loadEnv(makeEnv({ NODE_ENV: "production", OWNERS: `${VALID_OWNER_A},invalid` })),
    /OWNERS contains invalid Discord user IDs/
  );
});

test("production rejects missing or invalid payment owner IDs", () => {
  assert.throws(
    () =>
      loadEnv(
        makeEnv({
          NODE_ENV: "production",
          PAYPAL_OWNER_ID: "",
          VODAFONE_OWNER_ID: "not-a-snowflake",
        })
      ),
    /PAYPAL_OWNER_ID must be a valid Discord user ID; VODAFONE_OWNER_ID must be a valid Discord user ID/
  );
});

test("non-production keeps owner configuration optional", () => {
  const env = loadEnv({
    ...BASE_ENV,
    OWNERS: "",
    PAYPAL_OWNER_ID: "",
    VODAFONE_OWNER_ID: "",
  });

  assert.deepEqual([...env.owners], []);
  assert.equal(env.paypalOwnerId, null);
  assert.equal(env.vodafoneOwnerId, null);
});
