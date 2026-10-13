-- Şifre değişince eski oturumları geçersiz kılmak için sayaç.
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- Aynı anda açılmış fazla yarım denemeleri temizle (her öğrenci ve sınav için en eskisi kalır).
DELETE FROM "ExamAttempt" a
USING "ExamAttempt" b
WHERE a."finishedAt" IS NULL
  AND b."finishedAt" IS NULL
  AND a."userId" = b."userId"
  AND a."examId" = b."examId"
  AND a."id" > b."id";

-- Bir öğrencinin aynı sınavda en fazla bir açık denemesi olabilir.
CREATE UNIQUE INDEX "ExamAttempt_one_open_per_user_exam"
  ON "ExamAttempt"("userId", "examId")
  WHERE "finishedAt" IS NULL;
