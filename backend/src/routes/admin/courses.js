import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, badRequest, notFound } from "../../lib/errors.js";
import { idParam } from "../../lib/params.js";
import { LOCAL_UPLOAD, removeUpload, removeUploads } from "../../lib/uploads.js";
import { validate } from "../../middleware/validate.js";
import { imageUrl, webUrl } from "../../lib/validators.js";

const router = Router();

const courseSchema = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter olmalı.").max(120),
  summary: z.string().trim().min(3, "Kısa açıklama girin.").max(300),
  description: z.string().trim().min(3, "Açıklama girin.").max(20000),
  category: z.string().trim().min(2, "Kategori girin.").max(50),
  coverImage: imageUrl,
  level: z.enum(["ALPHA", "BETA", "ALL"]),
  published: z.boolean().optional(),
});

const lessonSchema = z.object({
  title: z.string().trim().min(2, "Ders başlığı girin.").max(150),
  content: z.string().trim().max(20000).default(""),
  /** YouTube/Vimeo bağlantısı ya da sunucuya yüklenmiş video (/uploads/...). */
  videoUrl: z
    .union([webUrl, z.string().trim().regex(LOCAL_UPLOAD), z.literal("").transform(() => null)], {
      errorMap: () => ({ message: "Geçerli bir video adresi girin veya video yükleyin." }),
    })
    .nullable()
    .optional(),
  durationMinutes: z.coerce.number().int().min(0).max(1000).default(0),
});

const adminCourse = (c) => ({
  ...c,
  lessonCount: c._count?.lessons ?? c.lessons?.length ?? 0,
  commentCount: c._count?.comments ?? 0,
  hasFinalExam: Boolean(c.finalExam),
});

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { lessons: true, comments: true } }, finalExam: { select: { id: true } } },
    });
    res.json({ courses: courses.map(adminCourse) });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({
      where: { id: idParam(req.params.id) },
      include: { lessons: { orderBy: { order: "asc" } }, finalExam: { select: { id: true, published: true } } },
    });
    if (!course) throw notFound("Kurs bulunamadı.");
    res.json({ course });
  }),
);

/** Dersi olmayan kurs yayına alınamaz (PATCH /publish ve oluşturma/düzenleme istekleri aynı kurala uyar). */
async function assertPublishable(courseId) {
  const lessons = courseId ? await prisma.lesson.count({ where: { courseId } }) : 0;
  if (lessons === 0) throw badRequest("En az bir ders eklemeden kurs yayınlanamaz.");
}

router.post(
  "/",
  validate(courseSchema),
  asyncHandler(async (req, res) => {
    if (req.body.published) await assertPublishable(null);
    const course = await prisma.course.create({ data: req.body });
    res.status(201).json({ course });
  }),
);

router.put(
  "/:id",
  validate(courseSchema.partial()),
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const before = await prisma.course.findUnique({ where: { id }, select: { coverImage: true } });
    if (!before) throw notFound("Kurs bulunamadı.");
    if (req.body.published) await assertPublishable(id);
    const course = await prisma.course.update({ where: { id }, data: req.body });
    if (before.coverImage !== course.coverImage) await removeUpload(before.coverImage);
    res.json({ course });
  }),
);

router.patch(
  "/:id/publish",
  validate(z.object({ published: z.boolean() })),
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    if (req.body.published) await assertPublishable(id);
    const course = await prisma.course.update({ where: { id }, data: { published: req.body.published } });
    res.json({ course });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const course = await prisma.course.findUnique({ where: { id }, include: { lessons: { select: { videoUrl: true } } } });
    if (!course) throw notFound("Kurs bulunamadı.");
    await prisma.course.delete({ where: { id } });
    await removeUploads([course.coverImage, ...course.lessons.map((l) => l.videoUrl)]);
    res.status(204).end();
  }),
);

// ---- Dersler (kurs adımları) ----

router.post(
  "/:id/lessons",
  validate(lessonSchema),
  asyncHandler(async (req, res) => {
    const courseId = idParam(req.params.id);
    if (!(await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }))) throw notFound("Kurs bulunamadı.");
    const last = await prisma.lesson.findFirst({ where: { courseId }, orderBy: { order: "desc" } });
    const lesson = await prisma.lesson.create({ data: { ...req.body, courseId, order: (last?.order ?? 0) + 1 } });
    res.status(201).json({ lesson });
  }),
);

router.put(
  "/:id/lessons/:lessonId",
  validate(lessonSchema.partial()),
  asyncHandler(async (req, res) => {
    const courseId = idParam(req.params.id);
    const lessonId = idParam(req.params.lessonId);
    const existing = await prisma.lesson.findFirst({ where: { id: lessonId, courseId } });
    if (!existing) throw notFound("Ders bulunamadı.");
    const lesson = await prisma.lesson.update({ where: { id: lessonId }, data: req.body });
    if (existing.videoUrl !== lesson.videoUrl) await removeUpload(existing.videoUrl);
    res.json({ lesson });
  }),
);

router.delete(
  "/:id/lessons/:lessonId",
  asyncHandler(async (req, res) => {
    const courseId = idParam(req.params.id);
    const lesson = await prisma.$transaction(async (tx) => {
      // Kurs satırı kilitlenir: aynı anda gelen iki silme isteği "son ders" kuralını birlikte atlatamasın.
      const [course] = await tx.$queryRaw`SELECT id, published FROM "Course" WHERE id = ${courseId} FOR UPDATE`;
      const found = course && (await tx.lesson.findFirst({ where: { id: idParam(req.params.lessonId), courseId } }));
      if (!found) throw notFound("Ders bulunamadı.");
      await tx.lesson.delete({ where: { id: found.id } });
      if (course.published && (await tx.lesson.count({ where: { courseId } })) === 0) {
        throw badRequest("Yayındaki kursun son dersi silinemez. Önce yeni bir ders ekleyin ya da kursu yayından kaldırın.");
      }
      return found;
    });
    await removeUpload(lesson.videoUrl);
    res.status(204).end();
  }),
);

router.put(
  "/:id/lessons-order",
  validate(z.object({ lessonIds: z.array(z.number().int().positive()).min(1) })),
  asyncHandler(async (req, res) => {
    const courseId = idParam(req.params.id);
    if (!(await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }))) throw notFound("Kurs bulunamadı.");
    const lessons = await prisma.lesson.findMany({ where: { courseId }, select: { id: true } });
    const ids = new Set(lessons.map((l) => l.id));
    const given = req.body.lessonIds;
    if (given.length !== ids.size || !given.every((id) => ids.has(id)) || new Set(given).size !== given.length) {
      throw badRequest("Sıralama listesi kursun tüm derslerini tam olarak bir kez içermeli.");
    }
    await prisma.$transaction(given.map((id, i) => prisma.lesson.update({ where: { id }, data: { order: i + 1 } })));
    res.json({ lessons: await prisma.lesson.findMany({ where: { courseId }, orderBy: { order: "asc" } }) });
  }),
);

export default router;
