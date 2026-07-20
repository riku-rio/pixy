PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS "GuildDailyAiUsage";

CREATE TABLE "new_GuildSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "aiReplyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "closeTicketEnabled" BOOLEAN NOT NULL DEFAULT true,
    "renameReviewEnabled" BOOLEAN NOT NULL DEFAULT true,
    "escalationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "agent