const assert = require("node:assert/strict");
const test = require("node:test");

const {
  selectApplicationTableNames,
} = require("../scripts/clear-database");

test("database clear discovery includes billing tables and excludes Prisma history", () => {
  const tables = selectApplicationTableNames([
    { tableName: "_prisma_migrations" },
    { tableName: "GuildConfig" },
    { tableName: "GuildBilling" },
    { tableName: "BillingEvent" },
  ]);

  assert.deepEqual(tables, ["GuildConfig", "GuildBilling", "BillingEvent"]);
});
