-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "TicketChannel_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig" ("guildId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TicketChannel" ("aiEnabled", "channelId", "closed", "createdAt", "guildId", "id", "lastAiReplyAt", "lastUserMessageAt", "updatedAt", "userId") SELECT "aiEnabled", "channelId", "closed", "createdAt", "guildId", "id", "lastAiReplyAt", "lastUserMessageAt", "updatedAt", "userId" FROM "TicketChannel";
DROP TABLE "TicketChannel";
ALTER TABLE "new_TicketChannel" RENAME TO "TicketChannel";
CREATE UNIQUE INDEX "TicketChannel_channelId_key" ON "TicketChannel"("channelId");
CREATE INDEX "TicketChannel_guildId_idx" ON "TicketChannel"("guildId");
CREATE INDEX "TicketChannel_guildId_status_idx" ON "TicketChannel"("guildId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
