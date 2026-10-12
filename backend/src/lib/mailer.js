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

export async function sendMail({ to, subject, text }) {
  if (!transporter) {
    if (!config.isTest) console.info(`[mail] SMTP ayarlı değil. Alıcı: ${to}\n${subject}\n${text}`);
    return;
  }
  await transporter.sendMail({ from: config.mailFrom, to, subject, text });
}
