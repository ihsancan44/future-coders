import { fileURLToPath } from "node:url";
import "dotenv/config";

const isTest = process.env.NODE_ENV === "test";
const isProduction = process.env.NODE_ENV === "production";

if (isTest && process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Ortam değişkeni eksik: ${name}`);
  return value;
}

// Depodaki örnek değerler herkesce bilinir: bunlarla imzalanan oturum anahtarı taklit edilip admin olunabilir.
const KNOWN_SECRETS = ["degistirin-cok-gizli-bir-anahtar", "yerel-gelistirme-anahtari-degistirin"];
function jwtSecret() {
  const secret = required("JWT_SECRET");
  if (isProduction && (secret.length < 32 || KNOWN_SECRETS.includes(secret))) {
    throw new Error("JWT_SECRET canlı ortam için zayıf: en az 32 karakterlik rastgele bir değer verin (örn. `openssl rand -hex 32`).");
  }
  return secret;
}

/** Ters vekil (nginx, Caddy, Cloudflare...) sayısı: istek sınırı gerçek ziyaretçi IP'sine göre işlesin. */
function trustProxy() {
  const v = process.env.TRUST_PROXY;
  if (v === undefined || v === "") return 1;
  if (/^\d+$/.test(v)) return Number(v);
  if (v === "true" || v === "false") return v === "true";
  return v; // IP / alt ağ listesi
}

const clientUrls = (process.env.CLIENT_URL || "http://localhost:5173").split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);

export const config = {
  isTest,
  isProduction,
  port: Number(process.env.PORT) || 4000,
  jwtSecret: jwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  /** CORS için izin verilen adresler. */
  clientUrls,
  /** E-postadaki bağlantıların adresi: CLIENT_URL'deki ilk adres. */
  publicUrl: clientUrls[0],
  trustProxy: trustProxy(),
  uploadDir: process.env.UPLOAD_DIR || fileURLToPath(new URL("../uploads", import.meta.url)),
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  mailFrom: process.env.MAIL_FROM || "Codevia <no-reply@futurecoders.dev>",
  /** Seviye sınavında bu yüzdenin altı ALPHA, üstü BETA sınıfına atanır (sınavın kendi eşiği yoksa). */
  defaultPassingScore: 60,
};
