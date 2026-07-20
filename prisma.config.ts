import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const isTest = String(process.env.NODE_ENV || "").toLowerCase() === "test";
const testDatabaseUrl = String(process.env.TEST_DATABASE_URL || "").trim();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/mysql-migrations",
  },
  datasource: {
    url: isTest && testDatabaseUrl ? testDatabaseUrl : env