import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { answersFor, api, createCourse, createExam, createUser, resetDb } from "./helpers.js";

beforeEach(resetDb);

describe("seviye sınavı", () => {
  it("sorular doğru cevap bilgisi olmadan gelir", async () => {
    await createExam();
    const { auth } = await createUser();
    const res = await api().post("/api/exams/placement/start").set(auth);
    expect(res.status).toBe(201);
    expect(res.body.exam.questions[0].options[0]).toEqual({ id: expect.any(Number), text: "Doğru" });
    expect(JSON.stringify(res.body)).not.toContain("isCorrect");
  });

  it("%60 ve üzeri BETA, altı ALPHA atar", async () => {
    const exam = await createExam({ questions: 5, passingScore: 60 });
    const cases = [
      [3, 60, "BETA"],
      [2, 40, "ALPHA"],
      [5, 100, "BETA"],
      [0, 0, "ALPHA"],
    ];
    for (const [correct, score, level] of cases) {
      const { auth } = await createUser();
      const start = await api().post("/api/exams/placement/start").set(auth);
      const res = await api()
        .post(`/api/exams/attempts/${start.body.attempt.id}/submit`)
        .set(auth)
        .send({ answers: answersFor(exam, correct) });
      expect(res.status).toBe(200);
      expect(res.body.attempt).toMatchObject({ score, correctCount: correct, totalCount: 5, assignedLevel: level });
      expect(res.body.user.level).toBe(level);
    }
  });

  it("boş bırakılan sorular yanlış sayılır", async () => {
    const exam = await createExam({ questions: 4 });
    const { auth } = await createUser();
    const start = await api().post("/api/exams/placement/start").set(auth);
    const answers = [{ questionId: exam.questions[0].id, optionId: exam.questions[0].options[0].id }];
    const res = await api().post(`/api/exams/attempts/${start.body.attempt.id}/submit`).set(auth).send({ answers });
    expect(res.body.attempt).toMatchObject({ score: 25, assignedLevel: "ALPHA" });
  });

  it("sınav bir kez çözülür; tekrar başlatma ve tekrar gönderme reddedilir", async () => {
    const exam = await createExam();
    const { auth } = await createUser();
    const start = await api().post("/api/exams/placement/start").set(auth);
    const again = await api().post("/api/exams/placement/start").set(auth);
    expect(again.body.attempt.id).toBe(start.body.attempt.id); // yarım kalan deneme devam eder

    await api().post(`/api/exams/attempts/${start.body.attempt.id}/submit`).set(auth).send({ answers: answersFor(exam, 5) });
    expect((await api().post(`/api/exams/attempts/${start.body.attempt.id}/submit`).set(auth).send({ answers: [] })).status).toBe(409);
    expect((await api().post("/api/exams/placement/start").set(auth)).status).toBe(409);

    const status = await api().get("/api/exams/placement").set(auth);
    expect(status.body).toMatchObject({ status: "DONE", level: "BETA" });
  });

  it("başkasının denemesine cevap gönderilemez, başka sınavın sorusu kabul edilmez", async () => {
    const exam = await createExam();
    const other = await createExam({ published: false });
    const a = await createUser();
    const b = await createUser();
    const start = await api().post("/api/exams/placement/start").set(a.auth);
    expect((await api().post(`/api/exams/attempts/${start.body.attempt.id}/submit`).set(b.auth).send({ answers: [] })).status).toBe(404);
    const foreign = [{ questionId: other.questions[0].id, optionId: other.questions[0].options[0].id }];
    expect((await api().post(`/api/exams/attempts/${start.body.attempt.id}/submit`).set(a.auth).send({ answers: foreign })).status).toBe(400);
    expect(exam).toBeTruthy();
  });

  it("yayında sınav yoksa 404 döner", async () => {
    await createExam({ published: false });
    const { auth } = await createUser();
    expect((await api().get("/api/exams/placement").set(auth)).status).toBe(404);
  });
});

const completeAll = (course, auth) =>
  Promise.all(course.lessons.map((l) => api().post(`/api/courses/${course.id}/lessons/${l.id}/complete`).set(auth)));

describe("final testi", () => {
  it("tüm dersler bitmeden açılmaz; kalınca kurs baştan başlar, geçince tekrar girilmez", async () => {
    const { course, exam } = await createCourse({ lessons: 2, withFinal: true });
    const { auth } = await createUser({ level: "ALPHA" });

    const early = await api().post(`/api/exams/courses/${course.id}/final/start`).set(auth);
    expect(early.status).toBe(403);
    expect(early.body.code).toBe("COURSE_NOT_FINISHED");

    await completeAll(course, auth);
    const first = await api().post(`/api/exams/courses/${course.id}/final/start`).set(auth);
    const fail = await api().post(`/api/exams/attempts/${first.body.attempt.id}/submit`).set(auth).send({ answers: answersFor(exam, 1) });
    expect(fail.body.attempt).toMatchObject({ score: 20, passed: false, assignedLevel: null });
    expect(fail.body.courseReset).toBe(true);

    // Kaldı: ilerleme sıfırlandı, test tekrar kilitlendi.
    const afterFail = await api().get(`/api/courses/${course.id}`).set(auth);
    expect(afterFail.body.course.progress).toMatchObject({ completed: 0, percent: 0, finished: false });
    expect(afterFail.body.course.lessons.every((l) => !l.completed)).toBe(true);
    expect((await api().post(`/api/exams/courses/${course.id}/final/start`).set(auth)).body.code).toBe("COURSE_NOT_FINISHED");

    await completeAll(course, auth);
    const second = await api().post(`/api/exams/courses/${course.id}/final/start`).set(auth);
    expect(second.body.attempt.id).not.toBe(first.body.attempt.id);
    const pass = await api().post(`/api/exams/attempts/${second.body.attempt.id}/submit`).set(auth).send({ answers: answersFor(exam, 4) });
    expect(pass.body.attempt).toMatchObject({ score: 80, passed: true });
    expect(pass.body.courseReset).toBe(false);

    const detail = await api().get(`/api/courses/${course.id}`).set(auth);
    expect(detail.body.course.finalExam).toMatchObject({ passed: true });
    expect(detail.body.course.finalExam.attempts).toHaveLength(2);
    expect(detail.body.course.progress).toMatchObject({ percent: 100, finished: true });

    const again = await api().post(`/api/exams/courses/${course.id}/final/start`).set(auth);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("FINAL_PASSED");

    // Final testi öğrencinin sınıfını değiştirmez.
    const me = await prisma.user.findFirst({ where: { level: "ALPHA" } });
    expect(me.level).toBe("ALPHA");
  });

  it("kalmak sadece o kursun ilerlemesini siler", async () => {
    const a = await createCourse({ lessons: 2, withFinal: true });
    const b = await createCourse({ lessons: 3 });
    const { auth } = await createUser({ level: "ALPHA" });
    await completeAll(a.course, auth);
    await api().post(`/api/courses/${b.course.id}/lessons/${b.course.lessons[0].id}/complete`).set(auth);

    const start = await api().post(`/api/exams/courses/${a.course.id}/final/start`).set(auth);
    await api().post(`/api/exams/attempts/${start.body.attempt.id}/submit`).set(auth).send({ answers: answersFor(a.exam, 0) });

    const other = await api().get(`/api/courses/${b.course.id}`).set(auth);
    expect(other.body.course.progress).toMatchObject({ completed: 1, total: 3, percent: 33 });
  });

  it("öğrencinin sınıfına kapalı kursun finaline girilemez", async () => {
    const { course } = await createCourse({ level: "BETA", withFinal: true });
    const { auth } = await createUser({ level: "ALPHA" });
    const res = await api().post(`/api/exams/courses/${course.id}/final/start`).set(auth);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("LEVEL_MISMATCH");
  });
});

describe("sınıf değişikliği", () => {
  it("admin sınıfı kaldırınca öğrenci seviye sınavına yeniden girer", async () => {
    const exam = await createExam();
    const admin = await createUser({ role: "ADMIN" });
    const { user, auth } = await createUser();
    const first = await api().post("/api/exams/placement/start").set(auth);
    await api().post(`/api/exams/attempts/${first.body.attempt.id}/submit`).set(auth).send({ answers: answersFor(exam, 1) });

    await api().patch(`/api/admin/users/${user.id}`).set(admin.auth).send({ level: null });
    expect((await api().get("/api/exams/placement").set(auth)).body.status).toBe("PENDING");
    const second = await api().post("/api/exams/placement/start").set(auth);
    expect(second.status).toBe(201);
    const res = await api().post(`/api/exams/attempts/${second.body.attempt.id}/submit`).set(auth).send({ answers: answersFor(exam, 5) });
    expect(res.body.user.level).toBe("BETA");
  });

  it("sınıfı atanmış öğrencinin yarım kalan seviye sınavı sonucu sınıfını değiştirmez", async () => {
    const exam = await createExam();
    const admin = await createUser({ role: "ADMIN" });
    const { user, auth } = await createUser();
    const start = await api().post("/api/exams/placement/start").set(auth);
    await api().patch(`/api/admin/users/${user.id}`).set(admin.auth).send({ level: "ALPHA" });
    const res = await api().post(`/api/exams/attempts/${start.body.attempt.id}/submit`).set(auth).send({ answers: answersFor(exam, 5) });
    expect(res.status).toBe(409);
    expect((await prisma.user.findUnique({ where: { id: user.id } })).level).toBe("ALPHA");
  });

  it("final sırasında sınıfı değişen öğrencinin sonucu kaydedilmez", async () => {
    const { course, exam } = await createCourse({ level: "ALPHA", lessons: 1, withFinal: true });
    const admin = await createUser({ role: "ADMIN" });
    const { user, auth } = await createUser({ level: "ALPHA" });
    await completeAll(course, auth);
    const start = await api().post(`/api/exams/courses/${course.id}/final/start`).set(auth);
    await api().patch(`/api/admin/users/${user.id}`).set(admin.auth).send({ level: "BETA" });
    const res = await api().post(`/api/exams/attempts/${start.body.attempt.id}/submit`).set(auth).send({ answers: answersFor(exam, 5) });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("LEVEL_MISMATCH");
  });
});
