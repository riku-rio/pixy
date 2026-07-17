-- Rename the credential column so its encrypted-at-rest contract is explicit.
ALTER TABLE "GuildSetting" RENAME COLUMN "groqApiKey" TO "groqApiKeyEncrypted";

-- Any value written before encrypted credential support is not trusted as ciphertext.
-- The previous settings UI had no key write path, so this should normally affect zero rows.
UPDATE "GuildSetting"
SET "groqApiKeyEncrypted" = NULL
WHERE "groqApiKeyEncrypted" IS NOT NULL
  AND "groqApiKeyEncrypted" NOT LIKE 'v1:%';

-- Preserve a legacy guild model only when the new settings record has no override.
UPDATE "GuildSetting"
SET "aiModel" = (
  SELECT "GuildConfig"."aiModel"
  FROM "GuildConfig"
  WHERE "GuildConfig"."guildId" = "GuildSetting"."guildId"
)
WHERE "aiModel" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "GuildConfig"
    WHERE "GuildConfig"."guildId" = "GuildSetting"."guildId"
      AND "GuildConfig"."aiModel" IS NOT NULL
  );
