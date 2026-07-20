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
    "agentActionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "groqApiKeyEncrypted" TEXT,
    "aiModel" TEXT,
    "customBadWords" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_GuildSetting" (
    "id",
    "guildId",
    "aiReplyEnabled",
    "closeTicketEnabled",
    "renameReviewEnabled",
    "escalationEnabled",
    "agentActionsEnabled",
    "groqApiKeyEncrypted",
    "aiModel",
    "customBadWords",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "guildId",
    "aiReplyEnabled",
    "closeTicketEnabled",
    "renameReviewEnabled",
    "escalationEnabled",
    "agentActionsEnabled",
    "groqApiKeyEncrypted",
    "aiModel",
    "customBadWords",
    "createdAt",
    "updatedAt"
FROM "GuildSetting";

DROP TABLE "GuildSetting";
ALTER TABLE "new_GuildSetting" RENAME TO "GuildSetting";
CREATE UNIQUE INDEX "GuildSetting_guildId_key" ON "GuildSetting"("guildId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
