-- CreateTable
CREATE TABLE "BlockedTerm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "term" TEXT NOT NULL,
    "normalizedTerm" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "matchType" TEXT NOT NULL DEFAULT 'token',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'pixy',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockedTerm_normalizedTerm_key" ON "BlockedTerm"("normalizedTerm");
CREATE INDEX "BlockedTerm_enabled_idx" ON "BlockedTerm"("enabled");
CREATE INDEX "BlockedTerm_category_idx" ON "BlockedTerm"("category");
CREATE INDEX "BlockedTerm_severity_idx" ON "BlockedTerm"("severity");
CREATE INDEX "BlockedTerm_matchType_idx" ON "BlockedTerm"("matchType");
CREATE INDEX "BlockedTerm_enabled_category_idx" ON "BlockedTerm"("enabled", "category");

-- CreateTable
CREATE TABLE "GuildBlockedTerm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "normalizedTerm" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'custom',
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "matchType" TEXT NOT NULL DEFAULT 'token',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GuildBlockedTerm_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildSetting"("guildId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildBlockedTerm_guildId_normalizedTerm_key" ON "GuildBlockedTerm"("guildId", "normalizedTerm");
CREATE INDEX "GuildBlockedTerm_guildId_idx" ON "GuildBlockedTerm"("guildId");
CREATE INDEX "GuildBlockedTerm_guildId_enabled_idx" ON "GuildBlockedTerm"("guildId", "enabled");

-- CreateTable
CREATE TABLE "GuildAllowedTerm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "normalizedTerm" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GuildAllowedTerm_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildSetting"("guildId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildAllowedTerm_guildId_normalizedTerm_key" ON "GuildAllowedTerm"("guildId", "normalizedTerm");
CREATE INDEX "GuildAllowedTerm_guildId_idx" ON "GuildAllowedTerm"("guildId");

-- Migrate existing custom bad words from JSON to GuildBlockedTerm table
-- This INSERT handles data migration from the old JSON column
INSERT INTO "GuildBlockedTerm" ("id", "guildId", "term", "normalizedTerm", "category", "severity", "matchType", "enabled", "createdAt", "updatedAt")
SELECT
    lower(hex(randomblob(16))),
    "guildId",
    TRIM(value) AS "term",
    lower(TRIM(value)) AS "normalizedTerm",
    'custom' AS "category",
    'medium' AS "severity",
    'token' AS "matchType",
    1 AS "enabled",
    CURRENT_TIMESTAMP AS "createdAt",
    CURRENT_TIMESTAMP AS "updatedAt"
FROM "GuildSetting",
    json_each("GuildSetting"."customBadWords")
WHERE json_valid("GuildSetting"."customBadWords")
  AND TRIM(value) != ''
  AND length(TRIM(value)) > 0;

-- Remove the old customBadWords column
-- We use the table rebuild pattern since SQLite doesn't support DROP COLUMN directly
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_GuildSetting" (
    "id", "guildId", "aiReplyEnabled", "closeTicketEnabled",
    "renameReviewEnabled", "escalationEnabled", "agentActionsEnabled",
    "groqApiKeyEncrypted", "aiModel", "createdAt", "updatedAt"
)
SELECT
    "id", "guildId", "aiReplyEnabled", "closeTicketEnabled",
    "renameReviewEnabled", "escalationEnabled", "agentActionsEnabled",
    "groqApiKeyEncrypted", "aiModel", "createdAt", "updatedAt"
FROM "GuildSetting";

DROP TABLE "GuildSetting";
ALTER TABLE "new_GuildSetting" RENAME TO "GuildSetting";
CREATE UNIQUE INDEX "GuildSetting_guildId_key" ON "GuildSetting"("guildId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
