import nodemailer from "nodemailer";
import { config } from "../config.js";

let transporter = null;
if (config.smtp.host) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
}

if (!transporter && config.isProduction) {
  console.warn("[mail] SMTP ayarlı değil: şifre sıfırlama e-postaları gönderilemeyecek. SMTP_HOST, SMTP_USER, SMTP_PASS ve MAIL_FROM verin.");
}

export async function sendMail({ to, subject, text }) {
  if (!transporter) {
    // Yerel kurulumda e-posta yerine sunucu loguna yazılır. Canlıda bağlantı (gizli anahtar içerir) loga yazılmaz.
    if (config.isProduction) console.warn(`[mail] SMTP ayarlı değil, e-posta gönderilemedi: ${subject}`);
    else if (!config.isTest) console.info(`[mail] SMTP ayarlı değil. Alıcı: ${to}\n${subject}\n${text}`);
    return;
  }
  await transporter.sendMail({ from: config.mailFrom, to, subject, text });
}
