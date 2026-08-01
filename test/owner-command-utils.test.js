const assert = require("node:assert/strict");
const test = require("node:test");

const { DAY_MS } = require("../src/billing/constants");
const {
  OwnerCommandInputError,
  parseDuration,
  resolveAccessibleGuild,
  validateGuildId,
} = require("../src/billing/ownerCommandUtils");
const {
  GUILD_ID,
  OTHER_GUILD_ID,
  makeDiscordClient,
  makeGuild,
} = require("./helpers/ownerBillingFakes");

async function assertRejectCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.code, code);
    return true;
  });
}

test("guild IDs are validated as Discord snowflakes", () => {
  assert.equal(validateGuildId(` ${GUILD_ID} `), GUILD_ID);
  for (const invalid of ["", "123", "guild-123", "-12345678901234567", "1.5"]) {
    assert.throws(() => validateGuildId(invalid), OwnerCommandInputError);
  }
});

test("accessible guild resolution uses cache, then fetch, and rejects unavailable guilds", async () => {
  const cachedGuild = makeGuild();
  assert.equal(
    await resolveAccessibleGuild(makeDiscordClient(cachedGuild), GUILD_ID),
    cachedGuild
  );

  const fetchedGuild = makeGuild(OTHER_GUILD_ID, "Fetched Guild");
  const fetchClient = makeDiscordClient(null);
  fetchClient.guilds.fetch = async (id) => (id === OTHER_GUILD_ID ? fetchedGuild : null);
  assert.equal(await resolveAccessibleGuild(fetchClient, OTHER_GUILD_ID), fetchedGuild);

  await assertRejectCode(
    resolveAccessibleGuild(makeDiscordClient(null, { fetchError: true }), GUILD_ID),
    "guild_unavailable"
  );
});

test("duration parser supports d, w, m, and y with documented conversions", () => {
  assert.deepEqual(parseDuration("14d"), {
    amount: 14,
    unit: "d",
    days: 14,
    milliseconds: 14 * DAY_MS,
    normalized: "14d",
    unitLabel: "days",
  });
  assert.equal(parseDuration("8W").days, 56);
  assert.equal(parseDuration("6m").days, 180);
  assert.equal(parseDuration("1y").days, 365);
  assert.equal(parseDuration("10y").days, 3650);
});

test("duration parser rejects malformed, zero, negative, decimal, unsupported, and excessive values", () => {
  for (const invalid of [
    "",
    "0d",
    "-1d",
    "1.5d",
    "1h",
    "d",
    "1 d",
    "3651d",
    "11y",
    "999999999999999999999d",
  ]) {
    assert.throws(() => parseDuration(invalid), OwnerCommandInputError);
  }
});
