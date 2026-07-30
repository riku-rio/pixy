ALTER TABLE `GuildConfig`
  ALTER COLUMN `maxLearnedItems` SET DEFAULT 50;

UPDATE `GuildConfig`
SET `maxLearnedItems` = 50
WHERE `maxLearnedItems` = 20;