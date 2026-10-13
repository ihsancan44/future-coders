// Uçtan uca test betiklerinin ortak yardımcıları (HTTP istekleri, adım kaydı, hazır öğrenci akışları).
import fs from "node:fs";
import "dotenv/config";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

export const BASE = (process.env.API_URL || "http://localhost:4000").replace(/\/$/, "");
export const SERVER_LOG = process.env.SERVER_LOG; // şifre sıfırlama bağlantısını okumak için (SMTP yoksa sunucu loga yazar)
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@futurecoders.dev";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin12345";
export const prisma = new PrismaClient();
export const run = Date.now().toString(36);

export const results = [];
let group = "";
/** Sonraki adımların hangi senaryo grubuna yazılacağını belirler. */
export function setGroup(name) {
  group = name;
  console.log(`\n${name}`);
  return name;
}

export class Fail extends Error {}
export function check(cond, msg) {
  if (!cond) throw new Fail(msg);
}
export function eq(actual, expected, what) {
  check(actual === expected, `${what}: beklenen ${JSON.stringify(expected)}, gelen ${JSON.stringify(actual)}`);
}

export async function step(id, title, expected, fn) {
  try {
    const actual = await fn();
    results.push({ group, id, title, expected, actual: actual ?? "", ok: true });
    console.log(`  ✓ ${id} ${title}`);
  } catch (err) {
    results.push({ group, id, title, expected, actual: err.message, ok: false });
    console.log(`  ✗ ${id} ${title}\n      ${err.message}`);
  }
}

export async function http(method, path, { token, body, form, raw } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (raw !== undefined) {
    // Bozuk ya da çok büyük gövdeler için: metin olduğu gibi JSON diye gönderilir.
    headers["Content-Type"] = "application/json";
    payload = raw;
  }
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, body: data };
}
export const get = (p, o) => http("GET", p, o);
export const post = (p, o) => http("POST", p, o);
export const put = (p, o) => http("PUT", p, o);
export const patch = (p, o) => http("PATCH", p, o);
export const del = (p, o) => http("DELETE", p, o);

export function status(res, expected, what = "HTTP durumu") {
  check(res.status === expected, `${what}: beklenen ${expected}, gelen ${res.status} ${JSON.stringify(res.body)?.slice(0, 200)}`);
}

// ---------- yardımcılar ----------
let regCount = 0;
export function newStudent(tag) {
  regCount += 1;
  return {
    firstName: tag,
    lastName: "Öğrenci",
    email: `${tag.toLowerCase()}-${run}-${regCount}@test.dev`,
    password: "Sifre12345",
    confirmPassword: "Sifre12345",
    birthDate: "2008-05-14",
    school: "Atatürk Anadolu Lisesi",
  };
}

export async function register(tag) {
  const data = newStudent(tag);
  const res = await post("/api/auth/register", { body: data });
  status(res, 201, "kayıt");
  return { ...data, token: res.body.token, user: res.body.user };
}

/**
 * Giriş/kayıt hız sınırına takılmamak için öğrenciyi doğrudan veritabanına yazar ve oturum anahtarını
 * sunucuyla aynı JWT_SECRET ile üretir. Şifresi her zaman "Sifre12345".
 */
export async function seedStudent(tag, level = null) {
  const data = newStudent(tag);
  const user = await prisma.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      school: data.school,
      birthDate: new Date(data.birthDate),
      level,
      passwordHash: await bcrypt.hash(data.password, 10),
    },
  });
  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
  return { ...data, token, user };
}

/** Sunucu logundaki son şifre sıfırlama bağlantısının anahtarı (SMTP yoksa sunucu e-postayı loga yazar). */
export async function lastResetToken() {
  if (!SERVER_LOG) return null;
  await new Promise((r) => setTimeout(r, 300));
  const log = fs.readFileSync(SERVER_LOG, "utf8");
  return [...log.matchAll(/reset-password\?token=([a-f0-9]+)/g)].at(-1)?.[1] ?? null;
}

/** Bir sınavın doğru şıklarını veritabanından okur. */
export async function answerKey(examId) {
  const questions = await prisma.question.findMany({
    where: { examId },
    orderBy: { order: "asc" },
    include: { options: { orderBy: { id: "asc" } } },
  });
  return questions.map((q) => ({
    questionId: q.id,
    right: q.options.find((o) => o.isCorrect).id,
    wrong: q.options.find((o) => !o.isCorrect).id,
  }));
}

/** İlk `correct` soruyu doğru, kalanları yanlış cevaplayan cevap listesi. */
export function answers(key, correct) {
  return key.map((k, i) => ({ questionId: k.questionId, optionId: i < correct ? k.right : k.wrong }));
}

export async function takePlacement(student, correct) {
  const start = await post("/api/exams/placement/start", { token: student.token });
  status(start, 201, "seviye sınavı başlatma");
  const key = await answerKey(start.body.exam.id);
  const res = await post(`/api/exams/attempts/${start.body.attempt.id}/submit`, {
    token: student.token,
    body: { answers: answers(key, correct) },
  });
  status(res, 200, "seviye sınavı gönderme");
  student.user = res.body.user;
  return res.body;
}

export async function completeAll(token, course) {
  let last;
  for (const l of course.lessons) {
    last = await post(`/api/courses/${course.id}/lessons/${l.id}/complete`, { token });
    status(last, 200, `ders ${l.id} tamamlama`);
  }
  return last.body.progress;
}

export async function takeFinal(token, courseId, correctRatio) {
  const start = await post(`/api/exams/courses/${courseId}/final/start`, { token });
  status(start, 201, "final başlatma");
  const key = await answerKey(start.body.exam.id);
  const res = await post(`/api/exams/attempts/${start.body.attempt.id}/submit`, {
    token,
    body: { answers: answers(key, Math.round(key.length * correctRatio)) },
  });
  status(res, 200, "final gönderme");
  return { start: start.body, result: res.body };
}

export const levelsOf = (courses) => [...new Set(courses.map((c) => c.level))].sort().join(",");

/** Sonuçları yazdırır, istenirse E2E_OUT dosyasına kaydeder ve çıkış kodunu ayarlar. */
export function runMain(main) {
  main()
    .catch((err) => {
      results.push({ group: "Betik", id: "X", title: "Beklenmeyen hata", expected: "", actual: err.stack, ok: false });
      console.error(err);
    })
    .finally(async () => {
      await prisma.$disconnect();
      const failed = results.filter((r) => !r.ok).length;
      console.log(`\n${results.length - failed}/${results.length} adım başarılı`);
      if (process.env.E2E_OUT) fs.writeFileSync(process.env.E2E_OUT, JSON.stringify(results, null, 2));
      process.exitCode = failed ? 1 : 0;
    });
}
