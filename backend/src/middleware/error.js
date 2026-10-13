import { Prisma } from "@prisma/client";
import multer from "multer";
import { HttpError } from "../lib/errors.js";

const hasNullChar = (v) =>
  typeof v === "string" ? v.includes("\u0000") : v && typeof v === "object" ? Object.values(v).some(hasNullChar) : false;

/** PostgreSQL metinlerde NUL (\u0000) karakterini kabul etmez; böyle istekler veritabanına gitmeden 400 alır. */
export function rejectNullChars(req, res, next) {
  if (hasNullChar(req.body) || hasNullChar(req.query)) {
    return res.status(400).json({ error: "Gönderilen metin geçersiz bir karakter içeriyor." });
  }
  next();
}

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: "İstenen adres bulunamadı." });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, code: err.code, fields: err.details });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "Dosya en fazla 5 MB olabilir." : err.message });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") return res.status(404).json({ error: "Kayıt bulunamadı." });
    if (err.code === "P2002") return res.status(409).json({ error: "Bu kayıt zaten mevcut." });
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    // Doğrulamadan kaçan hatalı değer (ör. 32 bit sınırını aşan sayı): sunucu hatası değil, geçersiz istek.
    return res.status(400).json({ error: "Gönderilen bilgiler geçersiz." });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "İstek gövdesi geçerli bir JSON değil." });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Gönderilen bilgi çok büyük (en fazla 1 MB)." });
  }
  console.error(err);
  res.status(500).json({ error: "Sunucuda beklenmeyen bir hata oluştu." });
}
