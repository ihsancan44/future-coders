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

/** Süre bittikten sonra gelen gönderim için tanınan pay (otomatik gönderim ve ağ gecikmesi). */
export const SUBMIT_GRACE_MS = 2 * 60_000;

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
  // Süresi dolmuş yarım deneme önce kaydedilmiş cevaplarla puanlanır; sonuç (sınıf, ilerleme) aşağıdaki kontrolleri etkiler.
  if (await settleExpiredAttempts(user.id, exam.id)) user = await prisma.user.findUnique({ where: { id: user.id } });

  if (exam.type === "PLACEMENT") {
    // Sınıfı olan öğrenci sınavı tamamlamıştır. Admin sınıfı kaldırırsa öğrenci sınava yeniden girebilir.
    if (user.level) throw conflict("Seviye sınavını zaten tamamladınız.", "PLACEMENT_DONE");
  } else {
    const passed = await prisma.examAttempt.findFirst({ where: { userId: user.id, examId: exam.id, passed: true } });
    if (passed) throw conflict("Bu kursun final testini zaten geçtin.", "FINAL_PASSED");
    const progress = await courseProgress(user.id, exam.courseId);
    if (!progress.finished) {
      if (progress.completed === 0 && (await lastFinalTimedOut(user.id, exam))) {
        throw forbidden(
          "Süren dolduğu için sınav, süre içinde işaretlediğin cevaplarla puanlandı ve geçme notuna ulaşamadın. Kurs ilerlemen sıfırlandı: adımları tamamlayıp teste tekrar girebilirsin.",
          "EXPIRED_FAILED",
        );
      }
      throw forbidden("Final sınavı, kursun tüm adımlarını tamamladığınızda açılır.", "COURSE_NOT_FINISHED");
    }
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

/** Son final denemesi süre dolduktan sonra (kaydedilen cevaplarla) puanlanıp kaldıysa true. */
async function lastFinalTimedOut(userId, exam) {
  const last = await prisma.examAttempt.findFirst({ where: { userId, examId: exam.id, finishedAt: { not: null } }, orderBy: { finishedAt: "desc" } });
  return Boolean(last && !last.passed && exam.durationMinutes && last.finishedAt.getTime() > deadlineOf(last, exam));
}

const deadlineOf = (attempt, exam) =>
  exam.durationMinutes ? attempt.startedAt.getTime() + exam.durationMinutes * 60_000 + SUBMIT_GRACE_MS : null;
const isExpired = (attempt, exam) => {
  const deadline = deadlineOf(attempt, exam);
  return deadline !== null && Date.now() > deadline;
};
const draftToList = (draft) =>
  Object.entries(draft && typeof draft === "object" ? draft : {}).map(([questionId, optionId]) => ({
    questionId: Number(questionId),
    optionId: optionId == null ? null : Number(optionId),
  }));

const loadAttempt = (id) => prisma.examAttempt.findUnique({ where: { id }, include: { exam: { include: withQuestions } } });

/**
 * Süresi dolup gönderilmemiş denemeleri, sınav sırasında kaydedilen cevaplarla puanlar (ihsan'ın kararı, 13.10.2026:
 * süreyi doldurup sınava yeniden girerek cevaplara bakma yolu kapansın). Puanlanamayan (sınavı değişmiş, erişimi kalmamış)
 * deneme silinir. examId verilmezse öğrencinin tüm sınavlarına bakılır. Puanlanan deneme sayısını döndürür.
 */
export async function settleExpiredAttempts(userId, examId) {
  const open = await prisma.examAttempt.findMany({
    where: { userId, finishedAt: null, ...(examId ? { examId } : {}) },
    include: { exam: { include: withQuestions } },
  });
  let settled = 0;
  for (const attempt of open.filter((a) => isExpired(a, a.exam))) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    try {
      await finishAttempt(user, attempt, draftToList(attempt.draftAnswers));
      settled++;
    } catch (err) {
      if (![400, 403, 404, 409].includes(err.status)) throw err;
      await prisma.examAttempt.deleteMany({ where: { id: attempt.id, finishedAt: null } });
    }
  }
  return settled;
}

/** Sınav sürerken işaretlenen cevapları kaydeder; süre dolarsa deneme bunlarla puanlanır. */
export async function saveDraft(user, attemptId, answers) {
  const attempt = await loadAttempt(attemptId);
  if (!attempt || attempt.userId !== user.id) throw notFound("Sınav denemesi bulunamadı.");
  if (attempt.finishedAt) throw conflict("Bu sınav zaten tamamlandı.", "ATTEMPT_FINISHED");
  if (isExpired(attempt, attempt.exam)) throw conflict("Sınav süresi doldu.", "ATTEMPT_EXPIRED");
  // Yalnızca bu sınavın soru/şık çiftleri saklanır; başka sınavdan bir kimlik taslağı puanlanamaz hale getirmesin.
  const valid = new Map(attempt.exam.questions.map((q) => [q.id, new Set(q.options.map((o) => o.id))]));
  const draft = {};
  for (const { questionId, optionId } of answers) if (optionId != null && valid.get(questionId)?.has(optionId)) draft[questionId] = optionId;
  await prisma.examAttempt.updateMany({ where: { id: attempt.id, finishedAt: null }, data: { draftAnswers: draft } });
}

/**
 * Cevapları puanlar. Puan = doğru / toplam soru (yüzde, yuvarlanmış).
 * Final testinde kalan öğrencinin kurs ilerlemesi silinir: kursa baştan başlar.
 * Süre (ve kısa gecikme payı) dolduktan sonra gelen gönderimde, gönderilen cevaplar yerine süre içinde kaydedilenler puanlanır.
 */
export async function submitAttempt(user, attemptId, answers) {
  const attempt = await loadAttempt(attemptId);
  if (!attempt || attempt.userId !== user.id) throw notFound("Sınav denemesi bulunamadı.");
  if (attempt.finishedAt) throw conflict("Bu sınav zaten tamamlandı.", "ATTEMPT_FINISHED");
  const expired = isExpired(attempt, attempt.exam);
  const result = await finishAttempt(user, attempt, expired ? draftToList(attempt.draftAnswers) : answers);
  return { ...result, expired };
}

async function finishAttempt(user, attempt, answers) {
  if (attempt.exam.type === "PLACEMENT" && user.level) {
    throw conflict("Seviye sınavını zaten tamamladınız.", "PLACEMENT_DONE");
  }
  // Sınav sırasında admin sınavı yayından kaldırdıysa (ör. cevap anahtarını düzeltmek için), tüm sorularını sildiyse
  // ya da yeni bir seviye sınavı yayınladıysa bu deneme puanlanmaz; öğrenci güncel sınava baştan girer.
  const stale =
    !attempt.exam.published ||
    attempt.exam.questions.length === 0 ||
    (attempt.exam.type === "PLACEMENT" && (await getPlacementExam().catch(() => null))?.id !== attempt.exam.id);
  if (stale) {
    await prisma.examAttempt.deleteMany({ where: { id: attempt.id, finishedAt: null } });
    throw conflict("Sen sınavdayken sınav güncellendi, bu yüzden cevapların kaydedilmedi. Sınava baştan girebilirsin.", "EXAM_CHANGED");
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
  // Geçme kararı yuvarlanmamış orana göre verilir (ör. 23 sorudan 16 doğru = %69,6, %70 barajını geçmez).
  const passed = total > 0 && correct * 100 >= attempt.exam.passingScore * total;
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
    if (assignedLevel) {
      // İki seviye sınavı aynı anda gönderilirse sadece ilki sınıf atar.
      const set = await tx.user.updateMany({ where: { id: user.id, level: null }, data: { level: assignedLevel } });
      if (!set.count) throw conflict("Seviye sınavını zaten tamamladınız.", "PLACEMENT_DONE");
    }
    if (courseReset) {
      await tx.lessonProgress.deleteMany({ where: { userId: user.id, lesson: { courseId: attempt.exam.courseId } } });
    }
    return tx.examAttempt.findUnique({ where: { id: attempt.id } });
  });
  return { attempt: finished, courseReset };
}
