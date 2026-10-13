import { beforeEach, describe, expect, it } from "vitest";
import { api, createCourse, createUser, resetDb } from "./helpers.js";

beforeEach(resetDb);

describe("kurs listesi ve erişim", () => {
  it("misafir yayındaki kursları görür ama içerik kilitlidir", async () => {
    const { course } = await createCourse();
    await createCourse({ published: false });
    const list = await api().get("/api/courses");
    expect(list.body.courses).toHaveLength(1);
    expect(list.body.courses[0].access).toMatchObject({ canAccess: false, reason: "LOGIN_REQUIRED" });

    const detail = await api().get(`/api/courses/${course.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.course.lessons[0].content).toBeUndefined();
  });

  it("seviye sınavına girmemiş öğrenci kursu açamaz", async () => {
    const { course } = await createCourse();
    const { auth } = await createUser();
    const detail = await api().get(`/api/courses/${course.id}`).set(auth);
    expect(detail.body.course.access.reason).toBe("PLACEMENT_REQUIRED");
    const done = await api().post(`/api/courses/${course.id}/lessons/${course.lessons[0].id}/complete`).set(auth);
    expect(done.status).toBe(403);
  });

  it("ALPHA öğrenci ALPHA ve ALL kursları açar, BETA kursu açamaz", async () => {
    const { course: all } = await createCourse({ level: "ALL" });
    const { course: alpha } = await createCourse({ level: "ALPHA" });
    const { course: beta } = await createCourse({ level: "BETA" });
    const { auth } = await createUser({ level: "ALPHA" });

    for (const c of [all, alpha]) {
      const res = await api().get(`/api/courses/${c.id}`).set(auth);
      expect(res.body.course.access.canAccess).toBe(true);
      expect(res.body.course.lessons[0].content).toBe("İçerik");
    }
    const res = await api().get(`/api/courses/${beta.id}`).set(auth);
    expect(res.body.course.access.reason).toBe("LEVEL_MISMATCH");

    const mine = await api().get("/api/courses?mine=true").set(auth);
    expect(mine.body.courses.map((c) => c.id).sort()).toEqual([all.id, alpha.id].sort());
  });

  it("yayında olmayan kurs 404 döner", async () => {
    const { course } = await createCourse({ published: false });
    const { auth } = await createUser({ level: "ALPHA" });
    expect((await api().get(`/api/courses/${course.id}`).set(auth)).status).toBe(404);
  });

  it("ders tamamlama ilerlemeyi günceller", async () => {
    const { course } = await createCourse({ lessons: 2 });
    const { auth } = await createUser({ level: "BETA" });
    const first = await api().post(`/api/courses/${course.id}/lessons/${course.lessons[0].id}/complete`).set(auth);
    expect(first.body.progress).toEqual({ total: 2, completed: 1, percent: 50, finished: false });
    const second = await api().post(`/api/courses/${course.id}/lessons/${course.lessons[1].id}/complete`).set(auth);
    expect(second.body.progress.finished).toBe(true);
    const undo = await api().delete(`/api/courses/${course.id}/lessons/${course.lessons[1].id}/complete`).set(auth);
    expect(undo.body.progress.completed).toBe(1);
  });
});

describe("yorumlar", () => {
  it("erişimi olan öğrenci yorum yapar, herkes görür, sadece sahibi veya admin siler", async () => {
    const { course } = await createCourse();
    const owner = await createUser({ level: "ALPHA" });
    const other = await createUser({ level: "ALPHA" });
    const admin = await createUser({ role: "ADMIN" });

    const created = await api().post(`/api/courses/${course.id}/comments`).set(owner.auth).send({ content: "Çok faydalı bir ders" });
    expect(created.status).toBe(201);

    const list = await api().get(`/api/courses/${course.id}/comments`);
    expect(list.body.comments[0]).toMatchObject({ content: "Çok faydalı bir ders" });

    const id = created.body.comment.id;
    expect((await api().delete(`/api/courses/${course.id}/comments/${id}`).set(other.auth)).status).toBe(403);
    expect((await api().delete(`/api/courses/${course.id}/comments/${id}`).set(admin.auth)).status).toBe(204);
  });

  it("seviye sınavına girmemiş öğrenci yorum yapamaz", async () => {
    const { course } = await createCourse();
    const { auth } = await createUser();
    const res = await api().post(`/api/courses/${course.id}/comments`).set(auth).send({ content: "Merhaba" });
    expect(res.status).toBe(403);
  });
});
