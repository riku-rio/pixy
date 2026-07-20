require("dotenv").config({ quiet: true });

const { spawnSync } = require("node:child_process");

const DEFAULT_LOCAL_TEST_DATABASE_URL =
  "mysql://pixy:pixy_test_password@127.0.0.1:3307/pixy_test";

process.env.NODE_ENV = "test";
process.env.TEST_DATABASE_URL =
  String(process.env.TEST_DATABASE_URL || "").trim() ||
  DEFAULT_LOCAL_TEST_DATABASE_URL;
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

const prismaCli = require.resolve("prisma/build/index.js");
run(process.execPath, [
  prismaCli,
  "db",
  "push",
  "--force-reset",
  "--schema",
  "prisma/schema.prisma",
]);

run(process.execPath, ["--test", "--test-concurrency=1"]);
