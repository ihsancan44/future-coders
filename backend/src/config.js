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

// Varsayılan sıra 2026-10-24 ölçümüne göre: paiza.io en hızlısı (~2 sn), Judge0 sonra, Wandbox en yavaşı.
const RUNNERS = ["paiza", "judge0", "wandbox"];
const url = (v, fallback) => (String(v ?? "").trim() || fallback).replace(/\/+$/, "");

/**
 * Derleme servisleri, denenme sırasıyla. Biri çökerse ya da o dili çalıştıramazsa sıradakine geçilir.
 * CODE_RUNNERS=off (ya da eski CODE_RUNNER_URL=off) sunucu dillerini tamamen kapatır.
 */
function codeRunners() {
  const order = (process.env.CODE_RUNNERS ?? "").trim().toLowerCase();
  if (order === "off" || (process.env.CODE_RUNNER_URL ?? "").trim() === "off") return { order: [] };
  const names = order ? order.split(",").map((s) => s.trim()).filter((s) => RUNNERS.includes(s)) : RUNNERS;
  return {
    order: [...new Set(names)],
    judge0: { url: url(process.env.JUDGE0_URL, "https://ce.judge0.com"), key: process.env.JUDGE0_KEY || "" },
    wandbox: { url: url(process.env.CODE_RUNNER_URL, "https://wandbox.org") },
    paiza: { url: url(process.env.PAIZA_URL, "https://api.paiza.io"), key: process.env.PAIZA_KEY || "guest" },
  };
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
  /** Sitenin arama motorlarına bildirilen asıl adresi (sitemap.xml, robots.txt). Verilmezse CLIENT_URL'deki ilk adres. */
  siteUrl: (process.env.SITE_URL || "").trim().replace(/\/+$/, "") || clientUrls[0],
  trustProxy: trustProxy(),
  uploadDir: process.env.UPLOAD_DIR || fileURLToPath(new URL("../uploads", import.meta.url)),
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  mailFrom: process.env.MAIL_FROM || "Codevia <no-reply@futurecoders.dev>",
  /** Derleyicideki sunucu dillerinin gönderildiği servisler (Judge0, Wandbox, paiza.io). */
  codeRunners: codeRunners(),
  /** Codevia Asistan (chatbot). Anahtar yoksa asistan kapalıdır, site normal çalışır. */
  assistant: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    model: process.env.ASSISTANT_MODEL || "claude-opus-5-5",
  },
  /** Seviye sınavında bu yüzdenin altı ALPHA, üstü BETA sınıfına atanır (sınavın kendi eşiği yoksa). */
  defaultPassingScore: 60,
};
