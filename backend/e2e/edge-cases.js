// Uç durum senaryoları: yetki ve oturum güvenliği, aynı anda gelen istekler, öğrenci sınavdayken admin
// değişiklikleri ve sınırdaki / bozuk girdiler. scenarios.js ile aynı şekilde çalışan sunucuya bağlanır.
//
// Kullanım (seed edilmiş veritabanı, sunucu çalışırken):
//   SERVER_LOG=<sunucu log dosyası> npm run test:e2e:edge
//
// Yardımcı öğrenciler hız sınırına takılmamak için doğrudan veritabanına yazılır (bkz. seedStudent);
// betik bu yüzden sunucuyla aynı DATABASE_URL ve JWT_SECRET değerlerini kullanır.
// Betik veritabanında kalıcı değişiklik bırakmaz: oluşturduğu kurs ve sınavları sonunda siler.
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  Fail,
  answerKey,
  answers,
  check,
  completeAll,
  del,
  eq,
  get,
  lastResetToken,
  newStudent,
  patch,
  post,
  prisma,
  put,
  run,
  runMain,
  seedStudent,
  setGroup,
  status,
  step,
} from "./helpers.js";

const all = (n, fn) => Promise.all(Array.from({ length: n }, (_, i) => fn(i)));
const statuses = (list) => list.map((r) => r.status).join(",");
/** Aynı anda gönderilen isteklerin durumları, sıradan bağımsız karşılaştırma için sıralı. */
const sortedStatuses = (list) => list.map((r) => r.status).sort().join(",");

async function main() {
  const courses = await prisma.course.findMany({
    where: { published: true },
    include: { lessons: { orderBy: { order: "asc" } }, finalExam: true },
    orderBy: { id: "asc" },
  });
  const ALL = courses.find((c) => c.level === "ALL" && c.finalExam);
  check(ALL, "Seed verisinde final sınavı olan bir 'ALL' kursu olmalı (npm run db:seed).");
  const placement = await prisma.exam.findFirst({ where: { type: "PLACEMENT", published: true }, include: { questions: true } });
  const N = placement.questions.length;
  const passCount = Math.ceil((placement.passingScore / 100) * N);

  const login = await post("/api/auth/login", { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  status(login, 200, "admin girişi");
  const admin = login.body.token;
  const cleanup = { courses: [], exams: [] };

  // ================= GÜVENLİK =================
  setGroup("Güvenlik: yetki ve oturum");

  await step("S1", "Kayıt formuna gizlice role/level/careerField eklemek işe yaramaz", "201, role=STUDENT, level=null", async () => {
    const data = { ...newStudent("Sizma"), role: "ADMIN", level: "BETA", careerField: "web", id: 1 };
    const res = await post("/api/auth/register", { body: data });
    status(res, 201);
    eq(res.body.user.role, "STUDENT", "rol");
    eq(res.body.user.level, null, "sınıf");
    eq(res.body.user.careerField ?? null, null, "alan");
    status(await get("/api/admin/stats", { token: res.body.token }), 403, "admin API");
    return "STUDENT, sınıfsız; admin API 403";
  });

  await step("S2", "Profil güncellemeyle rol, sınıf veya e-posta değiştirilemez", "200, yalnızca isim değişir", async () => {
    const s = await seedStudent("Profil", "ALPHA");
    const res = await patch("/api/auth/me", {
      token: s.token,
      body: { firstName: "Yeniisim", role: "ADMIN", level: "BETA", email: `ele-${run}@test.dev`, careerField: "web" },
    });
    status(res, 200);
    const u = res.body.user;
    check(u.firstName === "Yeniisim" && u.role === "STUDENT" && u.level === "ALPHA" && u.email === s.email, JSON.stringify(u));
    return "isim değişti; rol, sınıf ve e-posta aynı";
  });

  const ali = await seedStudent("Ali");
  const ayse = await seedStudent("Ayse", "ALPHA");
  await step("S3", "Öğrenci başkasının sınav denemesini göremez ve gönderemez", "404 / 404", async () => {
    const start = await post("/api/exams/placement/start", { token: ali.token });
    status(start, 201);
    const id = start.body.attempt.id;
    status(await get(`/api/exams/attempts/${id}`, { token: ayse.token }), 404, "görme");
    status(await post(`/api/exams/attempts/${id}/submit`, { token: ayse.token, body: { answers: [] } }), 404, "gönderme");
    const row = await prisma.examAttempt.findUnique({ where: { id } });
    eq(row.finishedAt, null, "Ali'nin denemesi açık kalmalı");
    return "404, 404; Ali'nin denemesi bozulmadı";
  });

  await step("S4", "Öğrenci başkasının yorumunu silemez, admin silebilir", "403, 204", async () => {
    const c = await post(`/api/courses/${ALL.id}/comments`, { token: ayse.token, body: { content: "Ayşe'nin yorumu" } });
    status(c, 201);
    const other = await seedStudent("Yorumcu", "ALPHA");
    status(await del(`/api/courses/${ALL.id}/comments/${c.body.comment.id}`, { token: other.token }), 403, "başka öğrenci");
    status(await del(`/api/courses/${ALL.id}/comments/${c.body.comment.id}`, { token: admin }), 204, "admin");
    return "403, 204";
  });

  await step("S5", "Sınav başlarken doğru cevap bilgisi tarayıcıya gönderilmez", "yanıtta isCorrect yok", async () => {
    const res = await post(`/api/exams/placement/start`, { token: (await seedStudent("Kopya")).token });
    status(res, 201);
    check(!JSON.stringify(res.body).includes("isCorrect"), "isCorrect sızdı");
    return `${res.body.exam.questions.length} soru, isCorrect yok`;
  });

  await step("S6", "Şifre özeti hiçbir yanıtta görünmez", "passwordHash / resetTokenHash yok", async () => {
    const bodies = await Promise.all([
      get("/api/auth/me", { token: ayse.token }),
      get(`/api/courses/${ALL.id}/comments`),
      get("/api/admin/users", { token: admin }),
      get(`/api/admin/users/${ayse.user.id}`, { token: admin }),
      get("/api/admin/comments", { token: admin }),
    ]);
    for (const b of bodies) {
      status(b, 200);
      const text = JSON.stringify(b.body);
      check(!/passwordHash|resetToken|\$2[aby]\$/.test(text), `sızıntı: ${text.slice(0, 120)}`);
    }
    return "5 uç noktada sızıntı yok";
  });

  await step("S7", "Sahte, imzasız veya silinmiş kullanıcıya ait token reddedilir", "401 / 401 / 401", async () => {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const none = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: 1, role: "ADMIN" })}.`;
    status(await get("/api/admin/stats", { token: none }), 401, "alg=none");
    const [h, , sig] = ayse.token.split(".");
    const forged = `${h}.${b64({ sub: ayse.user.id, role: "ADMIN", iat: Math.floor(Date.now() / 1000) })}.${sig}`;
    status(await get("/api/admin/stats", { token: forged }), 401, "rolü değiştirilmiş token");
    const gone = await seedStudent("Gidecek");
    await prisma.user.delete({ where: { id: gone.user.id } });
    status(await get("/api/auth/me", { token: gone.token }), 401, "silinmiş kullanıcı");
    return "üçü de 401";
  });

  await step("S8", "Şifre değiştirilince eski oturumlar kapanır, bu cihaz açık kalır", "eski token 401, yeni token 200", async () => {
    const s = await seedStudent("SifreDegis", "ALPHA");
    const other = s.token; // başka bir cihazda açık kalan oturum
    const res = await post("/api/auth/change-password", { token: s.token, body: { currentPassword: "Sifre12345", newPassword: "YeniSifre123" } });
    status(res, 200, "şifre değiştirme");
    check(res.body.token, "yanıtta bu cihaz için yeni token yok");
    status(await get("/api/auth/me", { token: res.body.token }), 200, "yeni token");
    status(await get("/api/auth/me", { token: other }), 401, "eski token");
    return "yeni token 200, eski token 401";
  });

  await step("S9", "Şifre sıfırlanınca (şifremi unuttum) eski oturumlar kapanır", "eski token 401", async () => {
    const s = await seedStudent("Sifirla", "BETA");
    status(await post("/api/auth/forgot-password", { body: { email: s.email } }), 200);
    const token = await lastResetToken();
    if (!token) throw new Fail("SERVER_LOG verilmedi ya da logda sıfırlama bağlantısı yok");
    status(await post("/api/auth/reset-password", { body: { token, password: "Sifirla12345", confirmPassword: "Sifirla12345" } }), 200, "sıfırlama");
    status(await get("/api/auth/me", { token: s.token }), 401, "çalınmış/eski token");
    return "sıfırlama 200, eski token 401";
  });

  // Testlerin kullanacağı geçici kurs: 2 ders, 3 soruluk final.
  const course = (await post("/api/admin/courses", {
    token: admin,
    body: { title: `Uç Durum Kursu ${run}`, summary: "Geçici test kursu", description: "Geçici test kursu", category: "Test", level: "ALL" },
  })).body.course;
  cleanup.courses.push(course.id);

  await step("S10", "Ders videosuna javascript: / data: adresi girilemez", "400, 400; https bağlantısı 201", async () => {
    const bad1 = await post(`/api/admin/courses/${course.id}/lessons`, { token: admin, body: { title: "Kötü", videoUrl: "javascript:alert(document.domain)" } });
    const bad2 = await post(`/api/admin/courses/${course.id}/lessons`, { token: admin, body: { title: "Kötü", videoUrl: "data:text/html,<script>alert(1)</script>" } });
    const ok = await post(`/api/admin/courses/${course.id}/lessons`, { token: admin, body: { title: "Ders 1", content: "Bir", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", durationMinutes: 5 } });
    status(ok, 201, "https");
    status(bad1, 400, "javascript:");
    status(bad2, 400, "data:");
    return "javascript: 400, data: 400, https 201";
  });

  await step("S11", "Kurs ve blog kapak görseline javascript: adresi girilemez", "400 / 400", async () => {
    const c = await put(`/api/admin/courses/${course.id}`, { token: admin, body: { coverImage: "javascript:alert(1)" } });
    const b = await post("/api/admin/blog", { token: admin, body: { title: "Kapak testi", summary: "Özet metni", content: "İçerik metni", coverImage: "javascript:alert(1)" } });
    if (b.status === 201) await del(`/api/admin/blog/${b.body.post.id}`, { token: admin });
    status(c, 400, "kurs kapağı");
    status(b, 400, "blog kapağı");
    return "400, 400";
  });

  await step("S12", "Görsel diye yüklenen HTML dosyası tarayıcıda çalıştırılamaz", "dosya image/png olarak ve nosniff ile sunulur", async () => {
    const form = new FormData();
    form.append("file", new Blob(["<script>alert(1)</script>"], { type: "image/png" }), "kotu.html");
    const up = await post("/api/admin/uploads", { token: admin, form });
    status(up, 201);
    check(up.body.url.endsWith(".png"), `uzantı ${up.body.url}`);
    const res = await fetch(`${process.env.API_URL || "http://localhost:4000"}${up.body.url}`);
    const type = res.headers.get("content-type");
    const sniff = res.headers.get("x-content-type-options");
    check(type?.startsWith("image/png") && sniff === "nosniff", `${type} / ${sniff}`);
    const txt = new FormData();
    txt.append("file", new Blob(["merhaba"], { type: "text/plain" }), "a.txt");
    status(await post("/api/admin/uploads", { token: admin, form: txt }), 400, "metin dosyası");
    return `${type}, nosniff; metin dosyası 400`;
  });

  await step("S13", "Yüklemeler klasöründen dışarı çıkılamaz", "404", async () => {
    for (const p of ["/uploads/..%2f.env", "/uploads/%2e%2e/package.json", "/uploads/../src/config.js"]) {
      const res = await fetch(`${process.env.API_URL || "http://localhost:4000"}${p}`);
      check(res.status === 404, `${p} → ${res.status}`);
    }
    return "3 deneme de 404";
  });

  // ================= EŞZAMANLILIK =================
  setGroup("Eşzamanlılık: aynı anda gelen istekler");

  await step("E1", "Seviye sınavı 5 sekmede aynı anda başlatılırsa tek deneme açılır", "5 yanıt aynı deneme, veritabanında 1 açık deneme", async () => {
    const s = await seedStudent("Sekme");
    const list = await all(5, () => post("/api/exams/placement/start", { token: s.token }));
    check(list.every((r) => r.status === 201), statuses(list));
    const ids = new Set(list.map((r) => r.body.attempt.id));
    const open = await prisma.examAttempt.count({ where: { userId: s.user.id, finishedAt: null } });
    check(ids.size === 1 && open === 1, `${ids.size} farklı deneme, ${open} açık kayıt`);
    return "tek deneme";
  });

  await step("E2", "Sınav cevapları çift tıklamayla iki kez gönderilirse bir kez puanlanır", "200 + 409, cevaplar bir kez kaydedilir", async () => {
    const s = await seedStudent("CiftTik");
    const start = await post("/api/exams/placement/start", { token: s.token });
    const key = await answerKey(start.body.exam.id);
    const body = { answers: answers(key, passCount) };
    const list = await all(2, () => post(`/api/exams/attempts/${start.body.attempt.id}/submit`, { token: s.token, body }));
    const saved = await prisma.attemptAnswer.count({ where: { attemptId: start.body.attempt.id } });
    check(sortedStatuses(list) === "200,409" && saved === N, `durumlar ${statuses(list)}, ${saved} cevap kaydı (beklenen ${N})`);
    return `200 + 409, ${saved} cevap`;
  });

  await step("E3", "Aynı e-postayla aynı anda 3 kayıt: biri açılır, diğerleri reddedilir", "201,409,409", async () => {
    const data = newStudent("Yaris");
    const list = await all(3, () => post("/api/auth/register", { body: data }));
    eq(sortedStatuses(list), "201,409,409", "durumlar");
    eq(await prisma.user.count({ where: { email: data.email } }), 1, "kullanıcı sayısı");
    return "201,409,409; tek hesap";
  });

  await step("E4", "Aynı ders aynı anda 5 kez tamamlandı işaretlenirse hata vermez, bir kez sayılır", "5×200, ilerleme 1 kayıt", async () => {
    const s = await seedStudent("Hizli", "ALPHA");
    const lesson = ALL.lessons[0];
    const list = await all(5, () => post(`/api/courses/${ALL.id}/lessons/${lesson.id}/complete`, { token: s.token }));
    const rows = await prisma.lessonProgress.count({ where: { userId: s.user.id, lessonId: lesson.id } });
    check(list.every((r) => r.status === 200) && rows === 1, `durumlar ${statuses(list)}, ${rows} kayıt`);
    return "5×200, 1 kayıt";
  });

  await step("E5", "Final testi aynı anda iki kez gönderilirse ikinci gönderim reddedilir", "200 + 409, tek sonuç", async () => {
    const s = await seedStudent("FinalCift", "ALPHA");
    await completeAll(s.token, ALL);
    const start = await post(`/api/exams/courses/${ALL.id}/final/start`, { token: s.token });
    status(start, 201);
    const key = await answerKey(start.body.exam.id);
    const body = { answers: answers(key, key.length) };
    const list = await all(2, () => post(`/api/exams/attempts/${start.body.attempt.id}/submit`, { token: s.token, body }));
    const finished = await prisma.examAttempt.count({ where: { userId: s.user.id, finishedAt: { not: null } } });
    check(sortedStatuses(list) === "200,409" && finished === 1, `durumlar ${statuses(list)}, ${finished} biten deneme`);
    return "200 + 409";
  });

  // ================= VERİ BÜTÜNLÜĞÜ =================
  setGroup("Veri bütünlüğü: öğrenci çalışırken admin değişiklikleri");

  const lesson2 = await post(`/api/admin/courses/${course.id}/lessons`, { token: admin, body: { title: "Ders 2", content: "İki", durationMinutes: 5 } });
  status(lesson2, 201, "ikinci ders");
  const exam = (await post("/api/admin/exams", { token: admin, body: { type: "FINAL", title: "Uç durum finali", courseId: course.id, passingScore: 50 } })).body.exam;
  const q = [];
  for (let i = 1; i <= 3; i++) {
    const r = await post(`/api/admin/exams/${exam.id}/questions`, {
      token: admin,
      body: { text: `Soru ${i}?`, options: [{ text: "Doğru", isCorrect: true }, { text: "Yanlış", isCorrect: false }] },
    });
    q.push(r.body.question);
  }
  status(await patch(`/api/admin/exams/${exam.id}/publish`, { token: admin, body: { published: true } }), 200, "final yayını");
  status(await patch(`/api/admin/courses/${course.id}/publish`, { token: admin, body: { published: true } }), 200, "kurs yayını");
  const tmpCourse = async () => (await get(`/api/courses/${course.id}`, { token: admin })).body.course;

  await step("V1", "Öğrenci sınavdayken admin bir sorunun şıklarını değiştirirse sınav yine gönderilebilir", "200, değişen soru boş sayılır", async () => {
    const s = await seedStudent("SikDegisti", "ALPHA");
    await completeAll(s.token, await tmpCourse());
    const start = await post(`/api/exams/courses/${course.id}/final/start`, { token: s.token });
    status(start, 201);
    const old = start.body.exam.questions.map((x) => ({ questionId: x.id, optionId: x.options[0].id })); // hepsi "Doğru"
    status(await put(`/api/admin/exams/${exam.id}/questions/${q[0].id}`, {
      token: admin,
      body: { text: "Soru 1 (düzeltildi)?", options: [{ text: "Yeni doğru", isCorrect: true }, { text: "Yeni yanlış", isCorrect: false }] },
    }), 200, "soru düzenleme");
    const res = await post(`/api/exams/attempts/${start.body.attempt.id}/submit`, { token: s.token, body: { answers: old } });
    status(res, 200, "gönderme");
    check(res.body.attempt.correctCount === 2 && res.body.attempt.totalCount === 3, JSON.stringify(res.body.attempt));
    return `200, ${res.body.attempt.correctCount}/${res.body.attempt.totalCount} doğru`;
  });

  await step("V2", "Öğrenci sınavdayken admin bir soruyu silerse sınav yine gönderilebilir", "200, silinen soru sayılmaz", async () => {
    const s = await seedStudent("SoruSilindi", "ALPHA");
    await completeAll(s.token, await tmpCourse());
    const start = await post(`/api/exams/courses/${course.id}/final/start`, { token: s.token });
    status(start, 201);
    const old = start.body.exam.questions.map((x) => ({ questionId: x.id, optionId: x.options[0].id }));
    status(await del(`/api/admin/exams/${exam.id}/questions/${q[2].id}`, { token: admin }), 204, "soru silme");
    const res = await post(`/api/exams/attempts/${start.body.attempt.id}/submit`, { token: s.token, body: { answers: old } });
    status(res, 200, "gönderme");
    eq(res.body.attempt.totalCount, 2, "soru sayısı");
    return `200, ${res.body.attempt.correctCount}/${res.body.attempt.totalCount} doğru`;
  });

  await step("V3", "Yayındaki sınavın son sorusu silinemez", "400, sınav yayında ve sorulu kalır", async () => {
    const c = (await post("/api/admin/courses", { token: admin, body: { title: `Tek soru ${run}`, summary: "Geçici", description: "Geçici", category: "Test", level: "ALL" } })).body.course;
    const tmp = (await post("/api/admin/exams", { token: admin, body: { type: "FINAL", title: "Tek soruluk", courseId: c.id } })).body.exam;
    cleanup.courses.push(tmp.courseId);
    const only = (await post(`/api/admin/exams/${tmp.id}/questions`, { token: admin, body: { text: "Tek soru?", options: [{ text: "A", isCorrect: true }, { text: "B", isCorrect: false }] } })).body.question;
    status(await patch(`/api/admin/exams/${tmp.id}/publish`, { token: admin, body: { published: true } }), 200, "yayın");
    const res = await del(`/api/admin/exams/${tmp.id}/questions/${only.id}`, { token: admin });
    const left = await prisma.question.count({ where: { examId: tmp.id } });
    check(res.status === 400 && left === 1, `silme ${res.status}, kalan soru ${left}`);
    return "400, soru duruyor";
  });

  await step("V4", "Yayındaki kursun son dersi silinemez", "400", async () => {
    const c = (await post("/api/admin/courses", { token: admin, body: { title: `Tek ders ${run}`, summary: "Geçici", description: "Geçici", category: "Test", level: "ALL" } })).body.course;
    cleanup.courses.push(c.id);
    const l = (await post(`/api/admin/courses/${c.id}/lessons`, { token: admin, body: { title: "Tek ders" } })).body.lesson;
    status(await patch(`/api/admin/courses/${c.id}/publish`, { token: admin, body: { published: true } }), 200, "yayın");
    const res = await del(`/api/admin/courses/${c.id}/lessons/${l.id}`, { token: admin });
    const left = await prisma.lesson.count({ where: { courseId: c.id } });
    check(res.status === 400 && left === 1, `silme ${res.status}, kalan ders ${left}`);
    return "400, ders duruyor";
  });

  await step("V5", "Sorusuz sınav, düzenleme isteğiyle de yayına alınamaz", "400, published=false", async () => {
    const e = (await post("/api/admin/exams", { token: admin, body: { type: "PLACEMENT", title: "Boş seviye sınavı" } })).body.exam;
    cleanup.exams.push(e.id);
    const res = await put(`/api/admin/exams/${e.id}`, { token: admin, body: { published: true } });
    const row = await prisma.exam.findUnique({ where: { id: e.id } });
    const live = await get("/api/exams/placement", { token: (await seedStudent("YeniGelen")).token });
    check(res.status === 400 && !row.published, `PUT ${res.status}, published=${row.published}`);
    eq(live.body.status, "PENDING", "yeni öğrencinin seviye sınavı");
    return "400; yeni öğrenci eski sınavı görmeye devam ediyor";
  });

  await step("V6", "Dersi olmayan kurs, oluşturma/düzenleme isteğiyle de yayına alınamaz", "400 / 400", async () => {
    const created = await post("/api/admin/courses", { token: admin, body: { title: `Boş kurs ${run}`, summary: "Geçici", description: "Geçici", category: "Test", level: "ALL", published: true } });
    if (created.body?.course) cleanup.courses.push(created.body.course.id);
    const c = (await post("/api/admin/courses", { token: admin, body: { title: `Boş kurs 2 ${run}`, summary: "Geçici", description: "Geçici", category: "Test", level: "ALL" } })).body.course;
    cleanup.courses.push(c.id);
    const updated = await put(`/api/admin/courses/${c.id}`, { token: admin, body: { published: true } });
    const live = await prisma.course.count({ where: { id: { in: [c.id, created.body?.course?.id ?? 0] }, published: true } });
    check(live === 0, `oluşturma ${created.status}, düzenleme ${updated.status}, yayında ${live} boş kurs`);
    return `oluşturma ${created.status}, düzenleme ${updated.status}; yayında boş kurs yok`;
  });

  await step("V7", "İkinci bir seviye sınavı düzenleme isteğiyle yayına alınırsa diğeri yayından kalkar", "yayında tek seviye sınavı", async () => {
    const e = (await post("/api/admin/exams", { token: admin, body: { type: "PLACEMENT", title: "İkinci seviye sınavı" } })).body.exam;
    cleanup.exams.push(e.id);
    await post(`/api/admin/exams/${e.id}/questions`, { token: admin, body: { text: "Soru?", options: [{ text: "A", isCorrect: true }, { text: "B", isCorrect: false }] } });
    await put(`/api/admin/exams/${e.id}`, { token: admin, body: { published: true } });
    const live = await prisma.exam.count({ where: { type: "PLACEMENT", published: true } });
    // Asıl seviye sınavını geri yayına al (diğer adımlar onu kullanıyor); yayından kalkan geçici sınav sonra silinir.
    await patch(`/api/admin/exams/${placement.id}/publish`, { token: admin, body: { published: true } });
    eq(live, 1, "yayındaki seviye sınavı sayısı");
    return "yayında tek seviye sınavı";
  });

  await step("V8", "Öğrenci finaldeyken kurs yayından kalkarsa sonuç kaydedilmez, kurs geri gelince sınava devam eder", "404, sonra aynı deneme 201", async () => {
    const s = await seedStudent("Yayindan", "BETA");
    await completeAll(s.token, await tmpCourse());
    const start = await post(`/api/exams/courses/${course.id}/final/start`, { token: s.token });
    status(start, 201);
    await patch(`/api/admin/courses/${course.id}/publish`, { token: admin, body: { published: false } });
    const sub = await post(`/api/exams/attempts/${start.body.attempt.id}/submit`, { token: s.token, body: { answers: [] } });
    await patch(`/api/admin/courses/${course.id}/publish`, { token: admin, body: { published: true } });
    status(sub, 404, "yayından kalkmış kursta gönderme");
    const again = await post(`/api/exams/courses/${course.id}/final/start`, { token: s.token });
    status(again, 201);
    eq(again.body.attempt.id, start.body.attempt.id, "aynı deneme");
    return "404 → kurs geri gelince aynı deneme";
  });

  await step("V9", "Final geçildikten sonra kursa ders eklenirse 'geçti' bilgisi korunur", "finalPassed=true, yeniden başlatma 409", async () => {
    const s = await seedStudent("SonradanDers", "ALPHA");
    await completeAll(s.token, await tmpCourse());
    const start = await post(`/api/exams/courses/${course.id}/final/start`, { token: s.token });
    const key = await answerKey(exam.id);
    status(await post(`/api/exams/attempts/${start.body.attempt.id}/submit`, { token: s.token, body: { answers: answers(key, key.length) } }), 200);
    const extra = (await post(`/api/admin/courses/${course.id}/lessons`, { token: admin, body: { title: "Sonradan eklenen" } })).body.lesson;
    const detail = (await get(`/api/courses/${course.id}`, { token: s.token })).body.course;
    const again = await post(`/api/exams/courses/${course.id}/final/start`, { token: s.token });
    await del(`/api/admin/courses/${course.id}/lessons/${extra.id}`, { token: admin });
    check(detail.finalExam.passed === true && detail.progress.percent < 100, JSON.stringify(detail.progress));
    status(again, 409, "yeniden başlatma");
    return `ilerleme %${detail.progress.percent}, final geçti; yeniden başlatma 409`;
  });

  // ================= UÇ GİRDİLER =================
  setGroup("Uç ve bozuk girdiler");

  await step("U1", "E-posta büyük harf ve boşlukla yazılsa da aynı hesaba girilir", "201, küçük harfle giriş 200", async () => {
    const tag = `Buyuk-${run}`;
    const res = await post("/api/auth/register", { body: { ...newStudent("Buyuk"), email: `  ${tag.toUpperCase()}@Test.DEV ` } });
    status(res, 201);
    eq(res.body.user.email, `${tag.toLowerCase()}@test.dev`, "kayıtlı e-posta");
    status(await post("/api/auth/login", { body: { email: `${tag.toLowerCase()}@test.dev`, password: "Sifre12345" } }), 200, "giriş");
    return `${res.body.user.email}`;
  });

  await step("U2", "Türkçe klavyede büyük 'İ' ile yazılan e-posta doğru küçültülür", "201, e-posta 'i' ile kaydedilir", async () => {
    const res = await post("/api/auth/register", { body: { ...newStudent("Ilayda"), email: `İLAYDA-${run}@TEST.DEV` } });
    status(res, 201);
    eq(res.body.user.email, `ilayda-${run}@test.dev`, "kayıtlı e-posta");
    return res.body.user.email;
  });

  await step("U3", "1 MB'tan büyük istek anlaşılır bir hatayla (413) reddedilir", "413", async () => {
    const res = await post(`/api/courses/${ALL.id}/comments`, { token: ayse.token, raw: JSON.stringify({ content: "a".repeat(1_500_000) }) });
    status(res, 413);
    check(typeof res.body?.error === "string", "hata mesajı yok");
    return `413: ${res.body.error}`;
  });

  await step("U4", "Bozuk JSON ve yanlış veri türleri 400 döner", "400 × 5", async () => {
    const id = (await post("/api/exams/placement/start", { token: ali.token })).body.attempt.id;
    const checks = [
      await post("/api/auth/login", { raw: '{"email": "a@b.c", ' }),
      await post(`/api/exams/attempts/${id}/submit`, { token: ali.token, body: { answers: "hepsi A" } }),
      await post(`/api/exams/attempts/${id}/submit`, { token: ali.token, body: { answers: [{ questionId: "1", optionId: "2" }] } }),
      await post(`/api/courses/${ALL.id}/comments`, { token: ayse.token, body: { content: 12345 } }),
      await post(`/api/exams/attempts/${id}/submit`, { token: ali.token, body: { answers: Array.from({ length: 501 }, () => ({ questionId: 1, optionId: null })) } }),
    ];
    eq(statuses(checks), "400,400,400,400,400", "durumlar");
    return "beşi de 400";
  });

  await step("U5", "Çok büyük kimlik numarası sunucu hatası değil 'geçersiz kimlik' verir", "400 / 400 / 400", async () => {
    const big = "99999999999";
    const list = [
      await get(`/api/courses/${big}`),
      await get(`/api/exams/attempts/${big}`, { token: ayse.token }),
      await get(`/api/admin/users/${big}`, { token: admin }),
    ];
    eq(statuses(list), "400,400,400", "durumlar");
    return "400 × 3";
  });

  await step("U6", "Metinde görünmez NUL karakteri sunucu hatası vermez", "400 / 400", async () => {
    const a = await post(`/api/courses/${ALL.id}/comments`, { token: ayse.token, body: { content: "merhaba\u0000dünya" } });
    const b = await patch("/api/auth/me", { token: ayse.token, body: { school: "Okul\u0000Adı" } });
    eq(statuses([a, b]), "400,400", "durumlar");
    return "400, 400";
  });

  await step("U7", "Doğum tarihi gelecekte, 1900 öncesi veya takvimde olmayan bir gün olamaz", "kayıt 400×3, profil 400", async () => {
    const reg = [];
    for (const birthDate of ["2999-01-01", "1899-12-31", "2008-02-30"]) {
      reg.push(await post("/api/auth/register", { body: { ...newStudent("Tarih"), birthDate } }));
    }
    const prof = await patch("/api/auth/me", { token: ayse.token, body: { birthDate: "2999-01-01" } });
    eq(statuses(reg), "400,400,400", `kayıt durumları (${reg.map((r) => r.body?.user?.birthDate ?? r.status).join(" | ")})`);
    status(prof, 400, "profilde gelecek tarih");
    return "kayıt 400×3, profil 400";
  });

  await step("U8", "Yorum sınırları: 1000 karakter olur, 1001 ve sadece boşluk olmaz; emoji ve Türkçe karakter bozulmaz", "201, 400, 400, metin aynı", async () => {
    const ok = await post(`/api/courses/${ALL.id}/comments`, { token: ayse.token, body: { content: "ş".repeat(1000) } });
    const long = await post(`/api/courses/${ALL.id}/comments`, { token: ayse.token, body: { content: "ş".repeat(1001) } });
    const blank = await post(`/api/courses/${ALL.id}/comments`, { token: ayse.token, body: { content: "   \n\t  " } });
    const text = "Çok güzel ders 👍 İğneada'dan selamlar <b>kalın</b>";
    const uni = await post(`/api/courses/${ALL.id}/comments`, { token: ayse.token, body: { content: text } });
    eq(statuses([ok, long, blank, uni]), "201,400,400,201", "durumlar");
    eq(uni.body.comment.content, text, "metin");
    return "1000 → 201, 1001 → 400, boşluk → 400, emoji/Türkçe aynen";
  });

  await step("U9", "Aramada % ve _ karakterleri joker değil düz metin sayılır", "200, 0 sonuç", async () => {
    const a = await get(`/api/courses?search=${encodeURIComponent("%")}`);
    const b = await get(`/api/courses?search=${encodeURIComponent("_")}`);
    eq(statuses([a, b]), "200,200", "durumlar");
    check(a.body.courses.length === 0 && b.body.courses.length === 0, `% → ${a.body.courses.length}, _ → ${b.body.courses.length} kurs`);
    return "0 ve 0 sonuç";
  });

  await step("U10", "Kurs listesinde geçersiz filtre değerleri 400 döner", "400 × 4", async () => {
    const list = [
      await get("/api/courses?limit=0"),
      await get("/api/courses?limit=abc"),
      await get("/api/courses?sort=rastgele"),
      await get("/api/courses?level=ALPHA&level=BETA"),
    ];
    eq(statuses(list), "400,400,400,400", "durumlar");
    return "400 × 4";
  });

  await step("U11", "Yazılım alanı seçiminde olmayan alan anahtarları reddedilir", "400 / 404 / 404", async () => {
    const a = await put("/api/career", { token: ayse.token, body: { field: "__proto__" } });
    const b = await get("/api/career/constructor");
    const c = await get("/api/career/__proto__");
    eq(statuses([a, b, c]), "400,404,404", "durumlar");
    return "400, 404, 404";
  });

  await step("U12", "Ad ve soyad sadece boşluk veya 50 karakterden uzun olamaz", "400 / 400", async () => {
    const a = await post("/api/auth/register", { body: { ...newStudent("x"), firstName: "    " } });
    const b = await post("/api/auth/register", { body: { ...newStudent("x"), lastName: "Ç".repeat(51) } });
    eq(statuses([a, b]), "400,400", "durumlar");
    return "400, 400";
  });


  // ================= 4. TUR =================
  setGroup("4. tur: sınav kuralları ve yönetim güvenceleri");
  const expire = (id) => prisma.examAttempt.update({ where: { id }, data: { startedAt: new Date(Date.now() - 3 * 3600 * 1000) } });

  await step("R1", "Seviye sınavını açıp süreyi dolduran öğrenci, işaretlediği cevaplarla puanlanır ve sınava yeniden giremez", "durum DONE, kaydedilen cevaplarla sınıf, yeniden başlatma 409", async () => {
    const s = await seedStudent("SureDoldu");
    const start = await post("/api/exams/placement/start", { token: s.token });
    status(start, 201);
    check(start.body.serverNow && start.body.draft, "başlatma yanıtında serverNow/draft yok");
    const key = await answerKey(start.body.exam.id);
    status(await put(`/api/exams/attempts/${start.body.attempt.id}/answers`, { token: s.token, body: { answers: answers(key, passCount) } }), 204, "cevap kaydı");
    await expire(start.body.attempt.id);
    const st = await get("/api/exams/placement", { token: s.token });
    eq(st.body.status, "DONE", "durum");
    eq(st.body.level, "BETA", "sınıf");
    status(await post("/api/exams/placement/start", { token: s.token }), 409, "yeniden başlatma");
    return `DONE, BETA (${st.body.attempt.correctCount}/${N}), yeniden başlatma 409`;
  });

  await step("R2", "Finali açıp hiç cevap vermeden süreyi dolduran öğrenci kalmış sayılır, ilerlemesi sıfırlanır", "final kaldı, ilerleme %0", async () => {
    const s = await seedStudent("FinalKacti", "ALPHA");
    await completeAll(s.token, ALL);
    const start = await post(`/api/exams/courses/${ALL.id}/final/start`, { token: s.token });
    status(start, 201);
    await expire(start.body.attempt.id);
    const detail = (await get(`/api/courses/${ALL.id}`, { token: s.token })).body.course;
    check(detail.finalExam.attempts.length === 1 && detail.finalExam.attempts[0].passed === false, JSON.stringify(detail.finalExam.attempts));
    eq(detail.progress.percent, 0, "ilerleme");
    return "kaldı (%0 puan), ilerleme %0";
  });

  await step("R3", "Süre bittikten sonra gönderilen cevaplar yerine süre içinde kaydedilenler puanlanır", "200, expired=true, kaydedilen cevaplar", async () => {
    const s = await seedStudent("GecGonderen");
    const start = await post("/api/exams/placement/start", { token: s.token });
    const key = await answerKey(start.body.exam.id);
    await put(`/api/exams/attempts/${start.body.attempt.id}/answers`, { token: s.token, body: { answers: answers(key, 1) } });
    await expire(start.body.attempt.id);
    status(await put(`/api/exams/attempts/${start.body.attempt.id}/answers`, { token: s.token, body: { answers: answers(key, N) } }), 409, "süre sonrası kayıt");
    const res = await post(`/api/exams/attempts/${start.body.attempt.id}/submit`, { token: s.token, body: { answers: answers(key, N) } });
    status(res, 200);
    check(res.body.expired === true && res.body.attempt.correctCount === 1, JSON.stringify(res.body.attempt));
    return `expired, ${res.body.attempt.correctCount}/${N} doğru → ${res.body.user.level}`;
  });

  await step("R4", "Öğrenci sınavdayken admin sınavı yayından kaldırırsa cevaplar puanlanmaz", "409 EXAM_CHANGED, sınıf atanmaz", async () => {
    const s = await seedStudent("Duzeltme", "ALPHA");
    await completeAll(s.token, await tmpCourse());
    const start = await post(`/api/exams/courses/${course.id}/final/start`, { token: s.token });
    status(start, 201);
    await patch(`/api/admin/exams/${exam.id}/publish`, { token: admin, body: { published: false } });
    const res = await post(`/api/exams/attempts/${start.body.attempt.id}/submit`, { token: s.token, body: { answers: [] } });
    await patch(`/api/admin/exams/${exam.id}/publish`, { token: admin, body: { published: true } });
    status(res, 409);
    eq(res.body.code, "EXAM_CHANGED", "kod");
    eq((await get(`/api/courses/${course.id}`, { token: s.token })).body.course.progress.percent, 100, "ilerleme korunur");
    return "409 EXAM_CHANGED, ilerleme %100 kaldı";
  });

  await step("R5", "Geçme notu yuvarlamayla aşılamaz", "barajın hemen altı kalır", async () => {
    // 3 soruluk sınavda 2 doğru = %66,7 → yuvarlanınca 67; baraj 67 iken kalmalı.
    const c = (await post("/api/admin/courses", { token: admin, body: { title: `Baraj ${run}`, summary: "Geçici", description: "Geçici", category: "Test", level: "ALL" } })).body.course;
    cleanup.courses.push(c.id);
    const l = (await post(`/api/admin/courses/${c.id}/lessons`, { token: admin, body: { title: "Ders" } })).body.lesson;
    await patch(`/api/admin/courses/${c.id}/publish`, { token: admin, body: { published: true } });
    const e = (await post("/api/admin/exams", { token: admin, body: { type: "FINAL", title: "Baraj finali", courseId: c.id, passingScore: 67 } })).body.exam;
    for (let i = 0; i < 3; i++) await post(`/api/admin/exams/${e.id}/questions`, { token: admin, body: { text: `S${i}?`, options: [{ text: "D", isCorrect: true }, { text: "Y", isCorrect: false }] } });
    await patch(`/api/admin/exams/${e.id}/publish`, { token: admin, body: { published: true } });
    const s = await seedStudent("Baraj", "BETA");
    await post(`/api/courses/${c.id}/lessons/${l.id}/complete`, { token: s.token });
    const start = await post(`/api/exams/courses/${c.id}/final/start`, { token: s.token });
    const key = await answerKey(e.id);
    const res = await post(`/api/exams/attempts/${start.body.attempt.id}/submit`, { token: s.token, body: { answers: answers(key, 2) } });
    check(res.body.attempt.score === 67 && res.body.attempt.passed === false, JSON.stringify(res.body.attempt));
    return "puan %67 (aslında %66,7), kaldı";
  });

  await step("R6", "Admin hesabı ders ilerlemesi oluşturamaz, popülerlik sayısına karışmaz", "403", async () => {
    status(await post(`/api/courses/${ALL.id}/lessons/${ALL.lessons[0].id}/complete`, { token: admin }), 403);
    return "403";
  });

  await step("R7", "Yayındaki sınav ve sonucu olan sınav silinemez; denemesi olan final başka kursa taşınamaz", "409 / 409 / 409", async () => {
    const a = await del(`/api/admin/exams/${placement.id}`, { token: admin });
    const finalId = ALL.finalExam.id;
    await patch(`/api/admin/exams/${finalId}/publish`, { token: admin, body: { published: false } });
    const b = await del(`/api/admin/exams/${finalId}`, { token: admin });
    const c = await put(`/api/admin/exams/${finalId}`, { token: admin, body: { courseId: course.id } });
    await patch(`/api/admin/exams/${finalId}/publish`, { token: admin, body: { published: true } });
    eq(`${a.status},${b.status},${c.status}`, "409,409,409", "durumlar");
    return "409, 409, 409";
  });

  await step("R8", "Son admin öğrenci yapılamaz ve silinemez (iki admin aynı anda birbirini düşüremez)", "biri 200, diğeri 400; en az bir admin", async () => {
    const other = await seedStudent("IkinciAdmin");
    await prisma.user.update({ where: { id: other.user.id }, data: { role: "ADMIN" } });
    const me = (await get("/api/auth/me", { token: admin })).body.user;
    const list = await Promise.all([
      patch(`/api/admin/users/${other.user.id}`, { token: admin, body: { role: "STUDENT" } }),
      patch(`/api/admin/users/${me.id}`, { token: other.token, body: { role: "STUDENT" } }),
    ]);
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    // Asıl admin düşürüldüyse geri al (sonraki adımlar onu kullanıyor).
    await prisma.user.update({ where: { id: me.id }, data: { role: "ADMIN" } });
    check(admins >= 1, `${admins} admin kaldı (${sortedStatuses(list)})`);
    return `${sortedStatuses(list)}, ${admins} admin kaldı`;
  });

  await step("R9", "Şifre sıfırlama bağlantısı aynı anda iki kez kullanılamaz", "200 + 400", async () => {
    const s = await seedStudent("IkiSekme");
    await post("/api/auth/forgot-password", { body: { email: s.email } });
    const token = await lastResetToken();
    if (!token) throw new Fail("SERVER_LOG verilmedi ya da logda sıfırlama bağlantısı yok");
    const body = { token, password: "Sifirla12345", confirmPassword: "Sifirla12345" };
    const list = await Promise.all([1, 2].map(() => post("/api/auth/reset-password", { body })));
    eq(sortedStatuses(list), "200,400", "durumlar");
    return "200, 400";
  });

  await step("R10", "Çok derin iç içe JSON sunucu hatası vermez; silinmiş kursa ders eklemek 404 döner", "400 / 404", async () => {
    const deep = await post("/api/auth/login", { raw: "[".repeat(200000) + "]".repeat(200000) });
    const gone = await post("/api/admin/courses/2147483000/lessons", { token: admin, body: { title: "Ders" } });
    eq(`${deep.status},${gone.status}`, "400,404", "durumlar");
    return "400, 404";
  });

  await step("R11", "'Bana açık' filtresi açık bir sınıf filtresiyle birlikte doğru çalışır", "ALPHA öğrenciye level=BETA&mine=true → 0 kurs", async () => {
    const s = await seedStudent("Filtre", "ALPHA");
    const res = await get("/api/courses?level=BETA&mine=true", { token: s.token });
    eq(res.body.courses.length, 0, "kurs sayısı");
    return "0 kurs";
  });

  await step("R12", "Admin yayında olmayan kursun yorumlarını görebilir, öğrenci göremez", "200 / 404", async () => {
    await patch(`/api/admin/courses/${course.id}/publish`, { token: admin, body: { published: false } });
    const a = await get(`/api/courses/${course.id}/comments`, { token: admin });
    const b = await get(`/api/courses/${course.id}/comments`, { token: ayse.token });
    await patch(`/api/admin/courses/${course.id}/publish`, { token: admin, body: { published: true } });
    eq(`${a.status},${b.status}`, "200,404", "durumlar");
    return "200, 404";
  });

  await step("R13", "Şifremi unuttum: kayıtlı ve kayıtsız adrese cevap süresi yakın (e-posta beklenmiyor)", "fark < 300 ms", async () => {
    const s = await seedStudent("Zaman");
    const t0 = Date.now();
    await post("/api/auth/forgot-password", { body: { email: s.email } });
    const t1 = Date.now();
    await post("/api/auth/forgot-password", { body: { email: `yok-${run}@test.dev` } });
    const t2 = Date.now();
    const diff = Math.abs(t1 - t0 - (t2 - t1));
    check(diff < 300, `fark ${diff} ms`);
    return `kayıtlı ${t1 - t0} ms, kayıtsız ${t2 - t1} ms`;
  });

  // ================= 5. TUR =================
  setGroup("5. tur: okul laboratuvarı ve giriş sınırları");

  await step("Z1", "Aynı okul ağından (tek IP) 35 öğrenci arka arkaya giriş yapabilir", "35 × 200", async () => {
    const list = [];
    for (let i = 0; i < 35; i++) list.push(await seedStudent(`Sinif${i}`, "ALPHA"));
    const codes = [];
    for (const s of list) codes.push((await post("/api/auth/login", { body: { email: s.email, password: s.password } })).status);
    const ok = codes.filter((c) => c === 200).length;
    check(ok === 35, `35 öğrenciden ${ok} giriş yapabildi (${[...new Set(codes)].join(",")})`);
    return "35/35 giriş";
  });

  await step("Z2", "Bir hesaba art arda yanlış şifre denenince o hesap kilitlenir, aynı ağdaki diğer öğrenciler etkilenmez", "11. denemede 429, diğer öğrenci 200", async () => {
    const victim = await seedStudent("Hedef", "ALPHA");
    const other = await seedStudent("Yandaki", "ALPHA");
    let n = 0;
    let res;
    do {
      res = await post("/api/auth/login", { body: { email: victim.email, password: "yanlis-sifre" } });
      n++;
    } while (res.status === 401 && n < 30);
    eq(res.status, 429, "kilit");
    const fine = await post("/api/auth/login", { body: { email: other.email, password: other.password } });
    eq(fine.status, 200, "diğer öğrenci");
    return `${n}. denemede 429, diğer öğrenci 200`;
  });

  await step("Z3", "Aynı adrese art arda şifre sıfırlama e-postası istenemez", "6. istekte 429", async () => {
    const s = await seedStudent("Sifirla5", "ALPHA");
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await post("/api/auth/forgot-password", { body: { email: s.email } })).status);
    eq(codes.join(","), "200,200,200,200,200,429", "durumlar");
    return codes.join(", ");
  });

  // ---------- temizlik ----------
  for (const id of cleanup.exams) await del(`/api/admin/exams/${id}`, { token: admin });
  for (const id of cleanup.courses) await del(`/api/admin/courses/${id}`, { token: admin });
}

runMain(main);
