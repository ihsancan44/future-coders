import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../lib/errors.js";
import { likeText } from "../../lib/validators.js";
import { validate } from "../../middleware/validate.js";

const router = Router();

/** Tüm kursların dersleri ve videoları; video yönetimi sayfası için. */
router.get(
  "/videos",
  validate(
    z.object({
      courseId: z.coerce.number().int().positive().optional(),
      video: z.enum(["UPLOADED", "LINK", "NONE"]).optional(),
      search: z.string().trim().optional(),
    }),
    "query",
  ),
  asyncHandler(async (req, res) => {
    const { courseId, video, search } = req.query;
    const where = {};
    if (courseId) where.courseId = courseId;
    if (search) where.title = { contains: likeText(search), mode: "insensitive" };
    if (video === "NONE") where.videoUrl = null;
    if (video === "UPLOADED") where.videoUrl = { startsWith: "/uploads/" };
    if (video === "LINK") where.AND = [{ videoUrl: { not: null } }, { NOT: { videoUrl: { startsWith: "/uploads/" } } }];
    const lessons = await prisma.lesson.findMany({
      where,
      orderBy: [{ course: { title: "asc" } }, { order: "asc" }],
      include: { course: { select: { id: true, title: true, published: true } } },
    });
    res.json({ lessons });
  }),
);

export default router;
