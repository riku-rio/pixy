CREATE TABLE `GuildConfig` (
  `id` VARCHAR(191) NOT NULL,
  `guildId` VARCHAR(32) NOT NULL,
  `ticketCategoryId` VARCHAR(32) NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `maxLearnedItems` INTEGER NOT NULL DEFAULT 20,
  `escalationCategoryId` VARCHAR(32) NULL,
  `escalationNotificationChannelId` VARCHAR(32) NULL,
  `maxAdminRoutes` INTEGER NOT NULL DEFAULT 10,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `aiEnabled` BOOLEAN NOT NULL DEFAULT true,
  `aiProvider` VARCHAR(32) NOT NULL DEFAULT 'groq',
  `aiModel` VARCHAR(191) NULL,
  `aiSystemPrompt` TEXT NULL,
  UNIQUE INDEX `GuildConfig_guildId_key`(`guildId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LearnedAnswer` (
  `id` VARCHAR(191) NOT NULL,
  `guildId` VARCHAR(32) NOT NULL,
  `type` VARCHAR(32) NOT NULL DEFAULT 'qna',
  `question` TEXT NULL,
  `answer` TEXT NULL,
  `title` VARCHAR(191) NULL,
  `content` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `LearnedAnswer_guildId_idx`(`guildId`),
  INDEX `LearnedAnswer_guildId_type_idx`(`guildId`, `type`),
  PRIMARY KEY (`id`),
  CONSTRAINT `LearnedAnswer_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `GuildConfig`(`guildId`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AdminRoute` (
  `id` VARCHAR(191) NOT NULL,
  `guildId` VARCHAR(32) NOT NULL,
  `roleId` VARCHAR(32) NOT NULL,
  `description` VARCHAR(700) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `AdminRoute_guildId_roleId_key`(`guildId`, `roleId`),
  INDEX `AdminRoute_guildId_idx`(`guildId`),
  INDEX `AdminRoute_guildId_enabled_idx`(`guildId`, `enabled`),
  PRIMARY KEY (`id`),
  CONSTRAINT `AdminRoute_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `GuildConfig`(`guildId`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TicketChannel` (
  `id` VARCHAR(191) NOT NULL,
  `guildId` VARCHAR(32) NOT NULL,
  `channelId` VARCHAR(32) NOT NULL,
  `userId` VARCHAR(32) NULL,
  `closed` BOOLEAN NOT NULL DEFAULT false,
  `status` VARCHAR(32) NOT NULL DEFAULT 'open',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `aiEnabled` BOOLEAN NOT NULL DEFAULT true,
  `lastAiReplyAt` DATETIME(3) NULL,
  `lastUserMessageAt` DATETIME(3) NULL,
  `closedByAi` BOOLEAN NOT NULL DEFAULT false,
  `closedAt` DATETIME(3) NULL,
  `renamedByAiAt` DATETIME(3) NULL,
  `lastAiAction` VARCHAR(64) NULL,
  `lastAiActionAt` DATETIME(3) NULL,
  `escalated` BOOLEAN NOT NULL DEFAULT false,
  `escalatedAt` DATETIME(3) NULL,
  `escalatedRoleId` VARCHAR(32) NULL,
  `escalationReason` VARCHAR(500) NULL,
  `escalationNotificationMessageId` VARCHAR(32) NULL,
  UNIQUE INDEX `TicketChannel_channelId_key`(`channelId`),
  INDEX `TicketChannel_guildId_idx`(`guildId`),
  INDEX `TicketChannel_guildId_status_idx`(`guildId`, `status`),
  INDEX `TicketChannel_guildId_escalated_idx`(`guildId`, `escalated`),
  PRIMARY KEY (`id`),
  CONSTRAINT `TicketChannel_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `GuildConfig`(`guildId`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `GuildIgnoredChannel` (
  `id` VARCHAR(191) NOT NULL,
  `guildId` VARCHAR(32) NOT NULL,
  `channelId` VARCHAR(32) NOT NULL,
  `reason` VARCHAR(300) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `GuildIgnoredChannel_guildId_channelId_key`(`guildId`, `channelId`),
  INDEX `GuildIgnoredChannel_guildId_idx`(`guildId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `GuildIgnoredChannel_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `GuildConfig`(`guildId`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AiUsageLog` (
  `id` VARCHAR(191) NOT NULL,
  `guildId` VARCHAR(32) NOT NULL,
  `channelId` VARCHAR(32) NOT NULL,
  `userId` VARCHAR(32) NULL,
  `provider` VARCHAR(32) NOT NULL,
  `model` VARCHAR(191) NULL,
  `promptTokens` INTEGER NULL,
  `completionTokens` INTEGER NULL,
  `totalTokens` INTEGER NULL,
  `status` VARCHAR(96) NOT NULL,
  `error` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `AiUsageLog_guildId_createdAt_idx`(`guildId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `GuildSetting` (
  `id` VARCHAR(191) NOT NULL,
  `guildId` VARCHAR(32) NOT NULL,
  `aiReplyEnabled` BOOLEAN NOT NULL DEFAULT true,
  `closeTicketEnabled` BOOLEAN NOT NULL DEFAULT true,
  `renameReviewEnabled` BOOLEAN NOT NULL DEFAULT true,
  `escalationEnabled` BOOLEAN NOT NULL DEFAULT true,
  `agentActionsEnabled` BOOLEAN NOT NULL DEFAULT true,
  `groqApiKeyEncrypted` TEXT NULL,
  `aiModel` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `GuildSetting_guildId_key`(`guildId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BlockedTerm` (
  `id` VARCHAR(191) NOT NULL,
  `term` VARCHAR(191) NOT NULL,
  `normalizedTerm` VARCHAR(191) NOT NULL,
  `locale` VARCHAR(16) NOT NULL DEFAULT 'en',
  `category` VARCHAR(32) NOT NULL,
  `severity` VARCHAR(16) NOT NULL DEFAULT 'medium',
  `matchType` VARCHAR(16) NOT NULL DEFAULT 'token',
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `source` VARCHAR(32) NOT NULL DEFAULT 'pixy',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `BlockedTerm_normalizedTerm_key`(`normalizedTerm`),
  INDEX `BlockedTerm_enabled_idx`(`enabled`),
  INDEX `BlockedTerm_category_idx`(`category`),
  INDEX `BlockedTerm_severity_idx`(`severity`),
  INDEX `BlockedTerm_matchType_idx`(`matchType`),
  INDEX `BlockedTerm_enabled_category_idx`(`enabled`, `category`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `GuildBlockedTerm` (
  `id` VARCHAR(191) NOT NULL,
  `guildId` VARCHAR(32) NOT NULL,
  `term` VARCHAR(191) NOT NULL,
  `normalizedTerm` VARCHAR(191) NOT NULL,
  `category` VARCHAR(32) NOT NULL DEFAULT 'custom',
  `severity` VARCHAR(16) NOT NULL DEFAULT 'medium',
  `matchType` VARCHAR(16) NOT NULL DEFAULT 'token',
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `GuildBlockedTerm_guildId_normalizedTerm_key`(`guildId`, `normalizedTerm`),
  INDEX `GuildBlockedTerm_guildId_idx`(`guildId`),
  INDEX `GuildBlockedTerm_guildId_enabled_idx`(`guildId`, `enabled`),
  PRIMARY KEY (`id`),
  CONSTRAINT `GuildBlockedTerm_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `GuildSetting`(`guildId`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `GuildAllowedTerm` (
  `id` VARCHAR(191) NOT NULL,
  `guildId` VARCHAR(32) NOT NULL,
  `term` VARCHAR(191) NOT NULL,
  `normalizedTerm` VARCHAR(191) NOT NULL,
  `reason` VARCHAR(300) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `GuildAllowedTerm_guildId_normalizedTerm_key`(`guildId`, `normalizedTerm`),
  INDEX `GuildAllowedTerm_guildId_idx`(`guildId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `GuildAllowedTerm_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `GuildSetting`(`guildId`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
