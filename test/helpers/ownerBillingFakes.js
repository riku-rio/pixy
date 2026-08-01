const OWNER_ID = "1363512743667302653";
const OTHER_USER_ID = "575366733616119838";
const GUILD_ID = "123456789012345678";
const OTHER_GUILD_ID = "223456789012345678";
const NOW = new Date("2026-08-01T12:00:00.000Z");

function cloneValue(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, cloneValue(nested)])
    );
  }
  return value;
}

function createFakeBillingClient(initialBilling = null, options = {}) {
  let billing = cloneValue(initialBilling);
  let events = cloneValue(options.events || []);
  let eventSequence = events.length;
  let transactionQueue = Promise.resolve();
  const locks = [];
  const transactionOptions = [];

  const makeGuildBillingApi = (stage) => ({
    async findUnique({ where }) {
      return stage.billing?.guildId === where.guildId
        ? cloneValue(stage.billing)
        : null;
    },
    async create({ data }) {
      if (stage.billing) throw new Error("duplicate billing row");
      stage.billing = {
        id: "billing-1",
        partnerActive: false,
        partnerSince: null,
        trialStartedAt: null,
        trialEndsAt: null,
        proStartedAt: null,
        proEndsAt: null,
        ...cloneValue(data),
      };
      return cloneValue(stage.billing);
    },
    async update({ where, data }) {
      if (!stage.billing || stage.billing.guildId !== where.guildId) {
        throw new Error("billing row missing");
      }
      stage.billing = { ...stage.billing, ...cloneValue(data) };
      return cloneValue(stage.billing);
    },
  });

  const makeBillingEventApi = (stage) => ({
    async create({ data }) {
      if (options.failAudit) throw new Error("audit insert failed");
      const event = {
        id: `event-${++eventSequence}`,
        createdAt: new Date(NOW.getTime() + eventSequence),
        ...cloneValue(data),
      };
      stage.events.push(event);
      return cloneValue(event);
    },
  });

  const client = {
    guildBilling: {
      async findUnique({ where }) {
        return billing?.guildId === where.guildId ? cloneValue(billing) : null;
      },
      async findMany() {
        return cloneValue(options.partnerRows || []);
      },
    },
    billingEvent: {
      async findFirst({ where }) {
        return cloneValue(
          events
            .filter((event) => event.guildId === where.guildId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] || null
        );
      },
    },
    async $transaction(callback, txOptions) {
      transactionOptions.push(cloneValue(txOptions || null));
      const run = async () => {
        const stage = {
          billing: cloneValue(billing),
          events: cloneValue(events),
        };
        const transaction = {
          guildBilling: makeGuildBillingApi(stage),
          billingEvent: makeBillingEventApi(stage),
          async $queryRawUnsafe(query, guildId) {
            locks.push({ query, guildId });
            if (options.lockDelay) {
              await new Promise((resolve) => setTimeout(resolve, options.lockDelay));
            }
            return [];
          },
        };
        const result = await callback(transaction);
        billing = stage.billing;
        events = stage.events;
        return result;
      };
      const pending = transactionQueue.then(run, run);
      transactionQueue = pending.catch(() => null);
      return pending;
    },
    snapshot() {
      return {
        billing: cloneValue(billing),
        events: cloneValue(events),
        locks: cloneValue(locks),
        transactionOptions: cloneValue(transactionOptions),
      };
    },
  };

  return client;
}

function makeGuild(id = GUILD_ID, name = "Pixy Test Guild") {
  return { id, name };
}

function makeDiscordClient(guild, { fetchError = false, extraGuilds = [] } = {}) {
  const guilds = [guild, ...extraGuilds].filter(Boolean);
  return {
    appEnv: { prefix: "^", owners: new Set([OWNER_ID]) },
    user: { id: "999999999999999999" },
    guilds: {
      cache: new Map(guilds.map((entry) => [entry.id, entry])),
      async fetch(id) {
        if (fetchError) throw new Error("missing");
        const found = guilds.find((entry) => entry.id === id);
        if (!found) throw new Error("missing");
        return found;
      },
    },
    prefixCommands: new Map(),
    aliases: new Map(),
    cooldowns: new Map(),
  };
}

function makeMessage({ guild = makeGuild(), authorId = OWNER_ID, extraGuilds = [] } = {}) {
  const replies = [];
  const dms = [];
  const message = {
    author: {
      id: authorId,
      bot: false,
      async send(payload) {
        dms.push(payload);
      },
    },
    webhookId: null,
    content: "",
    client: makeDiscordClient(guild, { extraGuilds }),
    guild: null,
    member: null,
    async reply(payload) {
      replies.push(payload);
      return payload;
    },
  };
  return { message, replies, dms };
}

module.exports = {
  GUILD_ID,
  NOW,
  OTHER_GUILD_ID,
  OTHER_USER_ID,
  OWNER_ID,
  cloneValue,
  createFakeBillingClient,
  makeDiscordClient,
  makeGuild,
  makeMessage,
};
