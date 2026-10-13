import crypto from "node:crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import { asyncHandler, badRequest, conflict, unauthorized } from "../lib/errors.js";
import { sendMail } from "../lib/mailer.js";
import { publicUser } from "../lib/serializers.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { birthDateField, emailField } from "../lib/validators.js";

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.isTest ? 10_000 : 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Çok fazla deneme yaptınız, lütfen biraz sonra tekrar deneyin." },
});

const password = z.string().min(8, "Şifre en az 8 karakter olmalı.").max(100);
const email = emailField;

const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, "İsim en az 2 karakter olmalı.").max(50),
    lastName: z.string().trim().min(2, "Soyisim en az 2 karakter olmalı.").max(50),
    email,
    password,
    confirmPassword: z.string(),
    birthDate: birthDateField,
    school: z.string().trim().min(2, "Okul adını girin.").max(120),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Şifreler eşleşmiyor.",
    path: ["confirmPassword"],
  });

router.post(
  "/register",
  limiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { confirmPassword: _ignored, password: plain, ...data } = req.body;
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw conflict("Bu e-posta adresiyle zaten bir hesap var.");
    const user = await prisma.user.create({
      data: { ...data, passwordHash: await bcrypt.hash(plain, 10) },
    });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  }),
);

router.post(
  "/login",
  limiter,
  validate(z.object({ email, password: z.string().min(1, "Şifrenizi girin.") })),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    // Hesap yoksa da şifre karşılaştırılır: cevap süresinden e-postanın kayıtlı olup olmadığı anlaşılmasın.
    const match = await bcrypt.compare(req.body.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !match) throw unauthorized("E-posta veya şifre hatalı.");
    res.json({ token: signToken(user), user: publicUser(user) });
  }),
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user) });
  }),
);

const profileSchema = z.object({
  firstName: z.string().trim().min(2).max(50).optional(),
  lastName: z.string().trim().min(2).max(50).optional(),
  school: z.string().trim().min(2).max(120).optional(),
  birthDate: birthDateField.optional(),
});

router.patch(
  "/me",
  requireAuth,
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({ where: { id: req.user.id }, data: req.body });
    res.json({ user: publicUser(user) });
  }),
);

router.post(
  "/change-password",
  requireAuth,
  validate(z.object({ currentPassword: z.string().min(1), newPassword: password })),
  asyncHandler(async (req, res) => {
    const ok = await bcrypt.compare(req.body.currentPassword, req.user.passwordHash);
    if (!ok) throw badRequest("Mevcut şifreniz hatalı.", { currentPassword: "Mevcut şifreniz hatalı." });
    // Diğer cihazlardaki oturumlar kapanır; bu cihaz yeni anahtarla açık kalır.
    const user = await prisma.user.update({
      where: { id: req.user.id },
      // Bekleyen "şifremi unuttum" bağlantısı da geçersiz olur.
      data: {
        passwordHash: await bcrypt.hash(req.body.newPassword, 10),
        tokenVersion: { increment: 1 },
        resetTokenHash: null,
        resetTokenExpires: null,
      },
    });
    res.json({ ok: true, token: signToken(user) });
  }),
);

const DUMMY_HASH = bcrypt.hashSync("codevia-olmayan-hesap", 10);

const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex");

router.post(
  "/forgot-password",
  limiter,
  validate(z.object({ email })),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.user.update({
        where: { id: user.id },
        data: { resetTokenHash: hashToken(token), resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000) },
      });
      const link = `${config.clientUrl}/reset-password?token=${token}`;
      // E-posta beklenmeden cevap verilir: kayıtlı adreste geç, kayıtsızda hızlı cevap hesap var mı bilgisini sızdırıyordu.
      // SMTP hatası da artık sadece kayıtlı adreslerde 500 vermiyor; loga yazılır.
      sendMail({
        to: user.email,
        subject: "Codevia şifre sıfırlama",
        text: `Merhaba ${user.firstName},\n\nŞifrenizi sıfırlamak için bu bağlantıyı açın (1 saat geçerli):\n${link}\n\nBu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.`,
      }).catch((err) => console.error("[mail] şifre sıfırlama e-postası gönderilemedi:", err.message));
      if (config.isTest) res.locals.resetToken = token;
    }
    // Hesap var mı yok mu bilgisini sızdırmamak için her zaman aynı cevap.
    res.json({
      message: "Bu e-posta adresine kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi.",
      ...(config.isTest && res.locals.resetToken ? { testToken: res.locals.resetToken } : {}),
    });
  }),
);

router.post(
  "/reset-password",
  limiter,
  validate(
    z
      .object({ token: z.string().min(10), password, confirmPassword: z.string() })
      .refine((d) => d.password === d.confirmPassword, { message: "Şifreler eşleşmiyor.", path: ["confirmPassword"] }),
  ),
  asyncHandler(async (req, res) => {
    // Bağlantı tek kullanımlık: kontrol ve güncelleme tek sorguda, aynı bağlantıyla aynı anda iki sıfırlama yapılamaz.
    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const { count } = await prisma.user.updateMany({
      where: { resetTokenHash: hashToken(req.body.token), resetTokenExpires: { gt: new Date() } },
      data: {
        passwordHash,
        resetTokenHash: null,
        resetTokenExpires: null,
        // Şifre başkasının elindeyse açık oturumları da kapanır.
        tokenVersion: { increment: 1 },
      },
    });
    if (!count) throw badRequest("Bağlantı geçersiz veya süresi dolmuş. Lütfen yeniden şifre sıfırlama isteyin.");
    res.json({ message: "Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz." });
  }),
);

export default router;
