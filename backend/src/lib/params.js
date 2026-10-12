import { z } from "zod";
import { badRequest } from "./errors.js";

export function idParam(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw badRequest("Geçersiz kimlik numarası.");
  return id;
}

export const idSchema = z.coerce.number().int().positive();
