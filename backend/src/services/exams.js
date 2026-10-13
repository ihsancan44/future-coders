import { prisma } from "../lib/prisma.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors.js";
import { courseProgress, getAccessibleCourse } from "./access.js";

/** Öğrenciye giden sınav: doğru cevaplar asla gönderilmez. */
export function publicExam(exam) {
  return {
    id: exam.id,
    type: exam.type,
    title: exam.title,
    description: exam.description,
    courseId: exam.courseId,
    durationMinutes: exam.durationMinutes,
    passingScore: exam.passingScore,
    questions: exam.questions.map((q) => ({
      id: q.id,
      order: q.order,
      text: q.text,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
    })),
  };
}

const withQuestions = {
  questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { id: "asc" } } } },
};

export async function getPlacementExam() {
  const exam = await prisma.exam.findFirst({
    where: { type: "PLACEMENT", published: true },
    orderBy: { updatedAt: "desc" },
    include: withQuestions,
  });
  if (!exam || exam.questions.length === 0) throw notFound("Şu anda yayında bir seviye sınavı yok.");
  return exam;
}

export async function getFinalExamForCourse(user, courseId) {
  await getAccessibleCourse(user, courseId);
  const exam = await prisma.exam.findFirst({
    where: { type: "FINAL", courseId, ...(user.role === "ADMIN" ? {} : { published: true }) },
    include: withQuestions,
  });
  if (!exam || exam.questions.length === 0) throw notFound("Bu kursun final sınavı henüz yayında değil.");
  return exam;
}

export function attemptSummary(attempt) {
  return {
    id: attempt.id,
    examId: attempt.examId,
    startedAt: attempt.startedAt,
    finishedAt: attempt.finishedAt,
    score: attempt.score,
    correctCount: attempt.correctCount,
    totalCount: attempt.totalCount,
    passed: attempt.passed,
    assignedLevel: attempt.assignedLevel,
  };
}

/** Sınavı başlatır; yarım kalan deneme varsa onu döndürür. */
export async function startAttempt(user, exam) {
  if (user.role === "ADMIN") throw forbidden("Admin hesabıyla sınava girilemez.");

  if (exam.type === "PLACEMENT") {
    // Sınıfı olan öğrenci sınavı tamamlamıştır. Admin sınıfı kaldırırsa öğrenci sınava yeniden girebilir.
    if (user.level) throw conflict("Seviye sınavını zaten tamamladınız.", "PLACEMENT_DONE");
  } else {
    const passed = await prisma.examAttempt.findFirst({ where: { userId: user.id, examId: exam.id, passed: true } });
    if (passed) throw conflict("Bu kursun final testini zaten geçtin.", "FINAL_PASSED");
    const progress = await courseProgress(user.id, exam.courseId);
    if (!progress.finished) {
      throw forbidden("Final sınavı, kursun tüm adımlarını tamamladığınızda açılır.", "COURSE_NOT_FINISHED");
    }
  }

  const open = await prisma.examAttempt.findFirst({
    where: { userId: user.id, examId: exam.id, finishedAt: null },
  });
  if (open) return open;
  return prisma.examAttempt.create({ data: { userId: user.id, examId: exam.id } });
}

/**
 * Cevapları puanlar. Puan = doğru / toplam soru (yüzde, yuvarlanmış).
 * Final testinde kalan öğrencinin kurs ilerlemesi silinir: kursa baştan başlar.
 */
export async function submitAttempt(user, attemptId, answers) {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: { include: withQuestions } },
  });
  if (!attempt || attempt.userId !== user.id) throw notFound("Sınav denemesi bulunamadı.");
  if (attempt.finishedAt) throw conflict("Bu sınav zaten tamamlandı.", "ATTEMPT_FINISHED");
  if (attempt.exam.type === "PLACEMENT" && user.level) {
    throw conflict("Seviye sınavını zaten tamamladınız.", "PLACEMENT_DONE");
  }
  // Sınav sırasında kursun sınıfı ya da öğrencinin sınıfı değiştiyse final sonucu kaydedilmez.
  if (attempt.exam.type === "FINAL") await getAccessibleCourse(user, attempt.exam.courseId);

  const questions = attempt.exam.questions;
  const byQuestion = new Map(questions.map((q) => [q.id, q]));
  const chosen = new Map();
  for (const { questionId, optionId } of answers) {
    const q = byQuestion.get(questionId);
    if (!q) throw badRequest("Cevaplardan biri bu sınava ait değil.");
    if (optionId != null && !q.options.some((o) => o.id === optionId)) {
      throw badRequest("Geçersiz bir şık seçildi.");
    }
    chosen.set(questionId, optionId ?? null);
  }

  let correct = 0;
  for (const q of questions) {
    const optionId = chosen.get(q.id);
    if (optionId != null && q.options.find((o) => o.id === optionId)?.isCorrect) correct++;
  }
  const total = questions.length;
  const score = total ? Math.round((correct / total) * 100) : 0;
  const passed = score >= attempt.exam.passingScore;
  const assignedLevel = attempt.exam.type === "PLACEMENT" ? (passed ? "BETA" : "ALPHA") : null;
  const courseReset = attempt.exam.type === "FINAL" && !passed;

  const [finished] = await prisma.$transaction([
    prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        finishedAt: new Date(),
        score,
        correctCount: correct,
        totalCount: total,
        passed,
        assignedLevel,
        answers: {
          create: questions.map((q) => ({ questionId: q.id, optionId: chosen.get(q.id) ?? null })),
        },
      },
    }),
    ...(assignedLevel
      ? [prisma.user.update({ where: { id: user.id }, data: { level: assignedLevel } })]
      : []),
    ...(courseReset
      ? [prisma.lessonProgress.deleteMany({ where: { userId: user.id, lesson: { courseId: attempt.exam.courseId } } })]
      : []),
  ]);
  return { attempt: finished, courseReset };
}
