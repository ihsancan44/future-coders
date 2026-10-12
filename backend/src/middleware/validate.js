import { badRequest } from "../lib/errors.js";

/** Zod şemasıyla req[part] doğrular ve temizlenmiş değeri geri yazar. */
export const validate = (schema, part = "body") => (req, _res, next) => {
  const result = schema.safeParse(req[part]);
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "_";
      fields[key] ??= issue.message;
    }
    return next(badRequest("Gönderilen bilgiler geçersiz.", fields));
  }
  req[part] = result.data;
  next();
};
