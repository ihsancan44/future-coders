import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../lib/errors.js";

const router = Router();

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const student = { role: "STUDENT" };
    const [
      courseTotal,
      coursePublished,
      blogTotal,
      blogPublished,
      studentTotal,
      alpha,
      beta,
      bySchool,
      courses,
      placementAttempts,
      recentUsers,
    ] = await Promise.all([
      prisma.course.count(),
      prisma.course.count({ where: { published: true } }),
      prisma.blogPost.count(),
      prisma.blogPost.count({ where: { published: true } }),
      prisma.user.count({ where: student }),
      prisma.user.count({ where: { ...student, level: "ALPHA" } }),
      prisma.user.count({ where: { ...student, level: "BETA" } }),
      prisma.user.groupBy({
        by: ["school"],
        where: { ...student, school: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { school: "desc" } },
        take: 10,
      }),
      prisma.course.findMany({
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          level: true,
          published: true,
          _count: { select: { lessons: true, comments: true } },
          lessons: { select: { progress: { select: { userId: true } } } },
          finalExam: { select: { attempts: { where: { finishedAt: { not: null } }, select: { userId: true, passed: true } } } },
        },
      }),
      prisma.examAttempt.findMany({
        where: { exam: { type: "PLACEMENT" }, finishedAt: { not: null } },
        select: { score: true },
      }),
      prisma.user.findMany({
        where: { ...student, createdAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } },
        select: { createdAt: true },
      }),
    ]);

    const scoreBuckets = [0, 20, 40, 60, 80].map((from) => ({
      range: from === 80 ? "80-100" : `${from}-${from + 19}`,
      count: placementAttempts.filter((a) => a.score >= from && (from === 80 ? a.score <= 100 : a.score < from + 20)).length,
    }));

    const days = new Map();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
      days.set(d, 0);
    }
    for (const u of recentUsers) {
      const d = u.createdAt.toISOString().slice(0, 10);
      if (days.has(d)) days.set(d, days.get(d) + 1);
    }

    res.json({
      totals: {
        courses: courseTotal,
        publishedCourses: coursePublished,
        blogPosts: blogTotal,
        publishedBlogPosts: blogPublished,
        students: studentTotal,
      },
      levels: { ALPHA: alpha, BETA: beta, NONE: studentTotal - alpha - beta },
      schools: bySchool.map((s) => ({ school: s.school, count: s._count._all })),
      placementScores: scoreBuckets,
      registrations: [...days].map(([date, count]) => ({ date, count })),
      courses: courses.map((c) => {
        const learners = new Set(c.lessons.flatMap((l) => l.progress.map((p) => p.userId)));
        const attempts = c.finalExam?.attempts ?? [];
        const passedUsers = new Set(attempts.filter((a) => a.passed).map((a) => a.userId));
        return {
          id: c.id,
          title: c.title,
          level: c.level,
          published: c.published,
          lessons: c._count.lessons,
          comments: c._count.comments,
          learners: learners.size,
          finalAttempts: attempts.length,
          finalPassed: passedUsers.size,
        };
      }),
    });
  }),
);

export default router;
