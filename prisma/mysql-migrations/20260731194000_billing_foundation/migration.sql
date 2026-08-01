CREATE TABLE `GuildBilling` (
  `id` VARCHAR(191) NOT NULL,
  `guildId` VARCHAR(32) NOT NULL,
  `trialStartedAt` DATETIME(3) NULL,
  `trialEndsAt` DATETIME(3) NULL,
  `proStartedAt` DATETIME(3) NULL,
  `proEndsAt` DATETIME(3) NULL,
  `partnerActive` BOOLEAN NOT NULL DEFAULT false,
  `partnerSince` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `GuildBilling_guildId_key`(`guildId`),
  INDEX `GuildBilling_partnerActive_partnerSince_idx`(`partnerActive`, `partnerSince`),
  INDEX `GuildBilling_trialEndsAt_idx`(`trialEndsAt`),
  INDEX `GuildBilling_proEndsAt_idx`(`proEndsAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BillingEvent` (
  `id` VARCHAR(191) NOT NULL,
  `guildId` VARCHAR(32) NOT NULL,
  `actorUserId` VARCHAR(32) NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `durationValue` INTEGER NULL,
  `durationUnit` VARCHAR(16) NULL,
  `previousProEndsAt` DATETIME(3) NULL,
  `newProEndsAt` DATETIME(3) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `BillingEvent_guildId_createdAt_idx`(`guildId`, `createdAt`),
  INDEX `BillingEvent_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`),
  INDEX `BillingEvent_action_createdAt_idx`(`action`, `createdAt`),
  INDEX `BillingEvent_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
