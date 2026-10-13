import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { config } from "../../config.js";
import { asyncHandler, badRequest } from "../../lib/errors.js";

const router = Router();
fs.mkdirSync(config.uploadDir, { recursive: true });

const MB = 1024 * 1024;
export const IMAGE_MAX_MB = 5;
export const VIDEO_MAX_MB = 1024;

const imageTypes = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
const videoTypes = { "video/mp4": ".mp4", "video/webm": ".webm", "video/ogg": ".ogv" };

function uploader(types, maxMb, typeError) {
  return multer({
    storage: multer.diskStorage({
      destination: config.uploadDir,
      filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${types[file.mimetype]}`),
    }),
    limits: { fileSize: maxMb * MB },
    fileFilter: (_req, file, cb) => {
      if (!types[file.mimetype]) return cb(badRequest(typeError));
      cb(null, true);
    },
  });
}

/** multer'ın boyut hatasını dosya türüne uygun Türkçe mesaja çevirir. */
const single = (upload, maxMb) => (req, res, next) =>
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") return next(badRequest(`Dosya en fazla ${maxMb} MB olabilir.`));
    next(err);
  });

const sendUrl = asyncHandler(async (req, res) => {
  if (!req.file) throw badRequest("Yüklenecek bir dosya seçin.");
  res.status(201).json({ url: `/uploads/${path.basename(req.file.filename)}`, size: req.file.size });
});

router.post("/uploads", single(uploader(imageTypes, IMAGE_MAX_MB, "Sadece JPG, PNG, WEBP veya GIF görseller yüklenebilir."), IMAGE_MAX_MB), sendUrl);

router.post("/uploads/video", single(uploader(videoTypes, VIDEO_MAX_MB, "Sadece MP4, WEBM veya OGG videolar yüklenebilir."), VIDEO_MAX_MB), sendUrl);

export default router;
