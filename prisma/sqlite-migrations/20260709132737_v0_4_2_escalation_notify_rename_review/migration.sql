-- AlterTable
ALTER TABLE "GuildConfig" ADD COLUMN "escalationNotificationChannelId" TEXT;

-- AlterTable
ALTER TABLE "TicketChannel" ADD COLUMN "escalationNotificationMessageId" TEXT;
