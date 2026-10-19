const MAX = 3600;

/** Derleyicideki kodu ve çıktısını Asistan'a sorulacak bir mesaja çevirir (sunucu sınırı 4000 karakter). */
export function codeQuestion({ label, editor, code, output }) {
  const cut = (s, n) => (s.length > n ? `${s.slice(0, n)}\n… (kısaltıldı)` : s);
  const out = (output || "").trim();
  const body = cut(code.trim(), out ? 2400 : MAX - 200);
  const parts = [`${label} kodumla ilgili yardım lazım:`, `\`\`\`${editor || ""}\n${body}\n\`\`\``];
  if (out) parts.push(`Çıktı / hata:\n\`\`\`\n${cut(out, MAX - body.length - 200)}\n\`\`\``);
  parts.push("Sorum: ");
  return parts.join("\n");
}
