import { z } from "zod";
import { LOCAL_UPLOAD } from "./uploads.js";

/** Sadece http(s) bağlantıları: javascript:, data: gibi adresler sayfada kod çalıştırabilir. */
export const webUrl = z
  .string()
  .trim()
  .url()
  .max(500)
  .refine((v) => /^https?:\/\//i.test(v), "Adres http:// veya https:// ile başlamalı.");

/** Kapak görseli: sunucuya yüklenmiş dosya (/uploads/...) ya da http(s) bağlantısı. Boş bırakılırsa kaldırılır. */
export const imageUrl = z
  .union([z.string().trim().regex(LOCAL_UPLOAD), webUrl, z.literal("").transform(() => null)], {
    errorMap: () => ({ message: "Geçerli bir görsel adresi girin veya görsel yükleyin." }),
  })
  .nullable()
  .optional();

/**
 * E-posta: boşluklar atılır, küçük harfe çevrilir. Türkçe klavyedeki büyük "İ" JavaScript'te "i̇" (noktalı i + birleşik nokta)
 * olarak küçüldüğü için önce düz "i"ye çevrilir.
 */
export const emailField = z
  .string()
  .trim()
  .transform((v) => v.replace(/İ/g, "i").toLowerCase())
  .pipe(z.string().email("Geçerli bir e-posta adresi girin."));

/** YYYY-AA-GG biçiminde, takvimde var olan, 1900 ile bugün arasında bir doğum tarihi. */
export const birthDateField = z
  .union([z.string(), z.date()], { errorMap: () => ({ message: "Geçerli bir doğum tarihi girin." }) })
  .transform((v, ctx) => {
    const text = typeof v === "string" ? v.trim() : null;
    const d = new Date(v);
    // "2008-02-30" gibi olmayan günler JavaScript'te sessizce 1 Mart'a kayar; tarih metniyle aynı değilse geçersizdir.
    const shifted = text && /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) !== text;
    if (Number.isNaN(d.getTime()) || shifted || d > new Date() || d.getFullYear() <= 1900) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Geçerli bir doğum tarihi girin." });
      return z.NEVER;
    }
    return d;
  });

/** LIKE/ILIKE aramasında % ve _ joker karakter sayılmasın diye kaçışlanır (Prisma "contains" bunları kaçışlamaz). */
export const likeText = (v) => v.replace(/[\\%_]/g, (c) => `\\${c}`);
