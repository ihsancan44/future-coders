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
