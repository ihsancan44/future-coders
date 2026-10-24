import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { config } from "../config.js";
import { asyncHandler } from "../lib/errors.js";
import { availableServerLanguages, runCode } from "../lib/codeRunner.js";
import { LANGUAGE_KEYS } from "../data/languages.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// Derleme servisleri ücretsiz ve herkesle paylaşılıyor: öğrenci başına dakikada 20 çalıştırma yeterli.
const runLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: config.isTest ? 10_000 : 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => `run|${req.user.id}`,
  message: { error: "Çok sık çalıştırdın. Bir dakika bekleyip tekrar dene." },
});

/** Sunucuda derlenen dillerden şu an kullanılabilenler (null: servise ulaşılamadı). */
router.get(
  "/languages",
  asyncHandler(async (_req, res) => {
    res.json({ enabled: config.codeRunners.order.length > 0, server: await availableServerLanguages() });
  }),
);

router.post(
  "/run",
  requireAuth,
  runLimiter,
  validate(
    z.object({
      language: z.enum(LANGUAGE_KEYS, { errorMap: () => ({ message: "Geçerli bir dil seçin." }) }),
      code: z.string().min(1, "Çalıştırılacak kod boş.").max(64_000, "Kod en fazla 64 bin karakter olabilir."),
      stdin: z.string().max(16_000).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    res.json(await runCode(req.body));
  }),
);

export default router;
