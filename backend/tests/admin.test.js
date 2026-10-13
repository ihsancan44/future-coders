import { beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma.js";
import { api, createCourse, createExam, createUser, resetDb } from "./helpers.js";

beforeEach(resetDb);

describe("admin yetkisi", () => {
  it("öğrenci ve misafir admin API'sine erişemez", async () => {
    const { auth } = await createUser({ level: "ALPHA" });
    expect((await api().get("/api/admin/stats")).status).toBe(401);
    expect((await api().get("/api/admin/stats").set(auth)).status).toBe(403);
  });
});

describe("kurs yönetimi", () => {
  it("kurs ekler, ders ekler, yayınlar, sıralar, günceller ve siler", async () => {
    const { auth } = await createUser({ role: "ADMIN" });
    const created = await api()
      .post("/api/admin/courses")
      .set(auth)
      .send({ title: "Yeni Kurs", summary: "Kısa özet", description: "Uzun açıklama", category: "Backend", level: "BETA" });
    expect(created.status).toBe(201);
    const id = created.body.course.id;
    expect(created.body.course.published).toBe(false);

    const noLesson = await api().patch(`/api/admin/courses/${id}/publish`).set(auth).send({ published: true });
    expect(noLesson.status).toBe(400);

    const l1 = await api().post(`/api/admin/courses/${id}/lessons`).set(auth).send({ title: "Giriş", content: "a", videoUrl: "https://youtu.be/abc", durationMinutes: 5 });
    const l2 = await api().post(`/api/admin/courses/${id}/lessons`).set(auth).send({ title: "Devam", content: "b", videoUrl: "" });
    expect(l2.body.lesson).toMatchObject({ order: 2, videoUrl: null });

    const order = await api().put(`/api/admin/courses/${id}/lessons-order`).set(auth).send({ lessonIds: [l2.body.lesson.id, l1.body.lesson.id] });
    expect(order.body.lessons.map((l) => l.title)).toEqual(["Devam", "Giriş"]);

    const pub = await api().patch(`/api/admin/courses/${id}/publish`).set(auth).send({ published: true });
    expect(pub.body.course.published).toBe(true);
    expect((await api().get("/api/courses")).body.courses).toHaveLength(1);

    const upd = await api().put(`/api/admin/courses/${id}`).set(auth).send({ title: "Güncel Kurs" });
    expect(upd.body.course.title).toBe("Güncel Kurs");

    expect((await api().delete(`/api/admin/courses/${id}`).set(auth)).status).toBe(204);
    expect((await api().get("/api/admin/courses").set(auth)).body.courses).toHaveLength(0);
  });

  it("eksik alanlarda Türkçe alan hataları döner", async () => {
    const { auth } = await createUser({ role: "ADMIN" });
    const res = await api().post("/api/admin/courses").set(auth).send({ title: "a" });
    expect(res.status).toBe(400);
    expect(res.body.fields.title).toBe("Başlık en az 3 karakter olmalı.");
  });
});

describe("blog yönetimi", () => {
  it("yazı ekler, yayınlar, gizler ve siler", async () => {
    const { auth } = await createUser({ role: "ADMIN" });
    const post = await api().post("/api/admin/blog").set(auth).send({ title: "Yol haritası", summary: "Özet", content: "İçerik", tag: "Yol Haritası" });
    expect(post.status).toBe(201);
    const id = post.body.post.id;
    expect((await api().get("/api/blog")).body.posts).toHaveLength(0);
    await api().patch(`/api/admin/blog/${id}/publish`).set(auth).send({ published: true });
    const pub = await api().get(`/api/blog/${id}`);
    expect(pub.body.post).toMatchObject({ title: "Yol haritası", content: "İçerik" });
    await api().put(`/api/admin/blog/${id}`).set(auth).send({ title: "Yeni başlık" });
    await api().patch(`/api/admin/blog/${id}/publish`).set(auth).send({ published: false });
    expect((await api().get(`/api/blog/${id}`)).status).toBe(404);
    expect((await api().delete(`/api/admin/blog/${id}`).set(auth)).status).toBe(204);
  });
});

describe("sınav yönetimi", () => {
  it("soru ekler, tek doğru cevap kuralını uygular, yayınlar ve tek seviye sınavı yayında tutar", async () => {
    const { auth } = await createUser({ role: "ADMIN" });
    const old = await createExam();
    const exam = await api().post("/api/admin/exams").set(auth).send({ type: "PLACEMENT", title: "Yeni seviye sınavı" });
    const id = exam.body.exam.id;

    expect((await api().patch(`/api/admin/exams/${id}/publish`).set(auth).send({ published: true })).status).toBe(400);

    const twoCorrect = await api().post(`/api/admin/exams/${id}/questions`).set(auth).send({
      text: "Soru?",
      options: [{ text: "A", isCorrect: true }, { text: "B", isCorrect: true }],
    });
    expect(twoCorrect.status).toBe(400);

    const q = await api().post(`/api/admin/exams/${id}/questions`).set(auth).send({
      text: "2 + 2 kaçtır?",
      options: [{ text: "3", isCorrect: false }, { text: "4", isCorrect: true }],
    });
    expect(q.status).toBe(201);

    const edit = await api().put(`/api/admin/exams/${id}/questions/${q.body.question.id}`).set(auth).send({
      text: "2 + 3 kaçtır?",
      options: [{ text: "5", isCorrect: true }, { text: "6", isCorrect: false }, { text: "7", isCorrect: false }],
    });
    expect(edit.body.question.options).toHaveLength(3);

    await api().patch(`/api/admin/exams/${id}/publish`).set(auth).send({ published: true });
    const list = (await api().get("/api/admin/exams?type=PLACEMENT").set(auth)).body.exams;
    expect(list.find((e) => e.id === old.id).published).toBe(false);
    expect(list.find((e) => e.id === id).published).toBe(true);
  });

  it("final sınavı kurs ister ve kurs başına bir tane olur", async () => {
    const { auth } = await createUser({ role: "ADMIN" });
    const { course } = await createCourse();
    expect((await api().post("/api/admin/exams").set(auth).send({ type: "FINAL", title: "Final" })).status).toBe(400);
    expect((await api().post("/api/admin/exams").set(auth).send({ type: "FINAL", title: "Final", courseId: course.id })).status).toBe(201);
    expect((await api().post("/api/admin/exams").set(auth).send({ type: "FINAL", title: "Final 2", courseId: course.id })).status).toBe(409);
  });
});

describe("istatistik ve kullanıcılar", () => {
  it("sayıları ve sınıf dağılımını döndürür", async () => {
    const { auth } = await createUser({ role: "ADMIN" });
    await createUser({ level: "ALPHA", school: "A Lisesi" });
    await createUser({ level: "ALPHA", school: "A Lisesi" });
    await createUser({ level: "BETA", school: "B Lisesi" });
    await createUser({ school: "B Lisesi" });
    await createCourse();
    await createCourse({ published: false });

    const res = await api().get("/api/admin/stats").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.totals).toMatchObject({ courses: 2, publishedCourses: 1, students: 4 });
    expect(res.body.levels).toEqual({ ALPHA: 2, BETA: 1, NONE: 1 });
    expect(res.body.schools).toEqual(expect.arrayContaining([{ school: "A Lisesi", count: 2 }, { school: "B Lisesi", count: 2 }]));
    expect(res.body.registrations).toHaveLength(30);
  });

  it("öğrencinin seviye sınavını sıfırlar", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const { user } = await createUser({ level: "BETA" });
    const res = await api().post(`/api/admin/users/${user.id}/reset-placement`).set(admin.auth);
    expect(res.body.user.level).toBeNull();
  });

  it("admin kendi yetkisini kaldıramaz", async () => {
    const { user, auth } = await createUser({ role: "ADMIN" });
    expect((await api().patch(`/api/admin/users/${user.id}`).set(auth).send({ role: "STUDENT" })).status).toBe(400);
  });

  it("sadece görsel yükler", async () => {
    const { auth } = await createUser({ role: "ADMIN" });
    const png = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
    const ok = await api().post("/api/admin/uploads").set(auth).attach("file", png, { filename: "a.png", contentType: "image/png" });
    expect(ok.status).toBe(201);
    expect(ok.body.url).toMatch(/^\/uploads\/.+\.png$/);
    const bad = await api().post("/api/admin/uploads").set(auth).attach("file", Buffer.from("x"), { filename: "a.txt", contentType: "text/plain" });
    expect(bad.status).toBe(400);
  });
});

describe("video yönetimi", () => {
  const uploadPath = (url) => path.join(process.env.UPLOAD_DIR, path.basename(url));

  it("video yükler, derse bağlar, değiştirince ve silince eski dosyayı kaldırır", async () => {
    const { auth } = await createUser({ role: "ADMIN" });
    const { course } = await createCourse();
    const lessonId = course.lessons[0].id;

    const wrong = await api().post("/api/admin/uploads/video").set(auth).attach("file", Buffer.from("x"), { filename: "a.txt", contentType: "text/plain" });
    expect(wrong.status).toBe(400);

    const up = await api().post("/api/admin/uploads/video").set(auth).attach("file", Buffer.from("video"), { filename: "ders.mp4", contentType: "video/mp4" });
    expect(up.status).toBe(201);
    expect(up.body.url).toMatch(/^\/uploads\/.+\.mp4$/);
    expect(fs.existsSync(uploadPath(up.body.url))).toBe(true);

    const set = await api().put(`/api/admin/courses/${course.id}/lessons/${lessonId}`).set(auth).send({ videoUrl: up.body.url, title: "Yeni başlık" });
    expect(set.body.lesson).toMatchObject({ videoUrl: up.body.url, title: "Yeni başlık" });

    const bad = await api().put(`/api/admin/courses/${course.id}/lessons/${lessonId}`).set(auth).send({ videoUrl: "/uploads/../x" });
    expect(bad.status).toBe(400);

    const list = await api().get("/api/admin/videos?video=UPLOADED").set(auth);
    expect(list.body.lessons).toHaveLength(1);
    expect(list.body.lessons[0].course.title).toBe(course.title);
    expect((await api().get("/api/admin/videos?video=NONE").set(auth)).body.lessons).toHaveLength(1);

    await api().put(`/api/admin/courses/${course.id}/lessons/${lessonId}`).set(auth).send({ videoUrl: "https://youtu.be/abc" });
    expect(fs.existsSync(uploadPath(up.body.url))).toBe(false);

    const up2 = await api().post("/api/admin/uploads/video").set(auth).attach("file", Buffer.from("video"), { filename: "b.webm", contentType: "video/webm" });
    await api().put(`/api/admin/courses/${course.id}/lessons/${lessonId}`).set(auth).send({ videoUrl: up2.body.url });
    expect((await api().delete(`/api/admin/courses/${course.id}/lessons/${lessonId}`).set(auth)).status).toBe(204);
    expect(fs.existsSync(uploadPath(up2.body.url))).toBe(false);
  });
});

describe("üye yönetimi", () => {
  it("üye detayını gösterir, bilgilerini günceller ve üyeyi siler", async () => {
    const { user: admin, auth } = await createUser({ role: "ADMIN" });
    const { user } = await createUser({ level: "ALPHA" });
    const { course } = await createCourse();
    await prisma.lessonProgress.create({ data: { userId: user.id, lessonId: course.lessons[0].id } });

    const detail = await api().get(`/api/admin/users/${user.id}`).set(auth);
    expect(detail.status).toBe(200);
    expect(detail.body.user).toMatchObject({ id: user.id, level: "ALPHA" });
    expect(detail.body.user.passwordHash).toBeUndefined();
    expect(detail.body.courses).toEqual([expect.objectContaining({ id: course.id, completed: 1, total: 2, percent: 50, finalPassed: false })]);

    const upd = await api().patch(`/api/admin/users/${user.id}`).set(auth).send({ firstName: "Ayşe", school: "" });
    expect(upd.body.user).toMatchObject({ firstName: "Ayşe", school: null });

    expect((await api().delete(`/api/admin/users/${admin.id}`).set(auth)).status).toBe(400);
    expect((await api().delete(`/api/admin/users/${user.id}`).set(auth)).status).toBe(204);
    expect((await api().get(`/api/admin/users/${user.id}`).set(auth)).status).toBe(404);
  });
});
