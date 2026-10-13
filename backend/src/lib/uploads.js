import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { prisma } from "./prisma.js";

/** Sunucuya yüklenmiş dosyanın göreli yolu: /uploads/<dosya adı>. */
export const LOCAL_UPLOAD = /^\/uploads\/[\w.-]+$/;

export const isLocalUpload = (url) => typeof url === "string" && LOCAL_UPLOAD.test(url);

async function inUse(url) {
  const [lessons, courses, posts] = await Promise.all([
    prisma.lesson.count({ where: { videoUrl: url } }),
    prisma.course.count({ where: { coverImage: url } }),
    prisma.blogPost.count({ where: { coverImage: url } }),
  ]);
  return lessons + courses + posts > 0;
}

/**
 * Kayıtlardan kaldırılan /uploads/... dosyasını diskten siler.
 * Dış bağlantıları, hâlâ başka bir kayıtta kullanılan ve bulunamayan dosyaları yok sayar.
 */
export async function removeUpload(url) {
  if (!isLocalUpload(url) || (await inUse(url))) return;
  try {
    await fs.unlink(path.join(config.uploadDir, path.basename(url)));
  } catch {
    /* dosya zaten yok */
  }
}

export const removeUploads = (urls) => Promise.all(urls.filter(Boolean).map(removeUpload));
