import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, badRequest, notFound } from "../../lib/errors.js";
import { idParam } from "../../lib/params.js";
import { authorName, publicUser } from "../../lib/serializers.js";
import { validate } from "../../middleware/validate.js";
import { findCareer } from "../../data/careers.js";

const router = Router();

router.get(
  "/users",
  validate(
    z.object({
      level: z.enum(["ALPHA", "BETA", "NONE"]).optional(),
      role: z.enum(["STUDENT", "ADMIN"]).optional(),
      search: z.string().trim().optional(),
    }),
    "query",
  ),
  asyncHandler(async (req, res) => {
    const { level, role, search } = req.query;
    const where = {};
    if (role) where.role = role;
    if (level) where.level = level === "NONE" ? null : level;
    if (search) {
      where.OR = ["firstName", "lastName", "email", "school"].map((f) => ({ [f]: { contains: search, mode: "insensitive" } }));
    }
    const users = await prisma.user.findMany({ where, orderBy: { createdAt: "desc" } });
    res.json({ users: users.map(publicUser) });
  }),
);

/** Üye detayı: bilgiler, kurs ilerlemeleri ve sınav sonuçları. */
router.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: idParam(req.params.id) },
      include: {
        progress: { include: { lesson: { select: { courseId: true } } } },
        attempts: {
          where: { finishedAt: { not: null } },
          orderBy: { finishedAt: "desc" },
          include: { exam: { select: { id: true, title: true, type: true, courseId: true } } },
        },
        _count: { select: { comments: true } },
      },
    });
    if (!user) throw notFound("Üye bulunamadı.");

    const done = new Map();
    for (const p of user.progress) done.set(p.lesson.courseId, (done.get(p.lesson.courseId) || 0) + 1);
    const finalCourseIds = user.attempts.filter((a) => a.exam.type === "FINAL").map((a) => a.exam.courseId);
    const courseIds = [...new Set([...done.keys(), ...finalCourseIds])];
    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, title: true, _count: { select: { lessons: true } } },
      orderBy: { title: "asc" },
    });

    res.json({
      user: {
        ...publicUser(user),
        careerTitle: findCareer(user.careerField)?.title ?? null,
        careerChosenAt: user.careerChosenAt, updatedAt: user.updatedAt, commentCount: user._count.comments },
      courses: courses.map((c) => {
        const completed = done.get(c.id) || 0;
        const total = c._count.lessons;
        return {
          id: c.id,
          title: c.title,
          completed,
          total,
          percent: total ? Math.round((completed / total) * 100) : 0,
          finalPassed: user.attempts.some((a) => a.exam.courseId === c.id && a.passed),
        };
      }),
      attempts: user.attempts.map((a) => ({
        id: a.id,
        exam: a.exam,
        score: a.score,
        correctCount: a.correctCount,
        totalCount: a.totalCount,
        passed: a.passed,
        assignedLevel: a.assignedLevel,
        finishedAt: a.finishedAt,
      })),
    });
  }),
);

router.patch(
  "/users/:id",
  validate(
    z.object({
      firstName: z.string().trim().min(2, "İsim en az 2 karakter olmalı.").max(50).optional(),
      lastName: z.string().trim().min(2, "Soyisim en az 2 karakter olmalı.").max(50).optional(),
      school: z.string().trim().max(120).nullable().optional(),
      role: z.enum(["STUDENT", "ADMIN"]).optional(),
      level: z.enum(["ALPHA", "BETA"]).nullable().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    if (id === req.user.id && req.body.role === "STUDENT") throw badRequest("Kendi admin yetkinizi kaldıramazsınız.");
    const data = { ...req.body };
    if (data.school === "") data.school = null;
    const user = await prisma.user.update({ where: { id }, data });
    res.json({ user: publicUser(user) });
  }),
);

/** Üyeyi ve ona ait ilerleme, sınav ve yorum kayıtlarını siler. Yazdığı blog yazıları kalır. */
router.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    if (id === req.user.id) throw badRequest("Kendi hesabınızı silemezsiniz.");
    await prisma.user.delete({ where: { id } });
    res.status(204).end();
  }),
);

/** Öğrencinin seviye sınavını sıfırlar; öğrenci sınava yeniden girebilir. */
router.post(
  "/users/:id/reset-placement",
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const [, user] = await prisma.$transaction([
      prisma.examAttempt.deleteMany({ where: { userId: id, exam: { type: "PLACEMENT" } } }),
      prisma.user.update({ where: { id }, data: { level: null } }),
    ]);
    res.json({ user: publicUser(user) });
  }),
);

router.get(
  "/comments",
  asyncHandler(async (_req, res) => {
    const comments = await prisma.comment.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: true, course: { select: { id: true, title: true } } },
    });
    res.json({
      comments: comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        author: authorName(c.user),
        course: c.course,
      })),
    });
  }),
);

router.delete(
  "/comments/:id",
  asyncHandler(async (req, res) => {
    await prisma.comment.delete({ where: { id: idParam(req.params.id) } });
    res.status(204).end();
  }),
);

export default router;
