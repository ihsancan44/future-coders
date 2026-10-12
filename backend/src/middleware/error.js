import { Prisma } from "@prisma/client";
import multer from "multer";
import { HttpError } from "../lib/errors.js";

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
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "İstek gövdesi geçerli bir JSON değil." });
  }
  console.error(err);
  res.status(500).json({ error: "Sunucuda beklenmeyen bir hata oluştu." });
}
