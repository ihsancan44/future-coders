import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { config } from "../../config.js";
import { asyncHandler, badRequest } from "../../lib/errors.js";

const router = Router();
fs.mkdirSync(config.uploadDir, { recursive: true });

const allowed = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${allowed[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowed[file.mimetype]) return cb(badRequest("Sadece JPG, PNG, WEBP veya GIF görseller yüklenebilir."));
    cb(null, true);
  },
});

router.post(
  "/uploads",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest("Yüklenecek bir dosya seçin.");
    res.status(201).json({ url: `/uploads/${path.basename(req.file.filename)}` });
  }),
);

export default router;
