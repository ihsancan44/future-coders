-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "codeExample" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "keyPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "language" TEXT,
ADD COLUMN     "tip" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "PracticeQuestion" (
    "id" SERIAL NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "options" TEXT[],
    "answerIndex" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PracticeQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reel" (
    "id" SERIAL NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "language" TEXT,
    "starterCode" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticeQuestion_lessonId_order_idx" ON "PracticeQuestion"("lessonId", "order");

-- CreateIndex
CREATE INDEX "Reel_lessonId_order_idx" ON "Reel"("lessonId", "order");

-- AddForeignKey
ALTER TABLE "PracticeQuestion" ADD CONSTRAINT "PracticeQuestion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reel" ADD CONSTRAINT "Reel_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
