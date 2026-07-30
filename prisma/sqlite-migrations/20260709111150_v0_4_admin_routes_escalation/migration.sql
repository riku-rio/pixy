-- CreateTable
CREATE TABLE "AdminRoute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdminRoute_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig" ("guildId") ON DELETE CASCADE ON UPDATE CASCADE
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
    "escalationCategoryId" TEXT,
    "maxAdminRoutes" INTEGER NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiProvider" TEXT NOT NULL DEFAULT 'groq',
    "aiModel" TEXT,
    "aiSystemPrompt" TEXT
);
INSERT INTO "new_GuildConfig" ("aiEnabled", "aiModel", "aiProvider", "aiSystemPrompt", "createdAt", "enabled", "guildId", "id", "maxLearnedItems", "ticketCategoryId", "updatedAt") SELECT "aiEnabled", "aiModel", "aiProvider", "aiSystemPrompt", "createdAt", "enabled", "guildId", "id", "maxLearnedItems", "ticketCategoryId", "updatedAt" FROM "GuildConfig";
DROP TABLE "GuildConfig";
ALTER TABLE "new_GuildConfig" RENAME TO "GuildConfig";
CREATE UNIQUE INDEX "GuildConfig_guildId_key" ON "GuildConfig"("guildId");
CREATE TABLE "new_TicketChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastAiReplyAt" DATETIME,
    "lastUserMessageAt" DATETIME,
    "closedByAi" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" DATETIME,
    "renamedByAiAt" DATETIME,
    "lastAiAction" TEXT,
    "lastAiActionAt" DATETIME,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "escalatedAt" DATETIME,
    "escalatedRoleId" TEXT,
    "escalationReason" TEXT,
    CONSTRAINT "TicketChannel_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig" ("guildId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TicketChannel" ("aiEnabled", "channelId", "closed", "closedAt", "closedByAi", "createdAt", "guildId", "id", "lastAiAction", "lastAiActionAt", "lastAiReplyAt", "lastUserMessageAt", "renamedByAiAt", "status", "updatedAt", "userId") SELECT "aiEnabled", "channelId", "closed", "closedAt", "closedByAi", "createdAt", "guildId", "id", "lastAiAction", "lastAiActionAt", "lastAiReplyAt", "lastUserMessageAt", "renamedByAiAt", "status", "updatedAt", "userId" FROM "TicketChannel";
DROP TABLE "TicketChannel";
ALTER TABLE "new_TicketChannel" RENAME TO "TicketChannel";
CREATE UNIQUE INDEX "TicketChannel_channelId_key" ON "TicketChannel"("channelId");
CREATE INDEX "TicketChannel_guildId_idx" ON "TicketChannel"("guildId");
CREATE INDEX "TicketChannel_guildId_status_idx" ON "TicketChannel"("guildId", "status");
CREATE INDEX "TicketChannel_guildId_escalated_idx" ON "TicketChannel"("guildId", "escalated");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AdminRoute_guildId_idx" ON "AdminRoute"("guildId");

-- CreateIndex
CREATE INDEX "AdminRoute_guildId_enabled_idx" ON "AdminRoute"("guildId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRoute_guildId_roleId_key" ON "AdminRoute"("guildId", "roleId");
