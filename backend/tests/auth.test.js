import { beforeEach, describe, expect, it } from "vitest";
import { api, createUser, resetDb } from "./helpers.js";

const valid = {
  firstName: "Ayşe",
  lastName: "Yılmaz",
  email: "Ayse@Example.com",
  password: "Sifre12345",
  confirmPassword: "Sifre12345",
  birthDate: "2008-04-12",
  school: "Atatürk Anadolu Lisesi",
};

beforeEach(resetDb);

describe("kayıt", () => {
  it("token olmadan yeni hesap oluşturur ve giriş yapmış döner", async () => {
    const res = await api().post("/api/auth/register").send(valid);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ email: "ayse@example.com", role: "STUDENT", level: null, school: valid.school });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("şifreler eşleşmezse alan hatası verir", async () => {
    const res = await api().post("/api/auth/register").send({ ...valid, confirmPassword: "baska12345" });
    expect(res.status).toBe(400);
    expect(res.body.fields.confirmPassword).toBe("Şifreler eşleşmiyor.");
  });

  it("aynı e-posta ile ikinci kayıt reddedilir", async () => {
    await api().post("/api/auth/register").send(valid);
    const res = await api().post("/api/auth/register").send(valid);
    expect(res.status).toBe(409);
  });

  it("kayıt rol alanını yok sayar", async () => {
    const res = await api().post("/api/auth/register").send({ ...valid, role: "ADMIN" });
    expect(res.body.user.role).toBe("STUDENT");
  });
});

describe("giriş", () => {
  it("doğru şifreyle token verir, yanlışta 401 döner", async () => {
    await api().post("/api/auth/register").send(valid);
    const ok = await api().post("/api/auth/login").send({ email: "ayse@example.com", password: valid.password });
    expect(ok.status).toBe(200);
    const me = await api().get("/api/auth/me").set("Authorization", `Bearer ${ok.body.token}`);
    expect(me.body.user.email).toBe("ayse@example.com");

    const bad = await api().post("/api/auth/login").send({ email: "ayse@example.com", password: "yanlis1234" });
    expect(bad.status).toBe(401);
  });

  it("geçersiz token 401 döner", async () => {
    const res = await api().get("/api/auth/me").set("Authorization", "Bearer bozuk");
    expect(res.status).toBe(401);
  });
});

describe("şifre sıfırlama", () => {
  it("giriş yapmadan çalışır ve yeni şifreyle giriş yapılır", async () => {
    const { user } = await createUser();
    const forgot = await api().post("/api/auth/forgot-password").send({ email: user.email });
    expect(forgot.status).toBe(200);
    const token = forgot.body.testToken;
    expect(token).toBeTruthy();

    const reset = await api()
      .post("/api/auth/reset-password")
      .send({ token, password: "YeniSifre123", confirmPassword: "YeniSifre123" });
    expect(reset.status).toBe(200);

    const login = await api().post("/api/auth/login").send({ email: user.email, password: "YeniSifre123" });
    expect(login.status).toBe(200);

    const reuse = await api()
      .post("/api/auth/reset-password")
      .send({ token, password: "BaskaSifre123", confirmPassword: "BaskaSifre123" });
    expect(reuse.status).toBe(400);
  });

  it("kayıtlı olmayan e-postada da aynı cevabı verir", async () => {
    const res = await api().post("/api/auth/forgot-password").send({ email: "yok@test.dev" });
    expect(res.status).toBe(200);
    expect(res.body.testToken).toBeUndefined();
  });
});
