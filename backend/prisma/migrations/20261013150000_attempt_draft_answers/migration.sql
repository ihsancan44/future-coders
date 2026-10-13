-- Sınav sırasında kaydedilen cevaplar: süresi dolan deneme bunlarla puanlanır.
ALTER TABLE "ExamAttempt" ADD COLUMN "draftAnswers" JSONB;
