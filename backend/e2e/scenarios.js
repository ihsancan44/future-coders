// Uçtan uca senaryo testleri: çalışan sunucuya HTTP ile bağlanır ve misafir, yeni kayıt,
// ALFA öğrenci, BETA öğrenci ve admin akışlarını adım adım dener.
//
// Kullanım (boş ve seed edilmiş bir veritabanı üzerinde, sunucu çalışırken):
//   npm run db:seed && npm start            # ayrı bir terminalde
//   npm run test:e2e                        # sonuçlar ekrana, istenirse E2E_OUT dosyasına yazılır
//
// Doğru cevaplar test sırasında veritabanından okunur; bu yüzden betik sunucuyla aynı DATABASE_URL'i kullanır.
// Giriş/kayıt hız sınırını (15 dakikada 30 istek) son senaryo bilerek aşar; betiği tekrar çalıştırmadan önce sunucuyu yeniden başlatın.
import fs from "node:fs";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  BASE,
  Fail,
  SERVER_LOG,
  check,
  completeAll,
  del,
  eq,
  get,
  levelsOf,
  newStudent,
  patch,
  post,
  prisma,
  put,
  register,
  run,
  runMain,
  setGroup,
  status,
  step,
  takeFinal,
  takePlacement,
} from "./helpers.js";

// ---------- senaryolar ----------
async function main() {
  const courses = await prisma.course.findMany({
    where: { published: true },
    include: { lessons: { orderBy: { order: "asc" } }, finalExam: true },
    orderBy: { id: "asc" },
  });
  const byLevel = (lvl) => courses.filter((c) => c.level === lvl);
  const ALL = byLevel("ALL")[0];
  const ALPHA = byLevel("ALPHA")[0];
  const BETA = byLevel("BETA")[0];
  check(ALL && ALPHA && BETA, "Seed verisinde ALL, ALPHA ve BETA kursu olmalı (npm run db:seed).");
  const placement = await prisma.exam.findFirst({ where: { type: "PLACEMENT", published: true }, include: { questions: true } });
  const N = placement.questions.length;
  const passCount = Math.ceil((placement.passingScore / 100) * N);

  // ================= MİSAFİR =================
  setGroup("Misafir (giriş yapmamış ziyaretçi)");
  await step("M1", "Kurs listesi açılır, her kurs 'giriş yapın' kilidiyle gelir", "200, tüm kurslarda canAccess=false, LOGIN_REQUIRED", async () => {
    const res = await get("/api/courses");
    status(res, 200);
    check(res.body.courses.length === courses.length, `kurs sayısı ${res.body.courses.length}`);
    check(res.body.courses.every((c) => !c.access.canAccess && c.access.reason === "LOGIN_REQUIRED"), "kilitsiz kurs var");
    return `${res.body.courses.length} kurs, hepsi kilitli (LOGIN_REQUIRED)`;
  });
  await step("M2", "Kurs detayında ders içeriği ve video gizlenir", "ders başlıkları var, content/videoUrl yok", async () => {
    const res = await get(`/api/courses/${ALPHA.id}`);
    status(res, 200);
    check(res.body.course.lessons.every((l) => !("content" in l) && !("videoUrl" in l)), "içerik sızdı");
    return `${res.body.course.lessons.length} ders başlığı, içerik ve video yok`;
  });
  await step("M3", "Ders tamamlama, seviye sınavı ve yorum yazma giriş ister", "401", async () => {
    status(await post(`/api/courses/${ALL.id}/lessons/${ALL.lessons[0].id}/complete`), 401, "ders tamamlama");
    status(await get("/api/exams/placement"), 401, "seviye sınavı");
    status(await post(`/api/courses/${ALL.id}/comments`, { body: { content: "Merhaba" } }), 401, "yorum");
    return "üçü de 401";
  });
  await step("M4", "Admin paneli API'si kapalı", "401", async () => {
    status(await get("/api/admin/stats"), 401);
    return "401";
  });
  await step("M5", "Geçersiz / sahte token reddedilir", "401", async () => {
    status(await get("/api/auth/me", { token: "sahte.token.degeri" }), 401);
    return "401";
  });
  await step("M6", "Olmayan kurs 404, bozuk kimlik 400 döner", "404 / 400", async () => {
    status(await get("/api/courses/99999"), 404, "olmayan kurs");
    status(await get("/api/courses/abc"), 400, "bozuk kimlik");
    return "404 ve 400";
  });
  await step("M7", "Blog (Roadmap) sadece yayındaki yazıları gösterir", "200, published=true", async () => {
    const res = await get("/api/blog");
    status(res, 200);
    check(res.body.posts.length > 0 && res.body.posts.every((p) => p.published), "yayında olmayan yazı listelendi");
    return `${res.body.posts.length} yazı`;
  });

  // ================= YENİ KAYIT =================
  setGroup("Yeni kayıt olan öğrenci");
  const base = newStudent("Yeni");
  await step("Y1", "Boş form reddedilir, alan hataları döner", "400 + alan bazlı hata", async () => {
    const res = await post("/api/auth/register", { body: {} });
    status(res, 400);
    return `400: ${Object.keys(res.body.fields || {}).join(", ")}`;
  });
  await step("Y2", "Kısa şifre, eşleşmeyen şifre, geçersiz e-posta ve gelecekteki doğum tarihi reddedilir", "dördü de 400", async () => {
    const cases = {
      "kısa şifre": { password: "123", confirmPassword: "123" },
      "şifreler eşleşmiyor": { confirmPassword: "Baska12345" },
      "geçersiz e-posta": { email: "eposta-degil" },
      "gelecek doğum tarihi": { birthDate: "2099-01-01" },
    };
    const out = [];
    for (const [name, over] of Object.entries(cases)) {
      const res = await post("/api/auth/register", { body: { ...base, ...over } });
      status(res, 400, name);
      out.push(`${name}: "${Object.values(res.body.fields || {})[0] || res.body.error}"`);
    }
    return out.join(" · ");
  });
  let fresh;
  await step("Y3", "Geçerli bilgilerle kayıt olunur", "201, token, rol STUDENT, sınıf boş, şifre özeti dönmez", async () => {
    const res = await post("/api/auth/register", { body: base });
    status(res, 201);
    eq(res.body.user.role, "STUDENT", "rol");
    eq(res.body.user.level, null, "sınıf");
    check(!JSON.stringify(res.body).includes("passwordHash"), "şifre özeti cevapta");
    fresh = { ...base, token: res.body.token, user: res.body.user };
    return `201, kullanıcı #${res.body.user.id}, sınıf yok`;
  });
  await step("Y4", "Aynı e-posta (büyük harfle bile) ikinci kez kayıt olamaz", "409", async () => {
    const res = await post("/api/auth/register", { body: { ...base, email: base.email.toUpperCase() } });
    status(res, 409);
    return `409: ${res.body.error}`;
  });
  await step("Y5", "Yanlış şifreyle giriş reddedilir, doğru şifreyle giriş yapılır", "401 sonra 200", async () => {
    status(await post("/api/auth/login", { body: { email: base.email, password: "Yanlis12345" } }), 401, "yanlış şifre");
    const ok = await post("/api/auth/login", { body: { email: base.email, password: base.password } });
    status(ok, 200, "doğru şifre");
    fresh.token = ok.body.token;
    return "401 → 200";
  });
  await step("Y6", "Seviye sınavından önce hiçbir kurs açılmaz", "tüm kurslarda PLACEMENT_REQUIRED", async () => {
    const res = await get("/api/courses", { token: fresh.token });
    check(res.body.courses.every((c) => !c.access.canAccess && c.access.reason === "PLACEMENT_REQUIRED"), "açık kurs var");
    return `${res.body.courses.length} kursun hepsi kilitli`;
  });
  await step("Y7", "Sınavdan önce ders tamamlama, yorum ve final testi engellenir", "403 PLACEMENT_REQUIRED", async () => {
    const a = await post(`/api/courses/${ALL.id}/lessons/${ALL.lessons[0].id}/complete`, { token: fresh.token });
    status(a, 403, "ders tamamlama");
    eq(a.body.code, "PLACEMENT_REQUIRED", "hata kodu");
    status(await post(`/api/courses/${ALL.id}/comments`, { token: fresh.token, body: { content: "Merhaba" } }), 403, "yorum");
    status(await post(`/api/exams/courses/${ALL.id}/final/start`, { token: fresh.token }), 403, "final");
    return "üçü de 403";
  });
  await step("Y8", "Alan seçimi final testi geçilmeden yapılamaz", "403 FINAL_REQUIRED", async () => {
    const res = await put("/api/career", { token: fresh.token, body: { field: "frontend" } });
    status(res, 403);
    eq(res.body.code, "FINAL_REQUIRED", "hata kodu");
    return "403 FINAL_REQUIRED";
  });
  await step("Y9", "Seviye sınavı bekliyor görünür", `PENDING, ${N} soru`, async () => {
    const res = await get("/api/exams/placement", { token: fresh.token });
    eq(res.body.status, "PENDING", "durum");
    eq(res.body.exam.questionCount, N, "soru sayısı");
    return `PENDING, ${N} soru, ${res.body.exam.durationMinutes} dk`;
  });
  let freshAttempt;
  await step("Y10", "Sınav başlar; sorularda doğru cevap bilgisi yoktur", "201, isCorrect alanı yok", async () => {
    const res = await post("/api/exams/placement/start", { token: fresh.token });
    status(res, 201);
    check(!JSON.stringify(res.body).includes("isCorrect"), "doğru cevap bilgisi sızdı");
    freshAttempt = res.body;
    return `deneme #${res.body.attempt.id}, ${res.body.exam.questions.length} soru`;
  });
  await step("Y11", "Sayfa yenilenip sınav yeniden açılınca aynı deneme devam eder", "aynı deneme kimliği", async () => {
    const res = await post("/api/exams/placement/start", { token: fresh.token });
    eq(res.body.attempt.id, freshAttempt.attempt.id, "deneme");
    return `deneme #${res.body.attempt.id}`;
  });
  await step("Y12", "Başka sınavın sorusu veya geçersiz şık gönderilemez", "400", async () => {
    const other = await prisma.question.findFirst({ where: { examId: { not: freshAttempt.exam.id } } });
    const q = freshAttempt.exam.questions[0];
    status(await post(`/api/exams/attempts/${freshAttempt.attempt.id}/submit`, { token: fresh.token, body: { answers: [{ questionId: other.id, optionId: null }] } }), 400, "yabancı soru");
    const foreignOption = await prisma.option.findFirst({ where: { questionId: { not: q.id } } });
    status(await post(`/api/exams/attempts/${freshAttempt.attempt.id}/submit`, { token: fresh.token, body: { answers: [{ questionId: q.id, optionId: foreignOption.id }] } }), 400, "başka sorunun şıkkı");
    return "ikisi de 400, deneme açık kaldı";
  });
  await step("Y13", "Profil bilgileri güncellenir", "200, yeni okul adı", async () => {
    const res = await patch("/api/auth/me", { token: fresh.token, body: { school: "Kadıköy Fen Lisesi" } });
    status(res, 200);
    eq(res.body.user.school, "Kadıköy Fen Lisesi", "okul");
    return res.body.user.school;
  });
  await step("Y14", "Şifre değiştirme: yanlış mevcut şifre reddedilir, doğrusu kabul edilir, yeni şifreyle giriş yapılır", "400 → 200 → 200", async () => {
    status(await post("/api/auth/change-password", { token: fresh.token, body: { currentPassword: "Yanlis1234", newPassword: "YeniSifre123" } }), 400, "yanlış mevcut şifre");
    status(await post("/api/auth/change-password", { token: fresh.token, body: { currentPassword: base.password, newPassword: "YeniSifre123" } }), 200, "değiştirme");
    status(await post("/api/auth/login", { body: { email: base.email, password: "YeniSifre123" } }), 200, "yeni şifreyle giriş");
    return "400 → 200 → 200";
  });
  await step("Y15", "Şifremi unuttum: kayıtlı ve kayıtsız e-postaya aynı cevap, bağlantıyla şifre sıfırlanır, bağlantı ikinci kez çalışmaz", "aynı mesaj, 400 → 200 → 400", async () => {
    const a = await post("/api/auth/forgot-password", { body: { email: base.email } });
    const b = await post("/api/auth/forgot-password", { body: { email: `yok-${run}@test.dev` } });
    status(a, 200);
    eq(a.body.message, b.body.message, "mesajlar aynı olmalı");
    status(await post("/api/auth/reset-password", { body: { token: "gecersiz-token-123", password: "Sifirla12345", confirmPassword: "Sifirla12345" } }), 400, "geçersiz bağlantı");
    if (!SERVER_LOG) return "aynı mesaj, geçersiz bağlantı 400 (bağlantıyla sıfırlama için SERVER_LOG verilmedi)";
    await new Promise((r) => setTimeout(r, 300));
    const log = fs.readFileSync(SERVER_LOG, "utf8");
    const token = [...log.matchAll(/reset-password\?token=([a-f0-9]+)/g)].at(-1)?.[1]; // kayıtsız adrese e-posta gitmez, son bağlantı kayıtlı adresinki
    check(token, "sunucu logunda sıfırlama bağlantısı yok");
    status(await post("/api/auth/reset-password", { body: { token, password: "Sifirla12345", confirmPassword: "Sifirla12345" } }), 200, "sıfırlama");
    status(await post("/api/auth/reset-password", { body: { token, password: "Sifirla12345", confirmPassword: "Sifirla12345" } }), 400, "ikinci kullanım");
    const login = await post("/api/auth/login", { body: { email: base.email, password: "Sifirla12345" } });
    status(login, 200, "yeni şifreyle giriş");
    fresh.token = login.body.token;
    return "aynı mesaj; bağlantı 200, tekrar 400; yeni şifreyle giriş 200";
  });
  await step("Y16", "Öğrenci admin API'sine giremez", "403", async () => {
    status(await get("/api/admin/stats", { token: fresh.token }), 403);
    status(await get("/api/admin/users", { token: fresh.token }), 403);
    return "403";
  });

  // ================= ALFA =================
  setGroup("ALFA öğrenci");
  const alpha = await register("Alfa");
  await step("A1", `Seviye sınavında %${placement.passingScore} altı alan öğrenci ALFA olur`, `${passCount - 1}/${N} doğru → ALPHA`, async () => {
    const r = await takePlacement(alpha, passCount - 1);
    eq(r.attempt.assignedLevel, "ALPHA", "atanan sınıf");
    eq(r.user.level, "ALPHA", "kullanıcı sınıfı");
    return `puan %${r.attempt.score} → ${r.user.level}`;
  });
  await step("A2", "Seviye sınavı ikinci kez çözülemez", "409 PLACEMENT_DONE, durum DONE", async () => {
    const res = await post("/api/exams/placement/start", { token: alpha.token });
    status(res, 409);
    eq(res.body.code, "PLACEMENT_DONE", "hata kodu");
    eq((await get("/api/exams/placement", { token: alpha.token })).body.status, "DONE", "durum");
    return "409, DONE";
  });
  await step("A3", "Kurs listesinde ALFA ve herkese açık kurslar açık, BETA kursları kilitli", "BETA → LEVEL_MISMATCH", async () => {
    const res = await get("/api/courses", { token: alpha.token });
    const open = res.body.courses.filter((c) => c.access.canAccess);
    const locked = res.body.courses.filter((c) => !c.access.canAccess);
    eq(levelsOf(open), "ALL,ALPHA", "açık kurs seviyeleri");
    eq(levelsOf(locked), "BETA", "kilitli kurs seviyeleri");
    check(locked.every((c) => c.access.reason === "LEVEL_MISMATCH"), "kilit nedeni");
    return `${open.length} açık (ALL, ALPHA), ${locked.length} kilitli (BETA)`;
  });
  await step("A4", "'Bana açık olanlar' filtresi sadece ALFA ve herkese açık kursları getirir", "ALL,ALPHA", async () => {
    const res = await get("/api/courses?mine=true", { token: alpha.token });
    eq(levelsOf(res.body.courses), "ALL,ALPHA", "seviyeler");
    return `${res.body.courses.length} kurs`;
  });
  for (const beta of byLevel("BETA")) {
    await step(`A5-${beta.id}`, `BETA kursu "${beta.title}": içerik/video gizli; ders tamamlama, yorum ve final engelli`, "içerik yok, 403 LEVEL_MISMATCH", async () => {
      const d = await get(`/api/courses/${beta.id}`, { token: alpha.token });
      check(d.body.course.lessons.every((l) => !("content" in l) && !("videoUrl" in l)), "içerik sızdı");
      eq(d.body.course.progress, null, "ilerleme");
      const c = await post(`/api/courses/${beta.id}/lessons/${beta.lessons[0].id}/complete`, { token: alpha.token });
      status(c, 403, "ders tamamlama");
      eq(c.body.code, "LEVEL_MISMATCH", "hata kodu");
      status(await del(`/api/courses/${beta.id}/lessons/${beta.lessons[0].id}/complete`, { token: alpha.token }), 403, "tamamlamayı geri alma");
      status(await post(`/api/courses/${beta.id}/comments`, { token: alpha.token, body: { content: "Deneme" } }), 403, "yorum");
      status(await post(`/api/exams/courses/${beta.id}/final/start`, { token: alpha.token }), 403, "final");
      return "içerik yok; tamamlama/geri alma/yorum/final 403";
    });
  }
  let alphaCourse;
  await step("A6", `ALFA kursu "${ALPHA.title}" açılır, ders içeriği ve video gelir`, "200, content + videoUrl var", async () => {
    const res = await get(`/api/courses/${ALPHA.id}`, { token: alpha.token });
    check(res.body.course.access.canAccess, "erişim yok");
    check(res.body.course.lessons.every((l) => l.content && l.videoUrl), "içerik/video eksik");
    alphaCourse = res.body.course;
    return `${alphaCourse.lessons.length} ders, ilerleme %${alphaCourse.progress.percent}`;
  });
  await step("A7", "Dersler bitmeden final testi açılmaz", "403 COURSE_NOT_FINISHED", async () => {
    const res = await post(`/api/exams/courses/${ALPHA.id}/final/start`, { token: alpha.token });
    status(res, 403);
    eq(res.body.code, "COURSE_NOT_FINISHED", "hata kodu");
    return "403 COURSE_NOT_FINISHED";
  });
  await step("A8", "Ders tamamlanınca ilerleme yüzdesi artar, geri alınca düşer", "1 ders = %X, geri alınca %0", async () => {
    const l = alphaCourse.lessons[0];
    const a = await post(`/api/courses/${ALPHA.id}/lessons/${l.id}/complete`, { token: alpha.token });
    const expected = Math.round(100 / alphaCourse.lessons.length);
    eq(a.body.progress.percent, expected, "yüzde");
    const again = await post(`/api/courses/${ALPHA.id}/lessons/${l.id}/complete`, { token: alpha.token });
    eq(again.body.progress.completed, 1, "aynı ders iki kez sayılmamalı");
    const b = await del(`/api/courses/${ALPHA.id}/lessons/${l.id}/complete`, { token: alpha.token });
    eq(b.body.progress.percent, 0, "geri alma");
    return `%${expected} → (tekrar tıklama 1 kez sayıldı) → %0`;
  });
  await step("A9", "Başka kursun dersi bu kurs üzerinden tamamlanamaz", "404", async () => {
    status(await post(`/api/courses/${ALPHA.id}/lessons/${ALL.lessons[0].id}/complete`, { token: alpha.token }), 404);
    return "404";
  });
  await step("A10", "Tüm dersler bitince ilerleme %100 olur", "%100, finished", async () => {
    const p = await completeAll(alpha.token, alphaCourse);
    eq(p.percent, 100, "yüzde");
    check(p.finished, "finished değil");
    return `${p.completed}/${p.total} → %100`;
  });
  await step("A11", "Final testinde kalınca kurs ilerlemesi sıfırlanır", "passed=false, courseReset=true, ilerleme %0", async () => {
    const { start, result } = await takeFinal(alpha.token, ALPHA.id, 0.3);
    check(!JSON.stringify(start).includes("isCorrect"), "doğru cevap sızdı");
    eq(result.attempt.passed, false, "geçti");
    eq(result.courseReset, true, "courseReset");
    const d = await get(`/api/courses/${ALPHA.id}`, { token: alpha.token });
    eq(d.body.course.progress.percent, 0, "ilerleme");
    return `puan %${result.attempt.score}, kaldı, ilerleme %0`;
  });
  await step("A12", "Sıfırlanan kursta final tekrar kilitlenir", "403 COURSE_NOT_FINISHED", async () => {
    const res = await post(`/api/exams/courses/${ALPHA.id}/final/start`, { token: alpha.token });
    eq(res.body.code, "COURSE_NOT_FINISHED", "hata kodu");
    return "403";
  });
  await step("A13", "Dersleri yeniden bitirip finali geçince kurs geçilmiş olur", "passed=true", async () => {
    await completeAll(alpha.token, alphaCourse);
    const { result } = await takeFinal(alpha.token, ALPHA.id, 0.9);
    eq(result.attempt.passed, true, "geçti");
    eq(result.courseReset, false, "courseReset");
    return `puan %${result.attempt.score}, geçti`;
  });
  await step("A14", "Geçilen final testine tekrar girilemez", "409 FINAL_PASSED", async () => {
    const res = await post(`/api/exams/courses/${ALPHA.id}/final/start`, { token: alpha.token });
    eq(res.body.code, "FINAL_PASSED", "hata kodu");
    const list = await get("/api/courses", { token: alpha.token });
    check(list.body.courses.find((c) => c.id === ALPHA.id).finalPassed, "listede geçti görünmüyor");
    return "409; listede 'geçti' işaretli";
  });
  await step("A15", "Final geçilince 8 alan arasından seçim yapılır ve yol haritası açılır", "eligible=true, 8 alan, seçim 200, 5 aşama", async () => {
    const c = await get("/api/career", { token: alpha.token });
    check(c.body.eligible, "uygun değil");
    eq(c.body.fields.length, 8, "alan sayısı");
    status(await put("/api/career", { token: alpha.token, body: { field: "olmayan-alan" } }), 400, "geçersiz alan");
    const key = c.body.fields[0].key;
    const res = await put("/api/career", { token: alpha.token, body: { field: key } });
    status(res, 200, "seçim");
    eq(res.body.user.careerField, key, "seçilen alan");
    const r = await get(`/api/career/${key}`, { token: alpha.token });
    return `alan "${r.body.career.title}", ${r.body.career.stages.length} aşamalı yol haritası`;
  });
  await step("A16", "Herkese açık kursta yorum yazılır ve silinir", "201 → 204", async () => {
    const c = await post(`/api/courses/${ALL.id}/comments`, { token: alpha.token, body: { content: "Çok faydalı bir kurs!" } });
    status(c, 201, "yorum");
    status(await del(`/api/courses/${ALL.id}/comments/${c.body.comment.id}`, { token: alpha.token }), 204, "silme");
    return "201 → 204";
  });
  await step("A17", "Sınav geçmişi listelenir", "2 final + 1 seviye denemesi", async () => {
    const res = await get("/api/exams/my-attempts", { token: alpha.token });
    eq(res.body.attempts.length, 3, "deneme sayısı");
    return res.body.attempts.map((a) => `${a.exam.type} %${a.score}`).join(", ");
  });

  // ================= BETA =================
  setGroup("BETA öğrenci");
  const beta = await register("Beta");
  await step("B1", `Seviye sınavında tam %${placement.passingScore} alan öğrenci BETA olur (sınır değer)`, `${passCount}/${N} doğru → BETA`, async () => {
    const r = await takePlacement(beta, passCount);
    eq(r.user.level, "BETA", "sınıf");
    return `puan %${r.attempt.score} → BETA`;
  });
  await step("B2", "Kurs listesinde BETA ve herkese açık kurslar açık, ALFA kursları kilitli", "ALPHA → LEVEL_MISMATCH", async () => {
    const res = await get("/api/courses", { token: beta.token });
    const open = res.body.courses.filter((c) => c.access.canAccess);
    const locked = res.body.courses.filter((c) => !c.access.canAccess);
    eq(levelsOf(open), "ALL,BETA", "açık kurs seviyeleri");
    eq(levelsOf(locked), "ALPHA", "kilitli kurs seviyeleri");
    check(locked.every((c) => c.access.reason === "LEVEL_MISMATCH"), "kilit nedeni");
    return `${open.length} açık (ALL, BETA), ${locked.length} kilitli (ALPHA)`;
  });
  await step("B3", "'Bana açık olanlar' filtresi ALFA kurslarını göstermez", "ALL,BETA", async () => {
    const res = await get("/api/courses?mine=true", { token: beta.token });
    eq(levelsOf(res.body.courses), "ALL,BETA", "seviyeler");
    return `${res.body.courses.length} kurs`;
  });
  for (const a of byLevel("ALPHA")) {
    await step(`B4-${a.id}`, `ALFA kursu "${a.title}": içerik/video gizli; ders tamamlama, geri alma, yorum ve final engelli`, "içerik yok, 403 LEVEL_MISMATCH", async () => {
      const d = await get(`/api/courses/${a.id}`, { token: beta.token });
      eq(d.body.course.access.reason, "LEVEL_MISMATCH", "kilit nedeni");
      check(d.body.course.lessons.every((l) => !("content" in l) && !("videoUrl" in l)), "içerik sızdı");
      const c = await post(`/api/courses/${a.id}/lessons/${a.lessons[0].id}/complete`, { token: beta.token });
      status(c, 403, "ders tamamlama");
      eq(c.body.code, "LEVEL_MISMATCH", "hata kodu");
      status(await del(`/api/courses/${a.id}/lessons/${a.lessons[0].id}/complete`, { token: beta.token }), 403, "geri alma");
      status(await post(`/api/courses/${a.id}/comments`, { token: beta.token, body: { content: "Deneme" } }), 403, "yorum");
      status(await post(`/api/exams/courses/${a.id}/final/start`, { token: beta.token }), 403, "final");
      return "içerik yok; tamamlama/geri alma/yorum/final 403";
    });
  }
  await step("B5", "ALFA öğrencisinin sınav denemesine BETA öğrenci erişemez", "404", async () => {
    const att = await prisma.examAttempt.findFirst({ where: { userId: alpha.user.id } });
    status(await get(`/api/exams/attempts/${att.id}`, { token: beta.token }), 404, "görüntüleme");
    status(await post(`/api/exams/attempts/${att.id}/submit`, { token: beta.token, body: { answers: [] } }), 404, "gönderme");
    return "404";
  });
  await step("B6", `BETA kursu "${BETA.title}" baştan sona: dersler → final → alan seçimi`, "%100, geçti, alan seçildi", async () => {
    const d = await get(`/api/courses/${BETA.id}`, { token: beta.token });
    check(d.body.course.lessons.every((l) => l.content), "içerik yok");
    const p = await completeAll(beta.token, d.body.course);
    eq(p.percent, 100, "ilerleme");
    const { result } = await takeFinal(beta.token, BETA.id, 1);
    eq(result.attempt.passed, true, "geçti");
    const res = await put("/api/career", { token: beta.token, body: { field: "backend" } });
    status(res, 200, "alan seçimi");
    return `%100 → final %${result.attempt.score} → alan: backend`;
  });
  await step("B7", "Herkese açık kursa BETA öğrenci de erişir", "canAccess=true", async () => {
    const d = await get(`/api/courses/${ALL.id}`, { token: beta.token });
    check(d.body.course.access.canAccess, "erişim yok");
    return "erişim var";
  });
  await step("B8", `%${placement.passingScore}'ın bir soru altı ALFA'ya düşer (sınır değer)`, `${passCount - 1}/${N} → ALPHA`, async () => {
    const s = await register("Sinir");
    const r = await takePlacement(s, passCount - 1);
    eq(r.user.level, "ALPHA", "sınıf");
    return `%${r.attempt.score} → ALPHA`;
  });
  let betaComment;
  await step("B9", "Öğrenci başkasının yorumunu silemez", "403", async () => {
    betaComment = await post(`/api/courses/${ALL.id}/comments`, { token: beta.token, body: { content: "Beta öğrenciden yorum" } });
    status(betaComment, 201, "yorum");
    status(await del(`/api/courses/${ALL.id}/comments/${betaComment.body.comment.id}`, { token: alpha.token }), 403, "başkası silme");
    return "201, başkası silmeye çalışınca 403";
  });

  // ================= ADMIN =================
  setGroup("Admin");
  let admin;
  await step("D1", "Admin giriş yapar", "200, rol ADMIN", async () => {
    const res = await post("/api/auth/login", { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
    status(res, 200);
    eq(res.body.user.role, "ADMIN", "rol");
    admin = res.body.token;
    return "ADMIN";
  });
  await step("D2", "Admin seviye sınavına giremez ama tüm kursları (ALFA ve BETA) içeriğiyle görür", "403; tüm kurslarda canAccess", async () => {
    status(await post("/api/exams/placement/start", { token: admin }), 403, "seviye sınavı");
    const res = await get("/api/courses", { token: admin });
    check(res.body.courses.every((c) => c.access.canAccess), "kilitli kurs var");
    return "403; tüm kurslar açık";
  });
  await step("D3", "İstatistiklerde ALFA/BETA sayıları doğru", "ALFA ve BETA sayıları veritabanıyla aynı", async () => {
    const res = await get("/api/admin/stats", { token: admin });
    status(res, 200);
    const [a, b] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT", level: "ALPHA" } }),
      prisma.user.count({ where: { role: "STUDENT", level: "BETA" } }),
    ]);
    const s = JSON.stringify(res.body);
    check(s.includes(`"ALPHA":${a}`) && s.includes(`"BETA":${b}`), `istatistik farklı (beklenen alpha ${a}, beta ${b})`);
    return `ALFA ${a}, BETA ${b}`;
  });
  await step("D4", "Üyeler seviyeye göre filtrelenir; üye detayında ilerleme ve sınavlar görünür", "ALPHA filtresinde alfa var, beta yok", async () => {
    const res = await get("/api/admin/users?level=ALPHA", { token: admin });
    const ids = res.body.users.map((u) => u.id);
    check(ids.includes(alpha.user.id) && !ids.includes(beta.user.id), "filtre hatalı");
    const d = await get(`/api/admin/users/${alpha.user.id}`, { token: admin });
    check(d.body.courses.some((c) => c.id === ALPHA.id && c.finalPassed), "detayda kurs yok");
    return `${res.body.users.length} ALFA üye; detayda ${d.body.attempts.length} sınav`;
  });
  let newCourse;
  await step("D5", "Yeni ALFA kursu taslak olarak oluşturulur; derssiz yayınlanamaz", "201, yayın 400", async () => {
    const res = await post("/api/admin/courses", {
      token: admin,
      body: { title: `Test Kursu ${run}`, summary: "Senaryo testi", description: "Senaryo testi için kurs", category: "Test", level: "ALPHA" },
    });
    status(res, 201);
    newCourse = res.body.course;
    status(await patch(`/api/admin/courses/${newCourse.id}/publish`, { token: admin, body: { published: true } }), 400, "derssiz yayın");
    return `kurs #${newCourse.id}, derssiz yayın 400`;
  });
  await step("D6", "Ders ekleme (geçersiz video adresi reddedilir), sıralama ve düzenleme", "400, 201, 201, sıra değişti", async () => {
    status(await post(`/api/admin/courses/${newCourse.id}/lessons`, { token: admin, body: { title: "Bozuk", videoUrl: "video-degil" } }), 400, "geçersiz video");
    const l1 = await post(`/api/admin/courses/${newCourse.id}/lessons`, { token: admin, body: { title: "Ders A", content: "A içerik", videoUrl: "https://youtu.be/CgkZ7MvWUAA", durationMinutes: 5 } });
    const l2 = await post(`/api/admin/courses/${newCourse.id}/lessons`, { token: admin, body: { title: "Ders B", content: "B içerik", durationMinutes: 5 } });
    status(l1, 201);
    status(l2, 201);
    status(await put(`/api/admin/courses/${newCourse.id}/lessons-order`, { token: admin, body: { lessonIds: [l2.body.lesson.id, l1.body.lesson.id] } }), 200, "sıralama");
    status(await put(`/api/admin/courses/${newCourse.id}/lessons/${l2.body.lesson.id}`, { token: admin, body: { title: "Ders B (güncel)" } }), 200, "düzenleme");
    const c = await get(`/api/admin/courses/${newCourse.id}`, { token: admin });
    eq(c.body.course.lessons[0].title, "Ders B (güncel)", "ilk ders");
    newCourse = c.body.course;
    return "400 → 201, 201 → sıra B, A";
  });
  await step("D7", "Taslak kurs öğrencilere görünmez", "listede yok, detay 404", async () => {
    const list = await get("/api/courses", { token: alpha.token });
    check(!list.body.courses.some((c) => c.id === newCourse.id), "listede görünüyor");
    status(await get(`/api/courses/${newCourse.id}`, { token: alpha.token }), 404, "detay");
    return "görünmüyor, 404";
  });
  await step("D8", "Yayınlanan ALFA kursunu ALFA öğrenci açar, BETA öğrenci açamaz", "ALFA canAccess, BETA LEVEL_MISMATCH", async () => {
    status(await patch(`/api/admin/courses/${newCourse.id}/publish`, { token: admin, body: { published: true } }), 200, "yayın");
    const a = await get(`/api/courses/${newCourse.id}`, { token: alpha.token });
    const b = await get(`/api/courses/${newCourse.id}`, { token: beta.token });
    check(a.body.course.access.canAccess, "ALFA erişemiyor");
    eq(b.body.course.access.reason, "LEVEL_MISMATCH", "BETA kilidi");
    return "ALFA açık, BETA kilitli";
  });
  await step("D9", "Kursun seviyesi BETA yapılınca erişim anında tersine döner", "ALFA kilitli, BETA açık", async () => {
    status(await put(`/api/admin/courses/${newCourse.id}`, { token: admin, body: { level: "BETA" } }), 200);
    const a = await get(`/api/courses/${newCourse.id}`, { token: alpha.token });
    const b = await get(`/api/courses/${newCourse.id}`, { token: beta.token });
    eq(a.body.course.access.reason, "LEVEL_MISMATCH", "ALFA kilidi");
    check(b.body.course.access.canAccess, "BETA erişemiyor");
    return "ALFA kilitli, BETA açık";
  });
  let finalExam;
  await step("D10", "Final sınavı: aynı kursa ikinci final açılamaz, sorusuz yayınlanamaz, soru eklenip yayınlanır", "201, 409, 400, 201, 200", async () => {
    const e = await post("/api/admin/exams", { token: admin, body: { type: "FINAL", title: "Test final", courseId: newCourse.id, passingScore: 60 } });
    status(e, 201, "oluşturma");
    finalExam = e.body.exam;
    status(await post("/api/admin/exams", { token: admin, body: { type: "FINAL", title: "İkinci final", courseId: newCourse.id } }), 409, "ikinci final");
    status(await patch(`/api/admin/exams/${finalExam.id}/publish`, { token: admin, body: { published: true } }), 400, "sorusuz yayın");
    status(await post(`/api/admin/exams/${finalExam.id}/questions`, { token: admin, body: { text: "2+2?", options: [{ text: "4", isCorrect: true }, { text: "5", isCorrect: false }] } }), 201, "soru");
    status(await patch(`/api/admin/exams/${finalExam.id}/publish`, { token: admin, body: { published: true } }), 200, "yayın");
    const b = await get(`/api/courses/${newCourse.id}`, { token: beta.token });
    eq(b.body.course.finalExam?.questionCount, 1, "öğrencide final");
    return "201, 409, 400, 201, 200; öğrenci finali görüyor";
  });
  await step("D11", "Admin öğrencinin sınıfını ALFA → BETA yapınca erişimi anında değişir", "ALFA kursu kilitlenir, BETA kursu açılır", async () => {
    const s = await register("Gecis");
    await takePlacement(s, 0);
    const before = await get(`/api/courses/${ALPHA.id}`, { token: s.token });
    check(before.body.course.access.canAccess, "ALFA kursu baştan açık değil");
    status(await patch(`/api/admin/users/${s.user.id}`, { token: admin, body: { level: "BETA" } }), 200);
    const a = await get(`/api/courses/${ALPHA.id}`, { token: s.token });
    const b = await get(`/api/courses/${BETA.id}`, { token: s.token });
    eq(a.body.course.access.reason, "LEVEL_MISMATCH", "ALFA kilidi");
    check(b.body.course.access.canAccess, "BETA açılmadı");
    return "ALFA kursu kilitlendi, BETA kursu açıldı";
  });
  await step("D12", "Seviye sınavı sıfırlanınca öğrenci sınava yeniden girer ve yeni sınıfını alır", "level=null, PENDING, yeniden BETA", async () => {
    const res = await post(`/api/admin/users/${alpha.user.id}/reset-placement`, { token: admin });
    status(res, 200);
    eq(res.body.user.level, null, "sınıf");
    eq((await get("/api/exams/placement", { token: alpha.token })).body.status, "PENDING", "durum");
    const r = await takePlacement(alpha, N);
    eq(r.user.level, "BETA", "yeni sınıf");
    return "null → PENDING → %100 → BETA";
  });
  await step("D13", "Admin üye düzenlemede sınıfı 'yok' yapınca öğrenci seviye sınavına yeniden girebilir", "PENDING ve sınav başlar", async () => {
    const s = await register("Sinifsiz");
    await takePlacement(s, 0);
    status(await patch(`/api/admin/users/${s.user.id}`, { token: admin, body: { level: null } }), 200, "sınıfı kaldırma");
    const st = await get("/api/exams/placement", { token: s.token });
    eq(st.body.status, "PENDING", "sınav durumu");
    status(await post("/api/exams/placement/start", { token: s.token }), 201, "sınavı başlatma");
    return "PENDING, sınav başladı";
  });
  await step("D14", "Seviye sınavı geçme eşiği admin tarafından değiştirilebilir", "%70 eşikte %60 → ALPHA", async () => {
    status(await put(`/api/admin/exams/${placement.id}`, { token: admin, body: { passingScore: 70 } }), 200);
    const s = await register("Esik");
    const r = await takePlacement(s, passCount);
    status(await put(`/api/admin/exams/${placement.id}`, { token: admin, body: { passingScore: placement.passingScore } }), 200, "eşiği geri alma");
    eq(r.user.level, "ALPHA", "sınıf");
    return `%${r.attempt.score} → ALPHA (eşik %70); eşik tekrar %${placement.passingScore}`;
  });
  await step("D15", "Yayında seviye sınavı yokken yeni öğrenciye anlaşılır mesaj gösterilir", "404 + mesaj", async () => {
    status(await patch(`/api/admin/exams/${placement.id}/publish`, { token: admin, body: { published: false } }), 200);
    const s = await register("Sinavsiz");
    const res = await get("/api/exams/placement", { token: s.token });
    status(await patch(`/api/admin/exams/${placement.id}/publish`, { token: admin, body: { published: true } }), 200, "tekrar yayın");
    status(res, 404);
    return `404: ${res.body.error}`;
  });
  await step("D16", "Blog (Roadmap) yazısı: taslak görünmez, yayınlanınca görünür, gizlenince kaybolur, silinir", "görünürlük doğru", async () => {
    const p = await post("/api/admin/blog", { token: admin, body: { title: `Test yazısı ${run}`, summary: "Özet", content: "İçerik metni" } });
    status(p, 201);
    const id = p.body.post.id;
    status(await get(`/api/blog/${id}`), 404, "taslak");
    await patch(`/api/admin/blog/${id}/publish`, { token: admin, body: { published: true } });
    status(await get(`/api/blog/${id}`), 200, "yayında");
    await patch(`/api/admin/blog/${id}/publish`, { token: admin, body: { published: false } });
    status(await get(`/api/blog/${id}`), 404, "gizli");
    status(await del(`/api/admin/blog/${id}`, { token: admin }), 204, "silme");
    return "taslak 404 → yayın 200 → gizli 404 → silme 204";
  });
  await step("D17", "Yorum yönetimi: admin öğrenci yorumunu görür ve siler", "listede var, 204", async () => {
    const list = await get("/api/admin/comments", { token: admin });
    check(list.body.comments.some((c) => c.id === betaComment.body.comment.id), "yorum listede yok");
    status(await del(`/api/admin/comments/${betaComment.body.comment.id}`, { token: admin }), 204);
    return "204";
  });
  await step("D18", "Video yükleme: MP4 kabul edilir ve derse bağlanır, video olmayan dosya reddedilir", "201 + /uploads/..., 400", async () => {
    const form = new FormData();
    form.append("file", new Blob([Buffer.alloc(2048)], { type: "video/mp4" }), "ders.mp4");
    const up = await post("/api/admin/uploads/video", { token: admin, form });
    status(up, 201, "yükleme");
    const bad = new FormData();
    bad.append("file", new Blob(["metin"], { type: "text/plain" }), "not.txt");
    status(await post("/api/admin/uploads/video", { token: admin, form: bad }), 400, "yanlış tür");
    const lesson = newCourse.lessons[0];
    status(await put(`/api/admin/courses/${newCourse.id}/lessons/${lesson.id}`, { token: admin, body: { videoUrl: up.body.url } }), 200, "derse bağlama");
    const v = await get(`/api/admin/videos?video=UPLOADED`, { token: admin });
    check(v.body.lessons.some((l) => l.id === lesson.id), "videolar listesinde yok");
    const file = await fetch(`${BASE}${up.body.url}`);
    eq(file.status, 200, "dosya erişimi");
    return `${up.body.url} → derse bağlandı; .txt 400`;
  });
  await step("D19", "Admin kendi yetkisini kaldıramaz ve kendini silemez", "400, 400", async () => {
    const me = (await get("/api/auth/me", { token: admin })).body.user;
    status(await patch(`/api/admin/users/${me.id}`, { token: admin, body: { role: "STUDENT" } }), 400, "yetki kaldırma");
    status(await del(`/api/admin/users/${me.id}`, { token: admin }), 400, "kendini silme");
    return "400, 400";
  });
  await step("D20", "Silinen üyenin oturumu kapanır", "204, ardından 401", async () => {
    const s = await register("Silinecek");
    status(await del(`/api/admin/users/${s.user.id}`, { token: admin }), 204);
    status(await get("/api/auth/me", { token: s.token }), 401);
    return "204 → 401";
  });
  await step("D21", "Kurs silinince öğrenciler için kaybolur", "204, öğrenciye 404", async () => {
    status(await del(`/api/admin/courses/${newCourse.id}`, { token: admin }), 204);
    status(await get(`/api/courses/${newCourse.id}`, { token: beta.token }), 404);
    return "204 → 404";
  });

  // ================= GÜVENLİK =================
  setGroup("Güvenlik");
  await step("G1", "Çok sayıda hatalı giriş denemesi hız sınırına takılır", "429", async () => {
    let res;
    for (let i = 0; i < 40; i++) {
      res = await post("/api/auth/login", { body: { email: `kaba-kuvvet-${run}@test.dev`, password: "yanlis" } });
      if (res.status === 429) return `${i + 1}. denemede 429`;
    }
    throw new Fail(`40 denemede 429 gelmedi (son: ${res.status})`);
  });
}

runMain(main);
