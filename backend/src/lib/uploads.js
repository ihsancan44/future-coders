import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { prisma } from "./prisma.js";

/** Sunucuya yüklenmiş dosyanın göreli yolu: /uploads/<dosya adı>. */
export const LOCAL_UPLOAD = /^\/uploads\/[\w.-]+$/;

export const isLocalUpload = (url) => typeof url === "string" && LOCAL_UPLOAD.test(url);

export async function inUse(url) {
  const [lessons, reels, courses, posts] = await Promise.all([
    prisma.lesson.count({ where: { videoUrl: url } }),
    prisma.reel.count({ where: { videoUrl: url } }),
    prisma.course.count({ where: { coverImage: url } }),
    prisma.blogPost.count({ where: { coverImage: url } }),
  ]);
  return lessons + reels + courses + posts > 0;
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

/** Bu kadar eski olup hiçbir kurs, ders, kısa video veya blog yazısında kullanılmayan yüklemeler silinir. */
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

/** Yüklenip hiç kaydedilmemiş dosyaları siler; silinen dosya sayısını döndürür. */
export async function sweepOrphanUploads(now = Date.now()) {
  let removed = 0;
  let names = [];
  try {
    names = await fs.readdir(config.uploadDir);
  } catch {
    return 0;
  }
  for (const name of names) {
    const url = `/uploads/${name}`;
    if (name.startsWith(".") || !isLocalUpload(url)) continue; // .gitkeep gibi gizli dosyalara dokunulmaz
    const file = path.join(config.uploadDir, name);
    try {
      const stat = await fs.stat(file);
      if (!stat.isFile() || now - stat.mtimeMs < ORPHAN_AGE_MS || (await inUse(url))) continue;
      await fs.unlink(file);
      removed++;
    } catch {
      /* dosya o sırada silinmiş olabilir */
    }
  }
  return removed;
}
