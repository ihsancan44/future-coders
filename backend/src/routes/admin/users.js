import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, badRequest } from "../../lib/errors.js";
import { idParam } from "../../lib/params.js";
import { authorName, publicUser } from "../../lib/serializers.js";
import { validate } from "../../middleware/validate.js";

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

router.patch(
  "/users/:id",
  validate(z.object({ role: z.enum(["STUDENT", "ADMIN"]).optional(), level: z.enum(["ALPHA", "BETA"]).nullable().optional() })),
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    if (id === req.user.id && req.body.role === "STUDENT") throw badRequest("Kendi admin yetkinizi kaldıramazsınız.");
    const user = await prisma.user.update({ where: { id }, data: req.body });
    res.json({ user: publicUser(user) });
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
