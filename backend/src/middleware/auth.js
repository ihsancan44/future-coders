import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { forbidden, unauthorized } from "../lib/errors.js";

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, ver: user.tokenVersion }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

async function loadUser(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw unauthorized("Oturumunuzun süresi doldu, lütfen tekrar giriş yapın.");
  }
  const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });
  // Şifre değişince tokenVersion artar ve önceki anahtarlar geçersiz olur ("ver" alanı olmayan eski anahtarlar 0 sayılır).
  if (!user || (payload.ver ?? 0) !== user.tokenVersion) {
    throw unauthorized("Oturumunuzun süresi doldu, lütfen tekrar giriş yapın.");
  }
  return user;
}

/**
 * Token varsa kullanıcıyı yükler, yoksa misafir olarak devam eder.
 * Süresi dolmuş veya geçersiz token da misafir sayılır; herkese açık sayfalar bu yüzden hata vermez.
 */
export async function optionalAuth(req, _res, next) {
  try {
    req.user = await loadUser(req);
  } catch (err) {
    if (err.status !== 401) return next(err);
    req.user = null;
  }
  next();
}

export async function requireAuth(req, _res, next) {
  try {
    req.user = await loadUser(req);
    if (!req.user) throw unauthorized();
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== "ADMIN") return next(forbidden());
  next();
}
