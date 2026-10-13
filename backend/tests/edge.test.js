import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { answersFor, api, createCourse, createExam, createUser, resetDb } from "./helpers.js";

beforeEach(resetDb);

const student = {
  firstName: "Ayşe",
  lastName: "Yılmaz",
  email: "ayse@example.com",
  password: "Sifre12345",
  confirmPassword: "Sifre12345",
  birthDate: "2008-04-12",
  school: "Atatürk Anadolu Lisesi",
};

describe("oturumlar ve şifre", () => {
  it("şifre değişince eski token geçersiz olur, yanıttaki yeni token çalışır", async () => {
    const { auth } = await createUser({ level: "ALPHA" });
    const res = await api()
      .post("/api/auth/change-password")
      .set(auth)
      .send({ currentPassword: "Sifre12345", newPassword: "YeniSifre123" });
    expect(res.status).toBe(200);
    expect((await api().get("/api/auth/me").set(auth)).status).toBe(401);
    expect((await api().get("/api/auth/me").set({ Authorization: `Bearer ${res.body.token}` })).status).toBe(200);
  });

  it("şifre sıfırlanınca eski token geçersiz olur", async () => {
    const { user, auth } = await createUser();
    const forgot = await api().post("/api/auth/forgot-password").send({ email: user.email });
    const reset = await api()
      .post("/api/auth/reset-password")
      .send({ token: forgot.body.testToken, password: "Sifirla12345", confirmPassword: "Sifirla12345" });
    expect(reset.status).toBe(200);
    expect((await api().get("/api/auth/me").set(auth)).status).toBe(401);
  });

  it("Türkçe büyük İ ile yazılan e-posta düz i ile kaydedilir ve girişte eşleşir", async () => {
    const res = await api().post("/api/auth/register").send({ ...student, email: "İLAYDA@EXAMPLE.COM" });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("ilayda@example.com");
    const login = await api().post("/api/auth/login").send({ email: "İlayda@example.com", password: "Sifre12345" });
    expect(login.status).toBe(200);
  });

  it("takvimde olmayan veya gelecekteki doğum tarihi reddedilir", async () => {
    expect((await api().post("/api/auth/register").send({ ...student, birthDate: "2008-02-30" })).status).toBe(400);
    const { auth } = await createUser();
    expect((await api().patch("/api/auth/me").set(auth).send({ birthDate: "2999-01-01" })).status).toBe(400);
    expect((await api().patch("/api/auth/me").set(auth).send({ birthDate: "2008-02-29" })).status).toBe(200);
  });
});

describe("aynı anda gelen istekler", () => {
  it("seviye sınavı aynı anda iki kez başlatılırsa tek açık deneme oluşur", async () => {
    await createExam();
    const { user, auth } = await createUser();
    const list = await Promise.all([1, 2, 3].map(() => api().post("/api/exams/placement/start").set(auth)));
    expect(list.map((r) => r.status)).toEqual([201, 201, 201]);
    expect(new Set(list.map((r) => r.body.attempt.id)).size).toBe(1);
    expect(await prisma.examAttempt.count({ where: { userId: user.id, finishedAt: null } })).toBe(1);
  });

  it("aynı deneme iki kez gönderilirse ikincisi 409 alır, cevaplar bir kez kaydedilir", async () => {
    const exam = await createExam();
    const { auth } = await createUser();
    const start = await api().post("/api/exams/placement/start").set(auth);
    const body = { answers: answersFor(exam, 5) };
    const list = await Promise.all([1, 2].map(() => api().post(`/api/exams/attempts/${start.body.attempt.id}/submit`).set(auth).send(body)));
    expect(list.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await prisma.attemptAnswer.count({ where: { attemptId: start.body.attempt.id } })).toBe(5);
  });

  it("aynı ders aynı anda birkaç kez tamamlanırsa hata vermez", async () => {
    const { course } = await createCourse();
    const { auth } = await createUser({ level: "ALPHA" });
    const url = `/api/courses/${course.id}/lessons/${course.lessons[0].id}/complete`;
    const list = await Promise.all([1, 2, 3, 4].map(() => api().post(url).set(auth)));
    expect(list.map((r) => r.status)).toEqual([200, 200, 200, 200]);
  });
});

describe("sınav sırasında admin değişiklikleri", () => {
  it("silinen soru ve değişen şıklara verilen cevaplar sınavı engellemez", async () => {
    const exam = await createExam({ questions: 3 });
    const { auth } = await createUser();
    const start = await api().post("/api/exams/placement/start").set(auth);
    const old = answersFor(exam, 3);
    await prisma.question.delete({ where: { id: exam.questions[2].id } });
    await prisma.option.deleteMany({ where: { questionId: exam.questions[0].id } });
    await prisma.option.createMany({ data: [{ questionId: exam.questions[0].id, text: "Yeni", isCorrect: true }] });
    const res = await api().post(`/api/exams/attempts/${start.body.attempt.id}/submit`).set(auth).send({ answers: old });
    expect(res.status).toBe(200);
    expect(res.body.attempt).toMatchObject({ correctCount: 1, totalCount: 2 });
  });

  it("yayındaki sınavın son sorusu ve yayındaki kursun son dersi silinemez", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const exam = await createExam({ questions: 1 });
    expect((await api().delete(`/api/admin/exams/${exam.id}/questions/${exam.questions[0].id}`).set(admin.auth)).status).toBe(400);
    const { course } = await createCourse({ lessons: 1 });
    expect((await api().delete(`/api/admin/courses/${course.id}/lessons/${course.lessons[0].id}`).set(admin.auth)).status).toBe(400);
    await prisma.course.update({ where: { id: course.id }, data: { published: false } });
    expect((await api().delete(`/api/admin/courses/${course.id}/lessons/${course.lessons[0].id}`).set(admin.auth)).status).toBe(204);
  });

  it("düzenleme isteğindeki published alanı yayın kurallarını atlatamaz", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const empty = await prisma.exam.create({ data: { type: "PLACEMENT", title: "Boş" } });
    expect((await api().put(`/api/admin/exams/${empty.id}`).set(admin.auth).send({ published: true })).status).toBe(400);

    const first = await createExam();
    const second = await createExam({ published: false });
    expect((await api().put(`/api/admin/exams/${second.id}`).set(admin.auth).send({ published: true })).status).toBe(200);
    expect((await prisma.exam.findUnique({ where: { id: first.id } })).published).toBe(false);

    const course = { title: "Boş kurs", summary: "Özet", description: "Açıklama", category: "Test", level: "ALL" };
    expect((await api().post("/api/admin/courses").set(admin.auth).send({ ...course, published: true })).status).toBe(400);
    const created = await api().post("/api/admin/courses").set(admin.auth).send(course);
    expect((await api().put(`/api/admin/courses/${created.body.course.id}`).set(admin.auth).send({ published: true })).status).toBe(400);
  });
});

describe("tehlikeli ve bozuk girdiler", () => {
  it("video ve kapak görseline javascript: / data: adresi girilemez", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const { course } = await createCourse();
    const lesson = (videoUrl) => api().post(`/api/admin/courses/${course.id}/lessons`).set(admin.auth).send({ title: "Ders", videoUrl });
    expect((await lesson("javascript:alert(1)")).status).toBe(400);
    expect((await lesson("data:text/html,<script>alert(1)</script>")).status).toBe(400);
    expect((await lesson("https://youtu.be/CgkZ7MvWUAA")).status).toBe(201);
    expect((await lesson("/uploads/1-abc.mp4")).status).toBe(201);
    const cover = (coverImage) => api().put(`/api/admin/courses/${course.id}`).set(admin.auth).send({ coverImage });
    expect((await cover("javascript:alert(1)")).status).toBe(400);
    expect((await cover("/uploads/1-abc.png")).status).toBe(200);
    expect((await cover("")).body.course.coverImage).toBeNull();
  });

  it("1 MB'tan büyük gövde 413, NUL karakteri ve çok büyük kimlik 400 alır", async () => {
    const { course } = await createCourse();
    const { auth } = await createUser({ level: "ALPHA" });
    const big = await api().post(`/api/courses/${course.id}/comments`).set(auth).send({ content: "a".repeat(1_100_000) });
    expect(big.status).toBe(413);
    const nul = await api().post(`/api/courses/${course.id}/comments`).set(auth).send({ content: "merhaba\u0000dünya" });
    expect(nul.status).toBe(400);
    expect((await api().get("/api/courses/99999999999")).status).toBe(400);
  });

  it("aramada % ve _ joker karakter sayılmaz", async () => {
    await createCourse();
    expect((await api().get("/api/courses?search=%25")).body.courses).toHaveLength(0);
    expect((await api().get("/api/courses?search=_")).body.courses).toHaveLength(0);
    expect((await api().get("/api/courses?search=Kurs")).body.courses).toHaveLength(1);
  });
});

describe("sınav süresi sunucuda", () => {
  it("süre bittikten hemen sonra (otomatik gönderim) gelen cevaplar kabul edilir", async () => {
    const exam = await createExam();
    await prisma.exam.update({ where: { id: exam.id }, data: { durationMinutes: 10 } });
    const { auth } = await createUser();
    const start = await api().post("/api/exams/placement/start").set(auth);
    await prisma.examAttempt.update({ where: { id: start.body.attempt.id }, data: { startedAt: new Date(Date.now() - 10.5 * 60_000) } });
    const res = await api().post(`/api/exams/attempts/${start.body.attempt.id}/submit`).set(auth).send({ answers: answersFor(exam, 5) });
    expect(res.status).toBe(200);
  });
});

describe("4. tur düzeltmeleri", () => {
  it("geçme kararı yuvarlanmamış orana göre verilir", async () => {
    const exam = await createExam({ questions: 3, passingScore: 67 });
    const { auth } = await createUser();
    const start = await api().post("/api/exams/placement/start").set(auth);
    const res = await api().post(`/api/exams/attempts/${start.body.attempt.id}/submit`).set(auth).send({ answers: answersFor(exam, 2) });
    expect(res.body.attempt).toMatchObject({ score: 67, passed: false, assignedLevel: "ALPHA" });
  });

  it("öğrenci sınavdayken sınav yayından kalkarsa cevaplar puanlanmaz", async () => {
    const exam = await createExam();
    const { user, auth } = await createUser();
    const start = await api().post("/api/exams/placement/start").set(auth);
    await prisma.exam.update({ where: { id: exam.id }, data: { published: false } });
    const res = await api().post(`/api/exams/attempts/${start.body.attempt.id}/submit`).set(auth).send({ answers: answersFor(exam, 5) });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("EXAM_CHANGED");
    expect((await prisma.user.findUnique({ where: { id: user.id } })).level).toBeNull();
  });

  it("admin ders ilerlemesi oluşturamaz", async () => {
    const { course } = await createCourse();
    const admin = await createUser({ role: "ADMIN" });
    expect((await api().post(`/api/courses/${course.id}/lessons/${course.lessons[0].id}/complete`).set(admin.auth)).status).toBe(403);
  });

  it("sonucu olan sınav silinemez, yayındaki sınav silinemez, denemesi olan final başka kursa taşınamaz", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const { course, exam } = await createCourse({ withFinal: true });
    const other = (await createCourse()).course;
    expect((await api().delete(`/api/admin/exams/${exam.id}`).set(admin.auth)).status).toBe(409);
    const s = await createUser({ level: "ALPHA" });
    for (const l of course.lessons) await api().post(`/api/courses/${course.id}/lessons/${l.id}/complete`).set(s.auth);
    const start = await api().post(`/api/exams/courses/${course.id}/final/start`).set(s.auth);
    await api().post(`/api/exams/attempts/${start.body.attempt.id}/submit`).set(s.auth).send({ answers: answersFor(exam, 5) });
    await prisma.exam.update({ where: { id: exam.id }, data: { published: false } });
    expect((await api().delete(`/api/admin/exams/${exam.id}`).set(admin.auth)).status).toBe(409);
    expect((await api().put(`/api/admin/exams/${exam.id}`).set(admin.auth).send({ courseId: other.id })).status).toBe(409);
    const unused = await createExam({ published: false });
    expect((await api().delete(`/api/admin/exams/${unused.id}`).set(admin.auth)).status).toBe(204);
  });

  it("iki admin aynı anda birbirini öğrenci yapamaz, en az bir admin kalır", async () => {
    const a = await createUser({ role: "ADMIN" });
    const b = await createUser({ role: "ADMIN" });
    const list = await Promise.all([
      api().patch(`/api/admin/users/${b.user.id}`).set(a.auth).send({ role: "STUDENT" }),
      api().patch(`/api/admin/users/${a.user.id}`).set(b.auth).send({ role: "STUDENT" }),
    ]);
    expect(list.map((r) => r.status).sort()).toEqual([200, 400]);
    expect(await prisma.user.count({ where: { role: "ADMIN" } })).toBe(1);
  });

  it("şifre sıfırlama bağlantısı aynı anda iki kez kullanılamaz, şifre değişince geçersiz olur", async () => {
    const { user, auth } = await createUser();
    const forgot = await api().post("/api/auth/forgot-password").send({ email: user.email });
    const body = { token: forgot.body.testToken, password: "Sifirla12345", confirmPassword: "Sifirla12345" };
    const list = await Promise.all([1, 2].map(() => api().post("/api/auth/reset-password").send(body)));
    expect(list.map((r) => r.status).sort()).toEqual([200, 400]);

    const again = await api().post("/api/auth/forgot-password").send({ email: user.email });
    const fresh = await api().post("/api/auth/login").send({ email: user.email, password: "Sifirla12345" });
    await api()
      .post("/api/auth/change-password")
      .set({ Authorization: `Bearer ${fresh.body.token}` })
      .send({ currentPassword: "Sifirla12345", newPassword: "Degisti12345" });
    const late = await api().post("/api/auth/reset-password").send({ ...body, token: again.body.testToken });
    expect(late.status).toBe(400);
    expect(auth).toBeTruthy();
  });

  it("çok derin JSON 400, olmayan kursa ders eklemek 404 döner", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const deep = await api().post("/api/auth/login").set("Content-Type", "application/json").send("[".repeat(100000) + "]".repeat(100000));
    expect(deep.status).toBe(400);
    expect((await api().post("/api/admin/courses/999999/lessons").set(admin.auth).send({ title: "Ders" })).status).toBe(404);
  });

  it("'bana açık' filtresi açık bir sınıf filtresiyle kesişir", async () => {
    await createCourse({ level: "BETA" });
    await createCourse({ level: "ALPHA" });
    const { auth } = await createUser({ level: "ALPHA" });
    expect((await api().get("/api/courses?level=BETA&mine=true").set(auth)).body.courses).toHaveLength(0);
    expect((await api().get("/api/courses?level=ALPHA&mine=true").set(auth)).body.courses).toHaveLength(1);
  });
});

describe("yükleme temizliği", () => {
  it("bir günden eski ve hiçbir kayıtta kullanılmayan dosyalar silinir, kullanılanlar kalır", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const { config } = await import("../src/config.js");
    const { sweepOrphanUploads } = await import("../src/lib/uploads.js");
    await fs.mkdir(config.uploadDir, { recursive: true });
    const orphan = path.join(config.uploadDir, "1-temizlik-yetim.png");
    const used = path.join(config.uploadDir, "1-temizlik-kullanilan.png");
    const hidden = path.join(config.uploadDir, ".gitkeep");
    await fs.writeFile(orphan, "x");
    await fs.writeFile(used, "x");
    await fs.writeFile(hidden, "");
    const old = new Date(Date.now() - 2 * 24 * 3600 * 1000);
    await fs.utimes(orphan, old, old);
    await fs.utimes(used, old, old);
    await fs.utimes(hidden, old, old);
    await createCourse();
    await prisma.course.updateMany({ data: { coverImage: "/uploads/1-temizlik-kullanilan.png" } });
    await sweepOrphanUploads();
    await expect(fs.access(orphan)).rejects.toThrow();
    await expect(fs.access(used)).resolves.toBeUndefined();
    await expect(fs.access(hidden)).resolves.toBeUndefined();
    await fs.unlink(used);
  });
});

describe("son gözden geçirme", () => {
  it("taslağa başka sınavın soru/şıkkı yazılsa da süresi dolan deneme puanlanır, sayfalar bozulmaz", async () => {
    const placement = await createExam({ type: "PLACEMENT", questions: 2 });
    await prisma.exam.update({ where: { id: placement.id }, data: { durationMinutes: 20 } });
    const other = await createExam({ type: "PLACEMENT", questions: 1, published: false });
    const { auth } = await createUser();
    const start = await api().post("/api/exams/placement/start").set(auth);
    expect(start.status).toBe(201);
    const q = other.questions[0];
    const save = await api().put(`/api/exams/attempts/${start.body.attempt.id}/answers`).set(auth)
      .send({ answers: [{ questionId: q.id, optionId: q.options[0].id }, ...answersFor(placement, 1).slice(0, 1)] });
    expect(save.status).toBe(204);
    await prisma.examAttempt.update({ where: { id: start.body.attempt.id }, data: { startedAt: new Date(Date.now() - 3 * 3600 * 1000) } });
    const st = await api().get("/api/exams/placement").set(auth);
    expect(st.status).toBe(200);
    expect(st.body.status).toBe("DONE");
    expect(st.body.attempt.correctCount).toBe(1);
  });

  it("olmayan hesapla yapılan girişte şifre ne olursa olsun 401 döner", async () => {
    const res = await api().post("/api/auth/login").send({ email: "kimse@test.dev", password: "codevia-olmayan-hesap" });
    expect(res.status).toBe(401);
  });
});
