import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, badRequest, notFound } from "../../lib/errors.js";
import { idParam } from "../../lib/params.js";
import { validate } from "../../middleware/validate.js";

const router = Router();

const courseSchema = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter olmalı.").max(120),
  summary: z.string().trim().min(3, "Kısa açıklama girin.").max(300),
  description: z.string().trim().min(3, "Açıklama girin.").max(20000),
  category: z.string().trim().min(2, "Kategori girin.").max(50),
  coverImage: z.string().trim().max(500).nullable().optional(),
  level: z.enum(["ALPHA", "BETA", "ALL"]),
  published: z.boolean().optional(),
});

const lessonSchema = z.object({
  title: z.string().trim().min(2, "Ders başlığı girin.").max(150),
  content: z.string().trim().max(20000).default(""),
  videoUrl: z.string().trim().url("Geçerli bir video adresi girin.").max(500).nullable().optional().or(z.literal("").transform(() => null)),
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

router.post(
  "/",
  validate(courseSchema),
  asyncHandler(async (req, res) => {
    const course = await prisma.course.create({ data: req.body });
    res.status(201).json({ course });
  }),
);

router.put(
  "/:id",
  validate(courseSchema.partial()),
  asyncHandler(async (req, res) => {
    const course = await prisma.course.update({ where: { id: idParam(req.params.id) }, data: req.body });
    res.json({ course });
  }),
);

router.patch(
  "/:id/publish",
  validate(z.object({ published: z.boolean() })),
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    if (req.body.published) {
      const lessons = await prisma.lesson.count({ where: { courseId: id } });
      if (lessons === 0) throw badRequest("En az bir ders eklemeden kurs yayınlanamaz.");
    }
    const course = await prisma.course.update({ where: { id }, data: { published: req.body.published } });
    res.json({ course });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.course.delete({ where: { id: idParam(req.params.id) } });
    res.status(204).end();
  }),
);

// ---- Dersler (kurs adımları) ----

router.post(
  "/:id/lessons",
  validate(lessonSchema),
  asyncHandler(async (req, res) => {
    const courseId = idParam(req.params.id);
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
    res.json({ lesson });
  }),
);

router.delete(
  "/:id/lessons/:lessonId",
  asyncHandler(async (req, res) => {
    const courseId = idParam(req.params.id);
    const { count } = await prisma.lesson.deleteMany({ where: { id: idParam(req.params.lessonId), courseId } });
    if (!count) throw notFound("Ders bulunamadı.");
    res.status(204).end();
  }),
);

router.put(
  "/:id/lessons-order",
  validate(z.object({ lessonIds: z.array(z.number().int().positive()).min(1) })),
  asyncHandler(async (req, res) => {
    const courseId = idParam(req.params.id);
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
