const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");

const sourcePath = path.join(__dirname, "seed-blocked-terms.js");
let source = fs.readFileSync(sourcePath, "utf8");
const sqliteBootstrap = `const { PrismaClient } = require("@prisma/client");\nconst { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");\n\nconst adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });\nconst prisma = new PrismaClient({ adapter });`;
const mysqlBootstrap = `const { prisma } = require("../src/config/prisma");`;

if (!source.includes(sqliteBootstrap)) {
  throw new Error("The blocked-term seed bootstrap changed; update prisma/seed-mysql.js before deploying.");
}

source = source.replace(sqliteBootstrap, mysqlBootstrap);
const seedModule = new Module(sourcePath, module);
seedModule.filename = sourcePath;
seedModule.paths = Module._nodeModulePaths(__dirname);
seedModule._compile(source, sourcePath);
