export class HttpError extends Error {
  constructor(status, message, details, code) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

export const badRequest = (msg, details) => new HttpError(400, msg, details);
export const unauthorized = (msg = "Giriş yapmanız gerekiyor.") => new HttpError(401, msg);
export const forbidden = (msg = "Bu işlem için yetkiniz yok.", code) => new HttpError(403, msg, undefined, code);
export const notFound = (msg = "Kayıt bulunamadı.") => new HttpError(404, msg);
export const conflict = (msg, code) => new HttpError(409, msg, undefined, code);

/** Express 4 async hatalarını error middleware'ine iletir. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
