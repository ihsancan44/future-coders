import "dotenv/config";

const isTest = process.env.NODE_ENV === "test";

if (isTest && process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Ortam değişkeni eksik: ${name}`);
  return value;
}

export const config = {
  isTest,
  port: Number(process.env.PORT) || 4000,
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  uploadDir: process.env.UPLOAD_DIR || new URL("../uploads", import.meta.url).pathname,
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  mailFrom: process.env.MAIL_FROM || "FutureCoders <no-reply@futurecoders.dev>",
  /** Seviye sınavında bu yüzdenin altı ALPHA, üstü BETA sınıfına atanır (sınavın kendi eşiği yoksa). */
  defaultPassingScore: 60,
};
