import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { api, createCourse, createUser, resetDb } from "./helpers.js";
import { config } from "../src/config.js";
import { pickCompiler, pickJudge0, resetCompilerCache } from "../src/lib/codeRunner.js";

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
  const wandboxList = [
    { language: "C++", name: "gcc-head", version: "16.0.0" },
    { language: "C++", name: "gcc-13.2.0", version: "13.2.0" },
    { language: "C++", name: "gcc-9.5.0", version: "9.5.0" },
    { language: "Java", name: "openjdk-jdk-22+36", version: "22+36" },
    { language: "Go", name: "go-1.23.2", version: "1.23.2" },
    { language: "Go", name: "go-1.16.3", version: "1.16.3" },
    { language: "Julia", name: "julia-1.0.5", version: "1.0.5" },
  ];
  const judge0List = [
    { id: 48, name: "C (GCC 7.4.0)" },
    { id: 50, name: "C (GCC 9.2.0)" },
    { id: 49, name: "C (GCC 8.3.0)" },
    { id: 54, name: "C++ (GCC 9.2.0)" },
    { id: 62, name: "Java (OpenJDK 13.0.1)" },
  ];
  const b64 = (s) => Buffer.from(s).toString("base64");
  const { judge0, wandbox, paiza } = config.codeRunners;
  const defaultOrder = config.codeRunners.order;
  beforeEach(() => {
    config.codeRunners.order = ["judge0", "wandbox", "paiza"];
  });
  afterEach(() => {
    config.codeRunners.order = defaultOrder;
  });

  it("varsayılan sıra en hızlı servisle başlar", () => {
    expect(defaultOrder).toEqual(["paiza", "judge0", "wandbox"]);
  });

  /** Servisleri taklit eder; her servisin cevabı test içinde değiştirilebilir. */
  function services(over = {}) {
    const calls = [];
    const reply = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
    const handlers = {
      judge0List: () => reply(judge0List),
      judge0Run: (body) => reply({ status: { id: 3, description: "Accepted" }, stdout: b64(`j0:${body.language_id}:${Buffer.from(body.source_code, "base64").toString()}`), exit_code: 0 }),
      wandboxList: () => reply(wandboxList),
      wandboxRun: (body) => reply({ status: "0", program_output: `wb:${body.compiler}:${body.code}` }),
      paizaCreate: () => reply({ id: "p1", status: "completed" }),
      paizaDetails: () => reply({ status: "completed", stdout: "pz", exit_code: "0", build_result: "success" }),
      ...over,
    };
    const fetchMock = vi.fn(async (url, init) => {
      const body = init?.body ? JSON.parse(init.body) : null;
      const route = url === `${judge0.url}/languages` ? "judge0List"
        : url.startsWith(`${judge0.url}/submissions`) ? "judge0Run"
        : url === `${wandbox.url}/api/list.json` ? "wandboxList"
        : url === `${wandbox.url}/api/compile.json` ? "wandboxRun"
        : url === `${paiza.url}/runners/create` ? "paizaCreate"
        : url.startsWith(`${paiza.url}/runners/get_details`) ? "paizaDetails"
        : null;
      calls.push(route);
      if (!route) throw new Error(`beklenmeyen adres ${url}`);
      return handlers[route](body);
    });
    vi.stubGlobal("fetch", fetchMock);
    return calls;
  }
  const run = async (body) => {
    const { auth } = await createUser({ level: "ALPHA" });
    return api().post("/api/code/run").set(auth).send(body);
  };

  it("Wandbox'ta denenmiş sürümü, yoksa kararlı en yeni sürümü seçer; Judge0'da en yeni sürümü", () => {
    expect(pickCompiler(wandboxList, "C++")).toBe("gcc-13.2.0");
    expect(pickCompiler(wandboxList, { language: "Go", prefer: ["go-1.16", "go-1.15"] })).toBe("go-1.16.3");
    expect(pickCompiler(wandboxList, { language: "Go", prefer: ["go-1.12"] })).toBe("go-1.23.2");
    expect(pickCompiler(wandboxList, "Rust")).toBeNull();
    expect(pickJudge0(judge0List, "C (GCC")).toBe(50);
    expect(pickJudge0(judge0List, "Rust (")).toBeNull();
  });

  it("kodu ilk servise gönderir ve çıktıyı döndürür; giriş ister", async () => {
    services();
    const body = { language: "cpp", code: "int main(){}", stdin: "ğ" };
    expect((await api().post("/api/code/run").send(body)).status).toBe(401);
    const res = await run(body);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ stdout: "j0:54:int main(){}", exitCode: 0, compiler: "Judge0 · C++ (GCC 9.2.0)" });

    expect((await run({ language: "python", code: "print(1)" })).status).toBe(400);
    expect((await run({ language: "cobol", code: "x" })).status).toBe(400);
  });

  it("servis çökerse ya da kendi kurulumu bozuksa sıradakine geçer; bozuk servis sona bırakılır", async () => {
    const calls = services({
      judge0Run: () => ({ ok: false, status: 503, json: async () => ({}) }),
      wandboxRun: () => ({ ok: true, json: async () => ({ status: "1", compiler_message: "ERROR (catatonit:2): failed to exec pid1: No such file or directory\n" }) }),
    });
    const res = await run({ language: "cpp", code: "int main(){}" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ stdout: "pz", compiler: "paiza.io · C++" });
    expect(calls).toEqual(["judge0List", "judge0Run", "wandboxList", "wandboxRun", "paizaCreate", "paizaDetails"]);

    // Sonraki çalıştırmada önce çalışan servis denenir.
    calls.length = 0;
    expect((await run({ language: "cpp", code: "int main(){}" })).body.compiler).toBe("paiza.io · C++");
    expect(calls).toEqual(["paizaCreate", "paizaDetails"]);
  });

  it("Judge0'da derleyicinin süreye takılması servis hatası sayılır", async () => {
    services({
      judge0Run: () => ({ ok: true, json: async () => ({ status: { id: 6 }, compile_output: b64("Compilation time limit exceeded.") }) }),
    });
    expect((await run({ language: "c", code: "int main(){}" })).body.compiler).toBe("paiza.io · C");
  });

  it("öğrencinin kodundaki hata başka serviste tekrar denenmez", async () => {
    const calls = services({
      judge0Run: () => ({ ok: true, json: async () => ({ status: { id: 6, description: "Compilation Error" }, compile_output: b64("hata: ; eksik") }) }),
    });
    const res = await run({ language: "c", code: "int main(){" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ compileOutput: "hata: ; eksik", exitCode: 1 });
    expect(calls).toEqual(["judge0List", "judge0Run"]);
  });

  it("Java'da sınıf adı serbesttir; Wandbox'ta Swift gibi bozuk diller hiç denenmez", async () => {
    services({ judge0List: () => ({ ok: false, status: 500, json: async () => ({}) }) });
    const res = await run({ language: "java", code: "public class Merhaba { public static void main(String[] a) {} }" });
    expect(res.body.compiler).toBe("Wandbox · openjdk-jdk-22+36");
    expect(res.body.stdout).toContain("class prog { public static void main(String[] args) throws Exception { Merhaba.main(args); } }");
    expect(res.body.stdout).not.toContain("public class Merhaba");

    const calls = services({ judge0Run: () => ({ ok: false, status: 500, json: async () => ({}) }) });
    expect((await run({ language: "swift", code: "print(1)" })).body.compiler).toBe("paiza.io · Swift");
    expect(calls).not.toContain("wandboxRun");
  });

  it("dil listesi servislerin birleşimidir", async () => {
    services();
    const langs = (await api().get("/api/code/languages")).body;
    expect(langs.enabled).toBe(true);
    // Judge0: c, cpp, java; Wandbox: cpp, java, go, julia; paiza: sabit liste (OCaml, Lua, Julia, Erlang, Pascal yok).
    expect(langs.server).toEqual(expect.arrayContaining(["c", "cpp", "java", "go", "julia", "swift", "elixir"]));
    expect(langs.server).not.toContain("ocaml");
    expect(langs.server).not.toContain("erlang");
  });

  it("hiçbir servise ulaşılamazsa anlaşılır bir hata döner", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ağ yok"); }));
    const res = await run({ language: "c", code: "int main(){}" });
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/ulaşılamadı/);
  });

  it("CODE_RUNNERS=off sunucu dillerini kapatır", async () => {
    config.codeRunners.order = [];
    {
      expect((await api().get("/api/code/languages")).body).toEqual({ enabled: false, server: [] });
      const res = await run({ language: "c", code: "int main(){}" });
      expect(res.status).toBe(503);
      expect(res.body.error).toMatch(/kapalı/);
    }
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
    expect(assistant.askAssistant.mock.calls.at(-1)[0].system).toMatch(/genel kodlama sorularına/);

    await chat(beta.auth, { lessonId: course.lessons[0].id, messages: [{ role: "user", content: "return nedir?" }] });
    expect(assistant.askAssistant.mock.calls.at(-1)[0].system).not.toContain(course.lessons[0].title);

    expect((await api().post("/api/assistant/chat").send({ messages: [{ role: "user", content: "x" }] })).status).toBe(401);
    expect((await chat(alpha.auth, { messages: [{ role: "assistant", content: "x" }] })).status).toBe(400);
    expect((await chat(alpha.auth, { messages: [{ role: "user", content: "a".repeat(4001) }] })).status).toBe(400);
    assistant.assistantEnabled.mockReturnValue(false);
  });
});
