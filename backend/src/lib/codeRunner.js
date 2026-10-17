import { config } from "../config.js";
import { HttpError } from "./errors.js";
import { LANGUAGES, languageByKey } from "../data/languages.js";

const LIST_TTL_MS = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 30_000;
let cache = { at: 0, list: null };

const unavailable = (msg) => new HttpError(503, msg, undefined, "RUNNER_UNAVAILABLE");

async function request(path, body) {
  const res = await fetch(`${config.codeRunnerUrl}${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Derleme servisi ${res.status} döndürdü.`);
  return res.json();
}

/** Servisteki derleyici listesi; birkaç saat önbellekte tutulur. */
async function compilerList() {
  if (cache.list && Date.now() - cache.at < LIST_TTL_MS) return cache.list;
  const list = await request("/api/list.json");
  if (!Array.isArray(list)) throw new Error("Derleyici listesi okunamadı.");
  cache = { at: Date.now(), list };
  return list;
}

export function resetCompilerCache() {
  cache = { at: 0, list: null };
}

const versionKey = (v) => String(v || "").split(/[^\d]+/).filter(Boolean).map(Number);
function newer(a, b) {
  const x = versionKey(a.version);
  const y = versionKey(b.version);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  }
  return false;
}

/** Dil için kararlı ("head" olmayan) en yeni derleyiciyi seçer; yoksa geliştirme sürümünü. */
export function pickCompiler(list, wandboxLanguage) {
  const all = list.filter((c) => c.language === wandboxLanguage);
  const stable = all.filter((c) => !/head|dev|snapshot/i.test(`${c.name} ${c.version}`));
  const pool = stable.length ? stable : all;
  return pool.reduce((best, c) => (!best || newer(c, best) ? c : best), null)?.name ?? null;
}

/** Sunucuda derlenen dillerden serviste gerçekten bulunanlar. Servise ulaşılamazsa null. */
export async function availableServerLanguages() {
  if (!config.codeRunnerUrl) return [];
  try {
    const list = await compilerList();
    return listKeys(list);
  } catch {
    return null;
  }
}

function listKeys(list) {
  const names = new Set(list.map((c) => c.language));
  return LANGUAGES.filter((l) => l.runtime === "server" && names.has(l.wandbox)).map((l) => l.key);
}

export async function runCode({ language, code, stdin }) {
  const lang = languageByKey(language);
  if (!lang || lang.runtime !== "server") throw new HttpError(400, "Bu dil tarayıcıda çalışır, sunucuya gönderilmez.");
  if (!config.codeRunnerUrl) throw unavailable("Sunucu derleyicisi bu kurulumda kapalı. Yöneticinize haber verin.");
  let compiler;
  try {
    compiler = pickCompiler(await compilerList(), lang.wandbox);
  } catch {
    throw unavailable("Derleme servisine ulaşılamadı. İnternet bağlantısını kontrol edip tekrar deneyin.");
  }
  if (!compiler) throw unavailable(`${lang.label} şu an derleme servisinde bulunmuyor.`);
  let r;
  try {
    r = await request("/api/compile.json", { compiler, code, stdin: stdin || "", save: false });
  } catch {
    throw unavailable("Derleme servisi zamanında cevap vermedi. Biraz sonra tekrar deneyin.");
  }
  const status = Number(r.status);
  return {
    compiler,
    stdout: r.program_output || "",
    stderr: r.program_error || "",
    compileOutput: r.compiler_message || "",
    exitCode: Number.isFinite(status) ? status : null,
    signal: r.signal || null,
  };
}
