// Derleyicideki sunucu dillerini her serviste ayrı ayrı dener ve bir tablo yazar.
// Kullanım: npm run check:compilers   (internet gerekir; birkaç dakika sürer)
//           npm run check:compilers -- --json   (sonuçları JSON olarak yazar)
import "dotenv/config";
import { LANGUAGES as SERVER_LANGS } from "../src/data/languages.js";
import { SERVICES } from "../src/lib/codeRunner.js";
import { LANGUAGES as STARTERS } from "../../frontend/src/utils/languages.js";

const EXPECT = /Merhaba,? Codevia!?/;
const extra = [
  // Öğrenci Java'da sınıfa "prog" dışında bir ad verebilmeli.
  { key: "java", note: "public class Main", code: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Merhaba Codevia!");\n    }\n}\n` },
  { key: "c", note: "girdi (stdin)", stdin: "Ayşe\n", expect: /Merhaba Ayşe/, code: `#include <stdio.h>\nint main(void) {\n    char ad[64];\n    if (scanf("%63s", ad) == 1) printf("Merhaba %s\\n", ad);\n    return 0;\n}\n` },
];

const cases = [
  ...SERVER_LANGS.filter((l) => l.runtime === "server").map((l) => ({ key: l.key, note: "başlangıç kodu", code: STARTERS.find((s) => s.key === l.key).starter })),
  ...extra,
];

async function tryOne(service, c) {
  const lang = SERVER_LANGS.find((l) => l.key === c.key);
  if (!service.supports(lang)) return { skip: true };
  const t0 = Date.now();
  try {
    const r = await service.run(lang, c.code, c.stdin || "", 60_000);
    const ok = (c.expect || EXPECT).test(r.stdout);
    return { ok, ms: Date.now() - t0, compiler: r.compiler, detail: ok ? "" : `${r.compileOutput}${r.stderr}${r.stdout}`.trim().slice(0, 200) };
  } catch (err) {
    return { ok: false, ms: Date.now() - t0, detail: `servis hatası: ${err.message}` };
  }
}

const names = Object.keys(SERVICES);
const results = cases.map(() => ({}));
// Servisler aynı anda, her servisin içinde diller sırayla denenir (ücretsiz servisleri boğmamak için).
await Promise.all(
  names.map(async (n) => {
    for (const [i, c] of cases.entries()) results[i][n] = await tryOne(SERVICES[n], c);
  }),
);

let broken = 0;
for (const r of results) if (!names.some((n) => r[n].ok)) broken++;
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(cases.map((c, i) => ({ language: c.key, case: c.note, ...results[i] })), null, 1));
} else {
  for (const [i, c] of cases.entries()) {
    const r = results[i];
    const cells = names.map((n) => (r[n].skip ? `${n}: -` : `${n}: ${r[n].ok ? "✓" : "✗"} ${(r[n].ms / 1000).toFixed(1)} sn`));
    console.log(`${names.some((n) => r[n].ok) ? "✓" : "✗"} ${c.key.padEnd(10)} ${c.note.padEnd(18)} ${cells.join("  |  ")}`);
    for (const n of names) if (r[n].detail) console.log(`      ${n}: ${r[n].detail.replace(/\s+/g, " ")}`);
  }
  console.log(broken ? `\n${broken} durumda hiçbir servis çalışmadı.` : "\nHer dil en az bir serviste çalışıyor.");
}
process.exitCode = broken ? 1 : 0;
