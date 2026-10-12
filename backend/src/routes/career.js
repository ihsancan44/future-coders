import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, forbidden, notFound } from "../lib/errors.js";
import { publicUser } from "../lib/serializers.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { CAREERS, CAREER_KEYS, findCareer } from "../data/careers.js";

const router = Router();

export const FINAL_REQUIRED = "FINAL_REQUIRED";

/** Final testini geçtiği kurslar; alan seçimi en az bir tane gerektirir. */
async function passedCourses(userId) {
  const attempts = await prisma.examAttempt.findMany({
    where: { userId, passed: true, exam: { type: "FINAL" } },
    distinct: ["examId"],
    select: { exam: { select: { course: { select: { id: true, title: true } } } } },
  });
  return attempts.map((a) => a.exam.course).filter(Boolean);
}

const summary = ({ stages, ...career }) => ({ ...career, stageCount: stages.length });

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const passed = await passedCourses(req.user.id);
    res.json({
      fields: CAREERS.map(summary),
      current: req.user.careerField,
      eligible: passed.length > 0,
      passedCourses: passed,
    });
  }),
);

router.get(
  "/:key",
  asyncHandler(async (req, res) => {
    const career = findCareer(req.params.key);
    if (!career) throw notFound("Bu alan bulunamadı.");
    res.json({ career });
  }),
);

router.put(
  "/",
  requireAuth,
  validate(z.object({ field: z.enum(CAREER_KEYS) })),
  asyncHandler(async (req, res) => {
    if (req.user.role === "ADMIN") throw forbidden("Alan seçimi öğrenciler içindir.");
    if ((await passedCourses(req.user.id)).length === 0) {
      throw forbidden("Alan seçmek için önce bir kursun final testini geçmelisin.", FINAL_REQUIRED);
    }
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { careerField: req.body.field, careerChosenAt: new Date() },
    });
    res.json({ user: publicUser(user) });
  }),
);

export default router;
