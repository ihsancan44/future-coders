import { Prisma } from "@prisma/client";
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

  // Süresi dolmuş ve hiç gönderilmemiş deneme sayılmaz: cevaplar sunucuya ulaşmadığı için öğrenci
  // sınavı yeni bir süreyle baştan çözer (eskiden sayfa açılır açılmaz 0 puanla gönderiliyordu).
  if (exam.durationMinutes) {
    const cutoff = new Date(Date.now() - exam.durationMinutes * 60_000);
    await prisma.examAttempt.deleteMany({
      where: { userId: user.id, examId: exam.id, finishedAt: null, startedAt: { lt: cutoff } },
    });
  }
  const findOpen = () => prisma.examAttempt.findFirst({ where: { userId: user.id, examId: exam.id, finishedAt: null } });
  const open = await findOpen();
  if (open) return open;
  try {
    return await prisma.examAttempt.create({ data: { userId: user.id, examId: exam.id } });
  } catch (err) {
    // Sınav iki sekmede aynı anda açıldıysa veritabanı ikinci açık denemeyi reddeder; ikisi de aynı denemeyi kullanır.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return findOpen();
    throw err;
  }
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

  // Öğrenci sınavdayken admin bir soruyu silebilir ya da şıklarını değiştirebilir (şıklar yeniden oluşturulur).
  // Artık var olmayan soru ve şıklara verilen cevaplar boş sayılır; eskiden öğrenci sınavı hiç gönderemiyordu.
  // Hâlâ var olan ama başka bir soruya/sınava ait kimlikler ise hatalı istektir ve reddedilir.
  const questions = attempt.exam.questions;
  const byQuestion = new Map(questions.map((q) => [q.id, q]));
  const chosen = new Map();
  const strayQuestions = [];
  const strayOptions = [];
  for (const { questionId, optionId } of answers) {
    const q = byQuestion.get(questionId);
    if (!q) {
      strayQuestions.push(questionId);
      continue;
    }
    const valid = optionId != null && q.options.some((o) => o.id === optionId);
    if (optionId != null && !valid) strayOptions.push(optionId);
    chosen.set(questionId, valid ? optionId : null);
  }
  if (strayQuestions.length && (await prisma.question.count({ where: { id: { in: strayQuestions } } }))) {
    throw badRequest("Cevaplardan biri bu sınava ait değil.");
  }
  if (strayOptions.length && (await prisma.option.count({ where: { id: { in: strayOptions } } }))) {
    throw badRequest("Geçersiz bir şık seçildi.");
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

  const finished = await prisma.$transaction(async (tx) => {
    // Çift tıklama / iki sekme: denemeyi yalnızca hâlâ açıksa kapat, ikinci gönderim puanlanmaz.
    const { count } = await tx.examAttempt.updateMany({
      where: { id: attempt.id, finishedAt: null },
      data: { finishedAt: new Date(), score, correctCount: correct, totalCount: total, passed, assignedLevel },
    });
    if (!count) throw conflict("Bu sınav zaten tamamlandı.", "ATTEMPT_FINISHED");
    await tx.attemptAnswer.createMany({
      data: questions.map((q) => ({ attemptId: attempt.id, questionId: q.id, optionId: chosen.get(q.id) ?? null })),
    });
    if (assignedLevel) await tx.user.update({ where: { id: user.id }, data: { level: assignedLevel } });
    if (courseReset) {
      await tx.lessonProgress.deleteMany({ where: { userId: user.id, lesson: { courseId: attempt.exam.courseId } } });
    }
    return tx.examAttempt.findUnique({ where: { id: attempt.id } });
  });
  return { attempt: finished, courseReset };
}
