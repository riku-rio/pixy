const assert = require("node:assert/strict");
const test = require("node:test");

const messageCreate = require("../src/events/messageCreate");

const OWNER_ID = "1363512743667302653";
const OTHER_USER_ID = "575366733616119838";

function makeMessage({ authorId, command, content = "^secret" }) {
  const replies = [];
  const client = {
    appEnv: {
      prefix: "^",
      owners: new Set([OWNER_ID]),
    },
    user: { id: "999999999999999999" },
    prefixCommands: new Map([[command.name, command]]),
    aliases: new Map(),
    cooldowns: new Map(),
  };

  return {
    message: {
      author: { id: authorId, bot: false },
      webhookId: null,
      content,
      client,
      guild: null,
      member: null,
      async reply(value) {
        replies.push(value);
      },
    },
    replies,
  };
}

test("unauthorized owner-only commands return before every normal check", async () => {
  let executed = false;
  const command = {
    name: "secret",
    ownerOnly: true,
    disabled: true,
    argsRequired: true,
    minArgs: 2,
    guildOnly: true,
    userPermissions: ["Administrator"],
    cooldown: 60,
    async execute() {
      executed = true;
      throw new Error("must not execute");
    },
  };
  const { message, replies } = makeMessage({
    authorId: OTHER_USER_ID,
    command,
  });
  const originalConsoleError = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args);

  try {
    await messageCreate.execute(message);
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(executed, false);
  assert.deepEqual(replies, []);
  assert.deepEqual(errors, []);
  assert.equal(message.client.cooldowns.size, 0);
});

test("unauthorized aliases for owner-only commands also return silently", async () => {
  let executed = false;
  const command = {
    name: "secret",
    aliases: ["hidden"],
    ownerOnly: true,
    async execute() {
      executed = true;
    },
  };
  const { message, replies } = makeMessage({
    authorId: OTHER_USER_ID,
    command,
    content: "^hidden",
  });
  message.client.aliases.set("hidden", "secret");

  await messageCreate.execute(message);

  assert.equal(executed, false);
  assert.deepEqual(replies, []);
});

test("authorized owners continue through argument and usage checks", async () => {
  let executed = false;
  const command = {
    name: "secret",
    ownerOnly: true,
    argsRequired: true,
    usage: "secret <guild-id>",
    async execute() {
      executed = true;
    },
  };
  const { message, replies } = makeMessage({
    authorId: OWNER_ID,
    command,
  });

  await messageCreate.execute(message);

  assert.equal(executed, false);
  assert.deepEqual(replies, ["Usage: `^secret <guild-id>`"]);
});

test("authorized owners can execute owner-only commands", async () => {
  const calls = [];
  const command = {
    name: "secret",
    ownerOnly: true,
    async execute(message, args) {
      calls.push([message.author.id, args]);
    },
  };
  const { message, replies } = makeMessage({
    authorId: OWNER_ID,
    command,
    content: "^secret guild-123",
  });

  await messageCreate.execute(message);

  assert.deepEqual(calls, [[OWNER_ID, ["guild-123"]]]);
  assert.deepEqual(replies, []);
});

test("ordinary prefix commands retain their existing behavior", async () => {
  const calls = [];
  const command = {
    name: "public",
    async execute(message, args) {
      calls.push([message.author.id, args]);
    },
  };
  const { message, replies } = makeMessage({
    authorId: OTHER_USER_ID,
    command,
    content: "^public hello",
  });

  await messageCreate.execute(message);

  assert.deepEqual(calls, [[OTHER_USER_ID, ["hello"]]]);
  assert.deepEqual(replies, []);
});
