-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GuildConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "ticketCategoryId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "maxLearnedItems" INTEGER NOT NULL DEFAULT 20,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiProvider" TEXT NOT NULL DEFAULT 'groq',
    "aiModel" TEXT,
    "aiSystemPrompt" TEXT
);
INSERT INTO "new_GuildConfig" ("createdAt", "enabled", "guildId", "id", "maxLearnedItems", "ticketCategoryId", "updatedAt") SELECT "createdAt", "enabled", "guildId", "id", "maxLearnedItems", "ticketCategoryId", "updatedAt" FROM "GuildConfig";
DROP TABLE "GuildConfig";
ALTER TABLE "new_GuildConfig" RENAME TO "GuildConfig";
CREATE UNIQUE INDEX "GuildConfig_guildId_key" ON "GuildConfig"("guildId");
CREATE TABLE "new_TicketChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastAiReplyAt" DATETIME,
    "lastUserMessageAt" DATETIME,
    CONSTRAINT "TicketChannel_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig" ("guildId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TicketChannel" ("channelId", "closed", "createdAt", "guildId", "id", "updatedAt", "userId") SELECT "channelId", "closed", "createdAt", "guildId", "id", "updatedAt", "userId" FROM "TicketChannel";
DROP TABLE "TicketChannel";
ALTER TABLE "new_TicketChannel" RENAME TO "TicketChannel";
CREATE UNIQUE INDEX "TicketChannel_channelId_key" ON "TicketChannel"("channelId");
CREATE INDEX "TicketChannel_guildId_idx" ON "TicketChannel"("guildId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
