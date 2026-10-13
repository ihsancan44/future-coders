import { z } from "zod";
import { badRequest } from "./errors.js";

export function idParam(value) {
  const id = Number(value);
  // Veritabanındaki kimlikler 32 bitlik tam sayıdır; daha büyük sayılar sunucu hatası yerine 400 alır.
  if (!Number.isInteger(id) || id <= 0 || id > 2_147_483_647) throw badRequest("Geçersiz kimlik numarası.");
  return id;
}

export const idSchema = z.coerce.number().int().positive().max(2_147_483_647);
