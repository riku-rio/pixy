ALTER TABLE "GuildSetting" ADD COLUMN "trialStartedAt" DATETIME;
ALTER TABLE "GuildSetting" ADD COLUMN "trialEndsAt" DATETIME;

CREATE TABLE "GuildDailyAiUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "acceptedRequests" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "GuildDailyAiUsage_guildId_dayKey_key" ON "GuildDailyAiUsage"("guildId", "dayKey");
CREATE INDEX "GuildDailyAiUsage_guildId_idx" ON "GuildDailyAiUsage"("guildId");
