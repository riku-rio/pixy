-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LearnedAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'qna',
    "question" TEXT,
    "answer" TEXT,
    "title" TEXT,
    "content" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LearnedAnswer_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig" ("guildId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LearnedAnswer" ("answer", "createdAt", "guildId", "id", "question", "updatedAt") SELECT "answer", "createdAt", "guildId", "id", "question", "updatedAt" FROM "LearnedAnswer";
DROP TABLE "LearnedAnswer";
ALTER TABLE "new_LearnedAnswer" RENAME TO "LearnedAnswer";
CREATE INDEX "LearnedAnswer_guildId_idx" ON "LearnedAnswer"("guildId");
CREATE INDEX "LearnedAnswer_guildId_type_idx" ON "LearnedAnswer"("guildId", "type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
