import { afterEach, describe, expect, it, vi } from "vitest";

const saved = { ...process.env };
async function load(env) {
  vi.resetModules();
  Object.assign(process.env, env);
  return (await import("../src/config.js")).config;
}
afterEach(() => {
  process.env = { ...saved };
  vi.resetModules();
});

describe("canlı ortam ayarları", () => {
  it("canlıda örnek ya da kısa JWT_SECRET ile sunucu açılmaz", async () => {
    await expect(load({ NODE_ENV: "production", JWT_SECRET: "degistirin-cok-gizli-bir-anahtar" })).rejects.toThrow(/JWT_SECRET/);
    await expect(load({ NODE_ENV: "production", JWT_SECRET: "kisa" })).rejects.toThrow(/JWT_SECRET/);
    const config = await load({ NODE_ENV: "production", JWT_SECRET: "a".repeat(64) });
    expect(config.isProduction).toBe(true);
  });

  it("birden çok CLIENT_URL verilince e-posta bağlantısı ilk adresi kullanır", async () => {
    const config = await load({ CLIENT_URL: "https://codevia.com/, https://www.codevia.com" });
    expect(config.publicUrl).toBe("https://codevia.com");
    expect(config.clientUrls).toEqual(["https://codevia.com", "https://www.codevia.com"]);
  });

  it("TRUST_PROXY sayı, true/false ya da adres listesi olabilir", async () => {
    expect((await load({ TRUST_PROXY: "2" })).trustProxy).toBe(2);
    expect((await load({ TRUST_PROXY: "false" })).trustProxy).toBe(false);
    expect((await load({ TRUST_PROXY: "10.0.0.0/8" })).trustProxy).toBe("10.0.0.0/8");
    expect((await load({ TRUST_PROXY: "" })).trustProxy).toBe(1);
  });
});
