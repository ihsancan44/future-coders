import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { api, createCourse, createUser, resetDb } from "./helpers.js";
import { config } from "../src/config.js";
import { pickCompiler, resetCompilerCache } from "../src/lib/codeRunner.js";

vi.mock("../src/lib/assistant.js", () => ({
  assistantEnabled: vi.fn(() => false),
  askAssistant: vi.fn(async () => "İpucu: return değeri geri verir."),
}));
const assistant = await import("../src/lib/assistant.js");

beforeEach(resetDb);
afterEach(() => {
  vi.unstubAllGlobals();
  resetCompilerCache();
});

const practice = [
  { text: "kare(4) ne döndürür?", code: "function kare(x) { return x * x; }", options: ["8", "16", "undefined"], answerIndex: 1, explanation: "4 × 4 = 16" },
  { text: "return'den sonraki satır çalışır mı?", options: ["Evet", "Hayır"], answerIndex: 1 },
];

describe("konu paneli (özet, pratik, kısa videolar)", () => {
  it("admin özet, pratik ve dil kaydeder; erişimi olan öğrenci görür, olmayan görmez", async () => {
    const { auth } = await createUser({ role: "ADMIN" });
    const { course } = await createCourse({ level: "ALPHA" });
    const lessonId = course.lessons[0].id;
    const url = `/api/admin/courses/${course.id}/lessons/${lessonId}`;

    const saved = await api()
      .put(url)
      .set(auth)
      .send({ keyPoints: ["Fonksiyon tekrar çağrılabilir.", "return sonucu verir."], codeExample: "function f() {}", tip: "Unutma", language: "javascript", practice });
    expect(saved.status).toBe(200);
    expect(saved.body.lesson.keyPoints).toHaveLength(2);
    expect(saved.body.lesson.practice.map((q) => q.answerIndex)).toEqual([1, 1]);

    // Pratik listesi her kayıtta tamamen değişir; gönderilmezse dokunulmaz.
    await api().put(url).set(auth).send({ title: "Fonksiyonlar" });
    const replaced = await api().put(url).set(auth).send({ practice: [practice[0]] });
    expect(replaced.body.lesson.practice).toHaveLength(1);
    expect(replaced.body.lesson.title).toBe("Fonksiyonlar");

    const badAnswer = await api().put(url).set(auth).send({ practice: [{ ...practice[0], answerIndex: 5 }] });
    expect(badAnswer.status).toBe(400);
    const badLang = await api().put(url).set(auth).send({ language: "brainfuck" });
    expect(badLang.status).toBe(400);
    expect((await api().put(url).set(auth).send({ language: "" })).body.lesson.language).toBeNull();

    const reel = await api().post(`${url}/reels`).set(auth).send({ title: "60 saniyede return", videoUrl: "https://youtu.be/abc", language: "python", starterCode: "print(1)" });
    expect(reel.status).toBe(201);

    const alpha = await createUser({ level: "ALPHA" });
    const detail = await api().get(`/api/courses/${course.id}`).set(alpha.auth);
    const lesson = detail.body.course.lessons[0];
    expect(lesson.keyPoints).toEqual(["Fonksiyon tekrar çağrılabilir.", "return sonucu verir."]);
    expect(lesson.practice[0]).toMatchObject({ text: practice[0].text, answerIndex: 1 });
    expect(lesson.reels[0]).toMatchObject({ title: "60 saniyede return", language: "python", starterCode: "print(1)" });

    const beta = await createUser({ level: "BETA" });
    const locked = await api().get(`/api/courses/${course.id}`).set(beta.auth);
    expect(locked.body.course.lessons[0].practice).toBeUndefined();
    expect(locked.body.course.lessons[0].reels).toBeUndefined();
  });

  it("kısa videoları ekler, sıralar, değiştirir ve silerken yüklenen dosyayı kaldırır", async () => {
    const { auth } = await createUser({ role: "ADMIN" });
    const { course } = await createCourse();
    const base = `/api/admin/courses/${course.id}/lessons/${course.lessons[0].id}/reels`;
    const uploadPath = (u) => path.join(process.env.UPLOAD_DIR, path.basename(u));

    const up = await api().post("/api/admin/uploads/video").set(auth).attach("file", Buffer.from("video"), { filename: "reel.mp4", contentType: "video/mp4" });
    const a = (await api().post(base).set(auth).send({ title: "Birinci", videoUrl: up.body.url })).body.reel;
    const b = (await api().post(base).set(auth).send({ title: "İkinci", videoUrl: "https://youtu.be/xyz" })).body.reel;
    expect((await api().post(base).set(auth).send({ title: "Boş", videoUrl: "" })).status).toBe(400);

    const moved = await api().patch(`${base}/${b.id}/move`).set(auth).send({ direction: "up" });
    expect(moved.body.reels.map((r) => r.title)).toEqual(["İkinci", "Birinci"]);

    // Başka dersin videosu bu adresten değiştirilemez.
    const other = course.lessons[1].id;
    expect((await api().put(`/api/admin/courses/${course.id}/lessons/${other}/reels/${a.id}`).set(auth).send({ title: "Başka" })).status).toBe(404);

    expect(fs.existsSync(uploadPath(up.body.url))).toBe(true);
    await api().put(`${base}/${a.id}`).set(auth).send({ videoUrl: "https://youtu.be/new" });
    expect(fs.existsSync(uploadPath(up.body.url))).toBe(false);

    const up2 = await api().post("/api/admin/uploads/video").set(auth).attach("file", Buffer.from("video"), { filename: "r2.webm", contentType: "video/webm" });
    await api().put(`${base}/${b.id}`).set(auth).send({ videoUrl: up2.body.url });
    // Ders silinince kısa videolarının dosyaları da silinir.
    expect((await api().delete(`/api/admin/courses/${course.id}/lessons/${course.lessons[0].id}`).set(auth)).status).toBe(204);
    expect(fs.existsSync(uploadPath(up2.body.url))).toBe(false);
  });
});

describe("derleyici", () => {
  const list = [
    { language: "C++", name: "gcc-head", version: "16.0.0" },
    { language: "C++", name: "gcc-13.2.0", version: "13.2.0" },
    { language: "C++", name: "gcc-9.5.0", version: "9.5.0" },
    { language: "Java", name: "openjdk-jdk-22+36", version: "22+36" },
  ];

  it("kararlı en yeni derleyiciyi seçer", () => {
    expect(pickCompiler(list, "C++")).toBe("gcc-13.2.0");
    expect(pickCompiler(list, "Java")).toBe("openjdk-jdk-22+36");
    expect(pickCompiler(list, "Rust")).toBeNull();
  });

  it("kodu servise gönderir ve çıktıyı döndürür; giriş ister", async () => {
    const fetchMock = vi.fn(async (url, init) => ({
      ok: true,
      json: async () =>
        url.endsWith("/list.json")
          ? list
          : { status: "0", program_output: `çıktı:${JSON.parse(init.body).compiler}`, program_error: "", compiler_message: "" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const body = { language: "cpp", code: "int main(){}" };
    expect((await api().post("/api/code/run").send(body)).status).toBe(401);

    const { auth } = await createUser({ level: "ALPHA" });
    const res = await api().post("/api/code/run").set(auth).send(body);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ stdout: "çıktı:gcc-13.2.0", exitCode: 0, compiler: "gcc-13.2.0" });
    expect(fetchMock.mock.calls[1][0]).toBe(`${config.codeRunnerUrl}/api/compile.json`);

    const langs = await api().get("/api/code/languages");
    expect(langs.body.server).toEqual(["cpp", "java"]);

    expect((await api().post("/api/code/run").set(auth).send({ language: "python", code: "print(1)" })).status).toBe(400);
    expect((await api().post("/api/code/run").set(auth).send({ language: "cobol", code: "x" })).status).toBe(400);
    const missing = await api().post("/api/code/run").set(auth).send({ language: "rust", code: "fn main(){}" });
    expect(missing.status).toBe(503);
  });

  it("servise ulaşılamazsa anlaşılır bir hata döner", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ağ yok"); }));
    const { auth } = await createUser({ level: "ALPHA" });
    const res = await api().post("/api/code/run").set(auth).send({ language: "c", code: "int main(){}" });
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/ulaşılamadı/);
    expect((await api().get("/api/code/languages")).body.server).toBeNull();
  });
});

describe("Codevia Asistan", () => {
  const chat = (auth, body) => api().post("/api/assistant/chat").set(auth).send(body);

  it("anahtar yoksa kapalı olduğunu söyler", async () => {
    const { auth } = await createUser({ level: "ALPHA" });
    expect((await api().get("/api/assistant/status")).body.enabled).toBe(false);
    const res = await chat(auth, { messages: [{ role: "user", content: "return nedir?" }] });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("ASSISTANT_DISABLED");
  });

  it("cevap verir ve konunun özetini sadece erişimi olan öğrenci için ekler", async () => {
    assistant.assistantEnabled.mockReturnValue(true);
    const { course } = await createCourse({ level: "ALPHA" });
    const alpha = await createUser({ level: "ALPHA" });
    const beta = await createUser({ level: "BETA" });

    const ok = await chat(alpha.auth, { lessonId: course.lessons[0].id, messages: [{ role: "user", content: "return nedir?" }] });
    expect(ok.status).toBe(200);
    expect(ok.body.reply).toMatch(/return/);
    expect(assistant.askAssistant.mock.calls.at(-1)[0].system).toContain(course.lessons[0].title);

    await chat(beta.auth, { lessonId: course.lessons[0].id, messages: [{ role: "user", content: "return nedir?" }] });
    expect(assistant.askAssistant.mock.calls.at(-1)[0].system).not.toContain(course.lessons[0].title);

    expect((await api().post("/api/assistant/chat").send({ messages: [{ role: "user", content: "x" }] })).status).toBe(401);
    expect((await chat(alpha.auth, { messages: [{ role: "assistant", content: "x" }] })).status).toBe(400);
    expect((await chat(alpha.auth, { messages: [{ role: "user", content: "a".repeat(2001) }] })).status).toBe(400);
    assistant.assistantEnabled.mockReturnValue(false);
  });
});
