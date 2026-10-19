import { Router } from "express";
import rateLimit from "express-rate-limit";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { HttpError, asyncHandler, badRequest } from "../lib/errors.js";
import { askAssistant, assistantEnabled } from "../lib/assistant.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { assertCourseAccess } from "../services/access.js";

const router = Router();

// Her soru ücretli bir yapay zekâ çağrısı: öğrenci başına 10 dakikada 30 soru.
const askLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: config.isTest ? 10_000 : 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => `ask|${req.user.id}`,
  message: { error: "Kısa sürede çok soru sordun. Birkaç dakika sonra tekrar dene." },
});

const SYSTEM = `Sen Codevia Asistan'sın. Codevia, üniversiteye hazırlanan 14-18 yaş arası öğrencilere yazılım öğreten bir platform.
İki işin var:
1. Öğrencinin izlediği ders videosunda ya da konuda anlamadığı yerleri açıklamak.
2. Konuyla ilgisi olmasa bile genel kodlama sorularına yardım etmek: herhangi bir programlama dili, hata mesajları, çalışmayan kod, algoritmalar, araçlar ve kavramlar.

Kurallar:
- Türkçe, kısa ve sade cevap ver. Önce bir iki cümleyle özü söyle, gerekirse küçük bir kod örneği ekle (Markdown kod bloğu ve dil adı).
- Öğrenci hata veren bir kod yapıştırırsa hatanın nedenini açıkla, nereye bakması gerektiğini göster ve düzeltmeyi adım adım anlat.
- Codevia'daki pratik sorularının ya da kurs sonu testinin cevabını doğrudan verme; ipucu ver, öğrencinin kendisinin bulmasına yardım et. Öğrenci cevabı bulduktan sonra açıklayabilirsin.
- Sadece yazılım, bilgisayar bilimi ve öğrenme konularında yardım et. Başka bir konu gelirse kibarca kodlamaya dön.
- Öğrenciden ad, adres, telefon, okul gibi kişisel bilgi isteme. Uygunsuz, tehlikeli veya yaşına uygun olmayan isteklere (zararlı yazılım, başkasının hesabına girme gibi) cevap verme ve bir öğretmene danışmasını öner.
- Emin olmadığın bir şeyi uydurma; bilmiyorsan söyle.`;

const chatSchema = z.object({
  lessonId: z.number().int().positive().optional(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000, "Mesaj en fazla 4000 karakter olabilir.") }))
    .min(1)
    .max(20, "Sohbet çok uzadı. Yeni bir sohbet başlat."),
});

/** Konunun özeti sistem istemine eklenir; öğrenci kursa erişemiyorsa eklenmez. */
async function lessonContext(user, lessonId) {
  if (!lessonId) return "";
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { course: true } });
  if (!lesson) return "";
  try {
    assertCourseAccess(user, lesson.course);
  } catch {
    return "";
  }
  const points = lesson.keyPoints.map((p) => `- ${p}`).join("\n");
  return [
    `\n\nÖğrencinin şu an açık olan dersi (soru bu dersle ilgili olabilir ama olmak zorunda değil): "${lesson.course.title}" kursu, "${lesson.title}" dersi.`,
    lesson.content && `Dersin anlatımı:\n${lesson.content.slice(0, 4000)}`,
    points && `Kısa özet:\n${points}`,
    lesson.codeExample && `Örnek kod:\n${lesson.codeExample.slice(0, 2000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

router.get("/status", (_req, res) => res.json({ enabled: assistantEnabled() }));

router.post(
  "/chat",
  requireAuth,
  askLimiter,
  validate(chatSchema),
  asyncHandler(async (req, res) => {
    if (!assistantEnabled()) {
      throw new HttpError(503, "Codevia Asistan henüz ayarlanmadı. Yöneticinin bir API anahtarı eklemesi gerekiyor.", undefined, "ASSISTANT_DISABLED");
    }
    const { messages, lessonId } = req.body;
    if (messages[0].role !== "user" || messages.at(-1).role !== "user") throw badRequest("Sohbet öğrencinin mesajıyla başlayıp bitmeli.");
    let reply;
    try {
      reply = await askAssistant({ system: SYSTEM + (await lessonContext(req.user, lessonId)), messages });
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) throw new HttpError(503, "Asistan şu an çok yoğun. Biraz sonra tekrar dene.", undefined, "ASSISTANT_BUSY");
      if (err instanceof Anthropic.AuthenticationError) throw new HttpError(503, "Asistanın API anahtarı geçersiz. Yöneticine haber ver.", undefined, "ASSISTANT_DISABLED");
      if (err instanceof Anthropic.APIError || err instanceof Anthropic.APIConnectionError) {
        throw new HttpError(503, "Asistana şu an ulaşılamıyor. Biraz sonra tekrar dene.", undefined, "ASSISTANT_BUSY");
      }
      throw err;
    }
    res.json({ reply: reply || "Bu soruya cevap veremiyorum. Konuyla ilgili başka bir şey sormak ister misin?" });
  }),
);

export default router;
