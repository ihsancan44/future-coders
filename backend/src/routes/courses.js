import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, forbidden, notFound } from "../lib/errors.js";
import { idParam } from "../lib/params.js";
import { authorName } from "../lib/serializers.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { likeText } from "../lib/validators.js";
import { assertCourseAccess, courseProgress, getAccessibleCourse, progressInfo } from "../services/access.js";

const router = Router();

/** Kullanıcı bu kursu açabilir mi? Açamıyorsa nedenini döndürür. */
function accessFor(user, course) {
  try {
    assertCourseAccess(user, course);
    return { canAccess: true, reason: null };
  } catch (err) {
    return { canAccess: false, reason: err.code || (user ? "FORBIDDEN" : "LOGIN_REQUIRED"), message: err.message };
  }
}

function courseCard(course, user) {
  const lessons = course.lessons || [];
  return {
    id: course.id,
    title: course.title,
    summary: course.summary,
    category: course.category,
    coverImage: course.coverImage,
    level: course.level,
    lessonCount: lessons.length,
    totalMinutes: lessons.reduce((sum, l) => sum + l.durationMinutes, 0),
    commentCount: course._count?.comments ?? 0,
    studentCount: course._studentCount ?? 0,
    createdAt: course.createdAt,
    access: accessFor(user, course),
    // Giriş yapmış öğrenci için: kursun yüzde kaçını bitirdi, final testini geçti mi.
    ...(course._progress ? { progress: course._progress, finalPassed: course._finalPassed } : {}),
  };
}

const listQuery = z.object({
  level: z.enum(["ALPHA", "BETA", "ALL"]).optional(),
  category: z.string().trim().optional(),
  search: z.string().trim().optional(),
  sort: z.enum(["new", "popular"]).default("new"),
  mine: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

router.get(
  "/",
  optionalAuth,
  validate(listQuery, "query"),
  asyncHandler(async (req, res) => {
    const { level, category, search, sort, mine, limit } = req.query;
    const where = { published: true };
    if (level) where.level = level;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: likeText(search), mode: "insensitive" } },
        { summary: { contains: likeText(search), mode: "insensitive" } },
      ];
    }
    if (mine === "true" && req.user?.level) where.level = { in: ["ALL", req.user.level] };

    const courses = await prisma.course.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { lessons: { select: { id: true, durationMinutes: true } }, _count: { select: { comments: true } } },
    });

    // Popülerlik: kursta en az bir ders tamamlamış farklı öğrenci sayısı + yorum sayısı.
    const students = await prisma.lessonProgress.findMany({
      where: { lesson: { courseId: { in: courses.map((c) => c.id) } } },
      select: { userId: true, lesson: { select: { courseId: true } } },
      distinct: ["userId", "lessonId"],
    });
    const perCourse = new Map();
    for (const s of students) {
      const set = perCourse.get(s.lesson.courseId) || new Set();
      set.add(s.userId);
      perCourse.set(s.lesson.courseId, set);
    }
    for (const c of courses) c._studentCount = perCourse.get(c.id)?.size ?? 0;

    if (req.user && req.user.role !== "ADMIN") {
      const [mineDone, passed] = await Promise.all([
        prisma.lessonProgress.findMany({
          where: { userId: req.user.id, lesson: { courseId: { in: courses.map((c) => c.id) } } },
          select: { lesson: { select: { courseId: true } } },
        }),
        prisma.examAttempt.findMany({
          where: { userId: req.user.id, passed: true, exam: { type: "FINAL" } },
          select: { exam: { select: { courseId: true } } },
        }),
      ]);
      const done = new Map();
      for (const r of mineDone) done.set(r.lesson.courseId, (done.get(r.lesson.courseId) || 0) + 1);
      const passedIds = new Set(passed.map((a) => a.exam.courseId));
      for (const c of courses) {
        c._progress = progressInfo(done.get(c.id) || 0, c.lessons.length);
        c._finalPassed = passedIds.has(c.id);
      }
    }

    if (sort === "popular") {
      courses.sort(
        (a, b) => b._studentCount + b._count.comments - (a._studentCount + a._count.comments) || b.id - a.id,
      );
    }
    const categories = await prisma.course.findMany({
      where: { published: true },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    });

    res.json({
      courses: (limit ? courses.slice(0, limit) : courses).map((c) => courseCard(c, req.user)),
      categories: categories.map((c) => c.category),
    });
  }),
);

router.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        lessons: { orderBy: { order: "asc" } },
        finalExam: { select: { id: true, published: true, passingScore: true, durationMinutes: true, _count: { select: { questions: true } } } },
        _count: { select: { comments: true } },
      },
    });
    if (!course || (!course.published && req.user?.role !== "ADMIN")) throw notFound("Kurs bulunamadı.");

    const access = accessFor(req.user, course);
    let completedIds = [];
    let progress = null;
    let finalAttempts = [];
    if (req.user && access.canAccess) {
      const rows = await prisma.lessonProgress.findMany({
        where: { userId: req.user.id, lesson: { courseId: id } },
        select: { lessonId: true },
      });
      completedIds = rows.map((r) => r.lessonId);
      progress = await courseProgress(req.user.id, id);
      if (course.finalExam) {
        finalAttempts = await prisma.examAttempt.findMany({
          where: { userId: req.user.id, examId: course.finalExam.id, finishedAt: { not: null } },
          orderBy: { finishedAt: "desc" },
          select: { id: true, score: true, passed: true, finishedAt: true },
        });
      }
    }

    const final = course.finalExam;
    res.json({
      course: {
        ...courseCard(course, req.user),
        description: course.description,
        published: course.published,
        lessons: course.lessons.map((l) => ({
          id: l.id,
          order: l.order,
          title: l.title,
          durationMinutes: l.durationMinutes,
          completed: completedIds.includes(l.id),
          // İçerik ve video sadece erişimi olanlara gider.
          ...(access.canAccess ? { content: l.content, videoUrl: l.videoUrl } : {}),
        })),
        finalExam:
          final && final.published && final._count.questions > 0
            ? {
                id: final.id,
                passingScore: final.passingScore,
                durationMinutes: final.durationMinutes,
                questionCount: final._count.questions,
                attempts: finalAttempts,
                passed: finalAttempts.some((a) => a.passed),
              }
            : null,
        progress,
      },
    });
  }),
);

router.post(
  "/:id/lessons/:lessonId/complete",
  requireAuth,
  asyncHandler(async (req, res) => {
    const courseId = idParam(req.params.id);
    const lessonId = idParam(req.params.lessonId);
    await getAccessibleCourse(req.user, courseId);
    const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, courseId } });
    if (!lesson) throw notFound("Ders bulunamadı.");
    // Aynı anda gelen iki işaretleme çakışmasın diye "varsa dokunma" (ON CONFLICT DO NOTHING).
    await prisma.lessonProgress.createMany({ data: [{ userId: req.user.id, lessonId }], skipDuplicates: true });
    res.json({ progress: await courseProgress(req.user.id, courseId) });
  }),
);

router.delete(
  "/:id/lessons/:lessonId/complete",
  requireAuth,
  asyncHandler(async (req, res) => {
    const courseId = idParam(req.params.id);
    const lessonId = idParam(req.params.lessonId);
    await getAccessibleCourse(req.user, courseId);
    await prisma.lessonProgress.deleteMany({ where: { userId: req.user.id, lessonId, lesson: { courseId } } });
    res.json({ progress: await courseProgress(req.user.id, courseId) });
  }),
);

function publicComment(c) {
  return {
    id: c.id,
    content: c.content,
    createdAt: c.createdAt,
    author: { id: c.user.id, name: authorName(c.user), role: c.user.role },
  };
}

router.get(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    const courseId = idParam(req.params.id);
    const course = await prisma.course.findFirst({ where: { id: courseId, published: true } });
    if (!course) throw notFound("Kurs bulunamadı.");
    const comments = await prisma.comment.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });
    res.json({ comments: comments.map(publicComment) });
  }),
);

router.post(
  "/:id/comments",
  requireAuth,
  validate(z.object({ content: z.string().trim().min(2, "Yorum en az 2 karakter olmalı.").max(1000, "Yorum en fazla 1000 karakter olabilir.") })),
  asyncHandler(async (req, res) => {
    const courseId = idParam(req.params.id);
    await getAccessibleCourse(req.user, courseId);
    const comment = await prisma.comment.create({
      data: { courseId, userId: req.user.id, content: req.body.content },
      include: { user: true },
    });
    res.status(201).json({ comment: publicComment(comment) });
  }),
);

router.delete(
  "/:id/comments/:commentId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const commentId = idParam(req.params.commentId);
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.courseId !== idParam(req.params.id)) throw notFound("Yorum bulunamadı.");
    if (comment.userId !== req.user.id && req.user.role !== "ADMIN") throw forbidden("Sadece kendi yorumunuzu silebilirsiniz.");
    await prisma.comment.delete({ where: { id: commentId } });
    res.status(204).end();
  }),
);

export default router;
