const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

function createAdapter(databaseUrl = process.env.DATABASE_URL) {
  const url = String(databaseUrl || "").trim();
  if (!url) {
    throw new Error("DATABASE_URL is required.");
  }

  return new PrismaMariaDb(url, {
    onConnectionError(error) {
      console.error("MySQL connection error:", error?.message || error);
    },
  });
}

const prisma = new PrismaClient({
  adapter: createAdapter(),
});

module.exports = {
  createAdapter,
  prisma,
};
