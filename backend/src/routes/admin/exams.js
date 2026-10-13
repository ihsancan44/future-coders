import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, badRequest, conflict, notFound } from "../../lib/errors.js";
import { idParam } from "../../lib/params.js";
import { validate } from "../../middleware/validate.js";

const router = Router();

const examSchema = z.object({
  type: z.enum(["PLACEMENT", "FINAL"]),
  title: z.string().trim().min(3, "Sınav başlığı girin.").max(150),
  description: z.string().trim().max(5000).default(""),
  courseId: z.number().int().positive().max(2_147_483_647).nullable().optional(),
  durationMinutes: z.number().int().min(1).max(600).nullable().optional(),
  passingScore: z.number().int().min(0).max(100).default(60),
  published: z.boolean().optional(),
});

const questionSchema = z
  .object({
    text: z.string().trim().min(3, "Soru metni girin.").max(2000),
    options: z
      .array(z.object({ text: z.string().trim().min(1, "Şık boş olamaz.").max(500), isCorrect: z.boolean() }))
      .min(2, "En az 2 şık girin.")
      .max(8, "En fazla 8 şık girilebilir."),
  })
  .refine((q) => q.options.filter((o) => o.isCorrect).length === 1, {
    message: "Her sorunun tam olarak bir doğru cevabı olmalı.",
    path: ["options"],
  });

const examInclude = {
  course: { select: { id: true, title: true } },
  questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { id: "asc" } } } },
  _count: { select: { attempts: true } },
};

async function checkExamTarget(data, examId) {
  if (data.type === "FINAL") {
    if (!data.courseId) throw badRequest("Final sınavı için bir kurs seçin.", { courseId: "Kurs seçin." });
    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course) throw badRequest("Seçilen kurs bulunamadı.");
    const other = await prisma.exam.findFirst({ where: { courseId: data.courseId, NOT: examId ? { id: examId } : undefined } });
    if (other) throw conflict("Bu kursun zaten bir final sınavı var.");
  } else {
    data.courseId = null;
  }
}

router.get(
  "/",
  validate(z.object({ type: z.enum(["PLACEMENT", "FINAL"]).optional() }), "query"),
  asyncHandler(async (req, res) => {
    const exams = await prisma.exam.findMany({
      where: req.query.type ? { type: req.query.type } : {},
      orderBy: [{ type: "desc" }, { createdAt: "desc" }],
      include: { course: { select: { id: true, title: true } }, _count: { select: { questions: true, attempts: true } } },
    });
    res.json({ exams });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const exam = await prisma.exam.findUnique({ where: { id: idParam(req.params.id) }, include: examInclude });
    if (!exam) throw notFound("Sınav bulunamadı.");
    res.json({ exam });
  }),
);

router.post(
  "/",
  validate(examSchema),
  asyncHandler(async (req, res) => {
    await checkExamTarget(req.body);
    const exam = await prisma.exam.create({ data: { ...req.body, published: false } });
    res.status(201).json({ exam });
  }),
);

/**
 * Yayın kuralları: sorusuz sınav yayına alınamaz, aynı anda tek seviye sınavı yayında olur.
 * PATCH /publish ve PUT (published alanıyla) aynı işlemleri kullanır.
 */
async function publishOps(exam, published) {
  if (!published) return [];
  const questions = await prisma.question.count({ where: { examId: exam.id } });
  if (questions === 0) throw badRequest("Soru eklemeden sınav yayınlanamaz.");
  return exam.type === "PLACEMENT"
    ? [prisma.exam.updateMany({ where: { type: "PLACEMENT", NOT: { id: exam.id } }, data: { published: false } })]
    : [];
}

router.put(
  "/:id",
  validate(examSchema.partial().omit({ type: true })),
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const existing = await prisma.exam.findUnique({ where: { id } });
    if (!existing) throw notFound("Sınav bulunamadı.");
    const data = { ...req.body };
    if (existing.type === "FINAL" && data.courseId !== undefined && data.courseId !== existing.courseId) {
      // Sonuçlar kursa sınav üzerinden bağlı: denemesi olan final başka kursa taşınırsa eski kursu geçenler yeni kursu
      // geçmiş sayılırdı. Böyle bir final taşınmaz; yeni kurs için yeni final oluşturulur.
      if (await prisma.examAttempt.count({ where: { examId: id } })) {
        throw conflict("Bu finale girmiş öğrenciler var, başka kursa taşınamaz. Yeni kurs için yeni bir final sınavı oluşturun.");
      }
      await checkExamTarget({ type: "FINAL", courseId: data.courseId }, id);
    }
    if (existing.type === "PLACEMENT") delete data.courseId;
    const ops = await publishOps(existing, data.published);
    const results = await prisma.$transaction([...ops, prisma.exam.update({ where: { id }, data })]);
    res.json({ exam: results.at(-1) });
  }),
);

router.patch(
  "/:id/publish",
  validate(z.object({ published: z.boolean() })),
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) throw notFound("Sınav bulunamadı.");
    const ops = await publishOps(exam, req.body.published);
    const results = await prisma.$transaction([...ops, prisma.exam.update({ where: { id }, data: { published: req.body.published } })]);
    res.json({ exam: results.at(-1) });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) throw notFound("Sınav bulunamadı.");
    if (exam.published) throw conflict("Yayındaki sınav silinemez. Önce yayından kaldırın.");
    // Sınav silinince öğrencilerin sonuçları da silinir (geçtiği final, seviye sınavı geçmişi). Sonucu olan sınav saklanır.
    if (await prisma.examAttempt.count({ where: { examId: id, finishedAt: { not: null } } })) {
      throw conflict("Bu sınavda öğrenci sonuçları var; silinirse sonuçlar da kaybolur. Sınavı yayından kaldırmanız yeterli.");
    }
    await prisma.exam.delete({ where: { id } });
    res.status(204).end();
  }),
);

// ---- Sorular ----

router.post(
  "/:id/questions",
  validate(questionSchema),
  asyncHandler(async (req, res) => {
    const examId = idParam(req.params.id);
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw notFound("Sınav bulunamadı.");
    const last = await prisma.question.findFirst({ where: { examId }, orderBy: { order: "desc" } });
    const question = await prisma.question.create({
      data: { examId, order: (last?.order ?? 0) + 1, text: req.body.text, options: { create: req.body.options } },
      include: { options: { orderBy: { id: "asc" } } },
    });
    res.status(201).json({ question });
  }),
);

router.put(
  "/:id/questions/:questionId",
  validate(questionSchema),
  asyncHandler(async (req, res) => {
    const examId = idParam(req.params.id);
    const questionId = idParam(req.params.questionId);
    const existing = await prisma.question.findFirst({ where: { id: questionId, examId } });
    if (!existing) throw notFound("Soru bulunamadı.");
    // Şıklar yeniden oluşturulur; eski denemelerdeki cevaplar puanlarını korur (optionId boşa düşer).
    const [, , question] = await prisma.$transaction([
      prisma.option.deleteMany({ where: { questionId } }),
      prisma.question.update({ where: { id: questionId }, data: { text: req.body.text } }),
      prisma.question.update({
        where: { id: questionId },
        data: { options: { create: req.body.options } },
        include: { options: { orderBy: { id: "asc" } } },
      }),
    ]);
    res.json({ question });
  }),
);

router.delete(
  "/:id/questions/:questionId",
  asyncHandler(async (req, res) => {
    const examId = idParam(req.params.id);
    const questionId = idParam(req.params.questionId);
    await prisma.$transaction(async (tx) => {
      // Sınav satırı kilitlenir: aynı anda gelen iki silme isteği "son soru" kuralını birlikte atlatamasın.
      const [exam] = await tx.$queryRaw`SELECT id, published FROM "Exam" WHERE id = ${examId} FOR UPDATE`;
      if (!exam) throw notFound("Sınav bulunamadı.");
      const { count } = await tx.question.deleteMany({ where: { id: questionId, examId } });
      if (!count) throw notFound("Soru bulunamadı.");
      if (exam.published && (await tx.question.count({ where: { examId } })) === 0) {
        throw badRequest("Yayındaki sınavın son sorusu silinemez. Önce yeni bir soru ekleyin ya da sınavı yayından kaldırın.");
      }
    });
    res.status(204).end();
  }),
);

export default router;
