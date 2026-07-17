-- CreateTable
CREATE TABLE "GuildSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "aiReplyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "closeTicketEnabled" BOOLEAN NOT NULL DEFAULT true,
    "renameReviewEnabled" BOOLEAN NOT NULL DEFAULT true,
    "escalationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "agentActionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "groqApiKey" TEXT,
    "aiModel" TEXT,
    "customBadWords" TEXT NOT NULL DEFAULT '[]',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "planExpiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildSetting_guildId_key" ON "GuildSetting"("guildId");
