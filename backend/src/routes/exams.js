import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, notFound } from "../lib/errors.js";
import { idParam } from "../lib/params.js";
import { publicUser } from "../lib/serializers.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  attemptSummary,
  getFinalExamForCourse,
  getPlacementExam,
  publicExam,
  startAttempt,
  submitAttempt,
} from "../services/exams.js";

const router = Router();
router.use(requireAuth);

/** Seviye sınavı durumu: tamamlandıysa sonuç, değilse sınav bilgisi (soru içeriği olmadan). */
router.get(
  "/placement",
  asyncHandler(async (req, res) => {
    const last = await prisma.examAttempt.findFirst({
      where: { userId: req.user.id, exam: { type: "PLACEMENT" }, finishedAt: { not: null } },
      orderBy: { finishedAt: "desc" },
    });
    if (last || req.user.level) {
      return res.json({ status: "DONE", level: req.user.level, attempt: last ? attemptSummary(last) : null });
    }
    const exam = await getPlacementExam();
    res.json({
      status: "PENDING",
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        durationMinutes: exam.durationMinutes,
        questionCount: exam.questions.length,
      },
    });
  }),
);

router.post(
  "/placement/start",
  asyncHandler(async (req, res) => {
    const exam = await getPlacementExam();
    const attempt = await startAttempt(req.user, exam);
    res.status(201).json({ attempt: attemptSummary(attempt), exam: publicExam(exam) });
  }),
);

router.post(
  "/courses/:courseId/final/start",
  asyncHandler(async (req, res) => {
    const exam = await getFinalExamForCourse(req.user, idParam(req.params.courseId));
    const attempt = await startAttempt(req.user, exam);
    res.status(201).json({ attempt: attemptSummary(attempt), exam: publicExam(exam) });
  }),
);

const submitSchema = z.object({
  answers: z
    .array(z.object({ questionId: z.number().int().positive(), optionId: z.number().int().positive().nullable() }))
    .max(500),
});

router.post(
  "/attempts/:id/submit",
  validate(submitSchema),
  asyncHandler(async (req, res) => {
    const { attempt, courseReset } = await submitAttempt(req.user, idParam(req.params.id), req.body.answers);
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json({ attempt: attemptSummary(attempt), courseReset, user: publicUser(user) });
  }),
);

router.get(
  "/attempts/:id",
  asyncHandler(async (req, res) => {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: idParam(req.params.id) },
      include: { exam: { select: { id: true, type: true, title: true, courseId: true, passingScore: true } } },
    });
    if (!attempt || attempt.userId !== req.user.id) throw notFound("Sınav denemesi bulunamadı.");
    res.json({ attempt: attemptSummary(attempt), exam: attempt.exam });
  }),
);

router.get(
  "/my-attempts",
  asyncHandler(async (req, res) => {
    const attempts = await prisma.examAttempt.findMany({
      where: { userId: req.user.id, finishedAt: { not: null } },
      orderBy: { finishedAt: "desc" },
      include: { exam: { select: { id: true, type: true, title: true, courseId: true } } },
    });
    res.json({ attempts: attempts.map((a) => ({ ...attemptSummary(a), exam: a.exam })) });
  }),
);

export default router;
