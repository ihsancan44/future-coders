import { beforeEach, describe, expect, it } from "vitest";
import { answersFor, api, createCourse, createUser, resetDb } from "./helpers.js";
import { CAREER_KEYS } from "../src/data/careers.js";

beforeEach(resetDb);

async function passFinal(auth) {
  const { course, exam } = await createCourse({ lessons: 1, withFinal: true });
  await api().post(`/api/courses/${course.id}/lessons/${course.lessons[0].id}/complete`).set(auth);
  const start = await api().post(`/api/exams/courses/${course.id}/final/start`).set(auth);
  await api().post(`/api/exams/attempts/${start.body.attempt.id}/submit`).set(auth).send({ answers: answersFor(exam, 5) });
  return course;
}

describe("alan seçimi ve yol haritası", () => {
  it("alanlar listelenir, yol haritası herkese açıktır", async () => {
    const { auth } = await createUser({ level: "ALPHA" });
    const list = await api().get("/api/career").set(auth);
    expect(list.status).toBe(200);
    expect(list.body.fields.map((f) => f.key)).toEqual(CAREER_KEYS);
    expect(list.body.fields.map((f) => f.key)).toEqual(expect.arrayContaining(["iot", "ai", "frontend", "backend", "cyber"]));
    expect(list.body).toMatchObject({ current: null, eligible: false, passedCourses: [] });

    const map = await api().get("/api/career/ai");
    expect(map.status).toBe(200);
    expect(map.body.career.stages.length).toBeGreaterThanOrEqual(4);
    expect((await api().get("/api/career/yok")).status).toBe(404);
  });

  it("final testi geçilmeden alan seçilemez", async () => {
    const { auth } = await createUser({ level: "ALPHA" });
    const res = await api().put("/api/career").set(auth).send({ field: "ai" });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FINAL_REQUIRED");
  });

  it("final testini geçen öğrenci alan seçer ve değiştirebilir", async () => {
    const { auth } = await createUser({ level: "ALPHA" });
    const course = await passFinal(auth);

    const list = await api().get("/api/career").set(auth);
    expect(list.body).toMatchObject({ eligible: true, passedCourses: [{ id: course.id, title: course.title }] });

    const pick = await api().put("/api/career").set(auth).send({ field: "iot" });
    expect(pick.status).toBe(200);
    expect(pick.body.user.careerField).toBe("iot");

    const change = await api().put("/api/career").set(auth).send({ field: "cyber" });
    expect(change.body.user.careerField).toBe("cyber");
    expect((await api().get("/api/auth/me").set(auth)).body.user.careerField).toBe("cyber");

    expect((await api().put("/api/career").set(auth).send({ field: "bilinmeyen" })).status).toBe(400);
  });
});

describe("kurs ilerleme yüzdesi", () => {
  it("kurs listesinde öğrencinin yüzdesi ve final durumu gelir, misafire gelmez", async () => {
    const { course } = await createCourse({ lessons: 4 });
    const { auth } = await createUser({ level: "ALPHA" });
    await api().post(`/api/courses/${course.id}/lessons/${course.lessons[0].id}/complete`).set(auth);

    const list = await api().get("/api/courses").set(auth);
    expect(list.body.courses[0]).toMatchObject({ progress: { completed: 1, total: 4, percent: 25, finished: false }, finalPassed: false });

    const guest = await api().get("/api/courses");
    expect(guest.body.courses[0].progress).toBeUndefined();
  });
});
