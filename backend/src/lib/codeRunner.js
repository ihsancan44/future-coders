// Sunucu dillerini ücretsiz derleme servislerinde çalıştırır: Judge0, Wandbox ve paiza.io.
// Servisler config.codeRunners.order sırasıyla denenir. Bir servis çökerse, zaman aşımına uğrarsa ya da kendi
// kurulumu bozuksa (öğrencinin kodundaki hata değil) sıradaki servise geçilir ve bozuk servis bir süre atlanır.
import { config } from "../config.js";
import { HttpError } from "./errors.js";
import { LANGUAGES, languageByKey } from "../data/languages.js";
import { prepareJava } from "./javaSource.js";

const LIST_TTL_MS = 6 * 60 * 60 * 1000;
/** Bir öğrencinin bir çalıştırma için en fazla bekleyeceği süre (tüm servisler birlikte). */
const TOTAL_MS = 75_000;
/** Servis tamamen ulaşılamazsa bu kadar süre sona bırakılır. */
const SERVICE_DOWN_MS = 2 * 60 * 1000;
/** Servis bir dili çalıştıramıyorsa (kurulumu bozuk) o dil için bu kadar süre sona bırakılır. */
const LANGUAGE_DOWN_MS = 30 * 60 * 1000;

const unavailable = (msg) => new HttpError(503, msg, undefined, "RUNNER_UNAVAILABLE");

/** Servisten kaynaklı (öğrencinin kodundan değil) hata: sıradaki servis denenir. */
class ServiceError extends Error {
  constructor(message, { timeout = false, whole = false } = {}) {
    super(message);
    this.timeout = timeout;
    /** true: servisin tamamı çalışmıyor; false: yalnızca bu dil. */
    this.whole = whole;
  }
}

async function http(url, { body, headers, timeoutMs, method } = {}) {
  let res;
  try {
    res = await fetch(url, {
      method: method || (body ? "POST" : "GET"),
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(Math.max(1000, timeoutMs)),
    });
  } catch (err) {
    const timeout = err?.name === "TimeoutError" || err?.name === "AbortError";
    throw new ServiceError(timeout ? "zaman aşımı" : "ulaşılamadı", { timeout, whole: !timeout });
  }
  if (!res.ok) throw new ServiceError(`HTTP ${res.status}`, { whole: res.status === 429 || res.status >= 500 || res.status === 401 || res.status === 403 });
  try {
    return await res.json();
  } catch {
    throw new ServiceError("cevap okunamadı", { whole: true });
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const versionKey = (v) => String(v || "").split(/[^\d]+/).filter(Boolean).map(Number);
function newer(a, b) {
  const x = versionKey(a);
  const y = versionKey(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  }
  return false;
}
const newest = (items, version) => items.reduce((best, c) => (!best || newer(version(c), version(best)) ? c : best), null);

/** Servisin dil listesini birkaç saat önbellekte tutar. */
function cachedList(load) {
  let cache = { at: 0, list: null };
  const get = async () => {
    if (cache.list && Date.now() - cache.at < LIST_TTL_MS) return cache.list;
    const list = await load();
    if (!Array.isArray(list)) throw new ServiceError("dil listesi okunamadı", { whole: true });
    cache = { at: Date.now(), list };
    return list;
  };
  get.reset = () => {
    cache = { at: 0, list: null };
  };
  return get;
}

/* ---------------------------------------------------------------- Wandbox */

const wandboxList = cachedList(() => http(`${config.codeRunners.wandbox.url}/api/list.json`, { timeoutMs: 15_000 }));

/**
 * Dil için derleyiciyi seçer: önce denenmiş sürümler (prefer, sırasıyla), yoksa kararlı ("head" olmayan) en yeni sürüm.
 * @param {Array} list Wandbox derleyici listesi
 * @param {{language: string, prefer?: string[]}|string} spec
 */
export function pickCompiler(list, spec) {
  const { language, prefer = [] } = typeof spec === "string" ? { language: spec } : spec;
  const all = list.filter((c) => c.language === language);
  for (const p of prefer) {
    const hit = newest(all.filter((c) => c.name.startsWith(p)), (c) => c.version);
    if (hit) return hit.name;
  }
  const stable = all.filter((c) => !/head|dev|snapshot/i.test(`${c.name} ${c.version}`));
  return newest(stable.length ? stable : all, (c) => c.version)?.name ?? null;
}

// Wandbox'ın kendi kurulumundan gelen hatalar. Öğrencinin kodundaki hatalar bunlara benzemez:
// konteyner hataları ya da Wandbox'ın /opt/wandbox/.../bin altındaki betiklerinin "bulunamadı/izin yok" mesajları.
const WANDBOX_BROKEN = [
  /catatonit|OCI runtime error|crun: /,
  /^\/opt\/wandbox\/\S*\/bin\/\S+: (?:line \d+: )?.*(?:error while loading shared libraries|Permission denied|File size limit exceeded|No such file or directory|command not found|cannot change locale)/m,
];

const wandbox = {
  name: "Wandbox",
  supports: (lang) => Boolean(lang.wandbox),
  async languages() {
    const list = await wandboxList();
    return LANGUAGES.filter((l) => l.wandbox && pickCompiler(list, l.wandbox)).map((l) => l.key);
  },
  async run(lang, code, stdin, timeoutMs) {
    const compiler = pickCompiler(await wandboxList(), lang.wandbox);
    if (!compiler) throw new ServiceError("dil serviste yok");
    const source = lang.key === "java" ? prepareJava(code, "prog") : code;
    const r = await http(`${config.codeRunners.wandbox.url}/api/compile.json`, { body: { compiler, code: source, stdin, save: false }, timeoutMs });
    const stdout = r.program_output || "";
    const stderr = r.program_error || "";
    const compileOutput = r.compiler_message || "";
    const text = `${compileOutput}\n${stderr}`;
    if (WANDBOX_BROKEN.some((re) => re.test(text)) || (String(r.status) === "153" && !stdout)) throw new ServiceError(`${compiler} bozuk`);
    const status = Number(r.status);
    return { compiler: `Wandbox · ${compiler}`, stdout, stderr, compileOutput, exitCode: r.status !== undefined && Number.isFinite(status) ? status : null, signal: r.signal || null };
  },
};

/* ---------------------------------------------------------------- Judge0 */

const judge0Headers = () => (config.codeRunners.judge0.key ? { "X-Auth-Token": config.codeRunners.judge0.key } : {});
const judge0List = cachedList(() => http(`${config.codeRunners.judge0.url}/languages`, { headers: judge0Headers(), timeoutMs: 15_000 }));

/** Judge0'daki dil numarası: adı verilen başla başlayanlardan en yeni sürüm. */
export function pickJudge0(list, prefix) {
  return newest(list.filter((l) => !l.is_archived && String(l.name).startsWith(prefix)), (l) => l.name)?.id ?? null;
}

const b64 = (s) => Buffer.from(s, "utf8").toString("base64");
const unb64 = (s) => (s ? Buffer.from(s, "base64").toString("utf8") : "");
const JUDGE0_FIELDS = "token,stdout,stderr,compile_output,message,status,exit_code,exit_signal";

const judge0 = {
  name: "Judge0",
  supports: (lang) => Boolean(lang.judge0),
  async languages() {
    const list = await judge0List();
    return LANGUAGES.filter((l) => l.judge0 && pickJudge0(list, l.judge0)).map((l) => l.key);
  },
  async run(lang, code, stdin, timeoutMs) {
    const list = await judge0List();
    const id = pickJudge0(list, lang.judge0);
    if (!id) throw new ServiceError("dil serviste yok");
    const deadline = Date.now() + timeoutMs;
    const { url } = config.codeRunners.judge0;
    const source = lang.key === "java" ? prepareJava(code, "Main") : code;
    let r = await http(`${url}/submissions?base64_encoded=true&wait=true&fields=${JUDGE0_FIELDS}`, {
      body: { language_id: id, source_code: b64(source), stdin: b64(stdin) },
      headers: judge0Headers(),
      timeoutMs,
    });
    // Sırada bekleyen gönderim: bitene kadar kısa aralıklarla sorulur.
    while (r.token && [1, 2].includes(r.status?.id)) {
      if (Date.now() + 1000 > deadline) throw new ServiceError("zaman aşımı", { timeout: true });
      await sleep(1000);
      r = await http(`${url}/submissions/${r.token}?base64_encoded=true&fields=${JUDGE0_FIELDS}`, { headers: judge0Headers(), timeoutMs: deadline - Date.now() });
    }
    const statusId = r.status?.id;
    if (!statusId || statusId === 13 || statusId === 14) throw new ServiceError(`Judge0: ${r.status?.description || "bilinmeyen durum"}`);
    let stderr = unb64(r.stderr);
    if (statusId === 5) stderr += "Kod zaman sınırında bitmedi ve durduruldu. Sonsuz döngü olabilir mi?\n";
    const exitCode = r.exit_code ?? (statusId === 3 ? 0 : statusId === 6 ? 1 : null);
    const name = list.find((l) => l.id === id)?.name || lang.label;
    return { compiler: `Judge0 · ${name}`, stdout: unb64(r.stdout), stderr, compileOutput: unb64(r.compile_output), exitCode, signal: r.exit_signal ? String(r.exit_signal) : null };
  },
};

/* ---------------------------------------------------------------- paiza.io */

const paiza = {
  name: "paiza.io",
  supports: (lang) => Boolean(lang.paiza),
  // paiza.io dil listesi vermez; desteklenen diller sabittir.
  languages: async () => LANGUAGES.filter((l) => l.paiza).map((l) => l.key),
  async run(lang, code, stdin, timeoutMs) {
    const { url, key } = config.codeRunners.paiza;
    const deadline = Date.now() + timeoutMs;
    const source = lang.key === "java" ? prepareJava(code, "Main") : code;
    const created = await http(`${url}/runners/create`, {
      body: { source_code: source, language: lang.paiza, input: stdin, api_key: key, longpoll: true, longpoll_timeout: 10 },
      timeoutMs,
    });
    if (!created?.id || created.error) throw new ServiceError(`paiza.io: ${created?.error || "çalıştırılamadı"}`, { whole: true });
    const q = `id=${encodeURIComponent(created.id)}&api_key=${encodeURIComponent(key)}`;
    let status = created.status;
    while (status !== "completed") {
      if (Date.now() + 1000 > deadline) throw new ServiceError("zaman aşımı", { timeout: true });
      await sleep(1000);
      status = (await http(`${url}/runners/get_status?${q}`, { timeoutMs: deadline - Date.now() })).status;
    }
    const d = await http(`${url}/runners/get_details?${q}`, { timeoutMs: Math.max(5000, deadline - Date.now()) });
    if (d.error) throw new ServiceError(`paiza.io: ${d.error}`);
    const buildFailed = d.build_result === "failure";
    let stderr = d.stderr || "";
    if (d.result === "timeout" || d.build_result === "timeout") stderr += "Kod zaman sınırında bitmedi ve durduruldu. Sonsuz döngü olabilir mi?\n";
    const exit = Number(buildFailed ? d.build_exit_code : d.exit_code);
    return {
      compiler: `paiza.io · ${lang.label}`,
      stdout: d.stdout || "",
      stderr,
      compileOutput: `${d.build_stdout || ""}${d.build_stderr || ""}`,
      exitCode: Number.isFinite(exit) ? exit : null,
      signal: null,
    };
  },
};

/* ---------------------------------------------------------------- Ortak */

/** Teşhis betiği (scripts/check-compilers.js) her servisi ayrı ayrı denesin diye dışa açıktır. */
export const SERVICES = { judge0, wandbox, paiza };
const timeouts = { judge0: 25_000, wandbox: 50_000, paiza: 30_000 };
/** "servis" ya da "servis:dil" → bu zamana kadar sona bırakılır. */
const down = new Map();
const isDown = (key) => (down.get(key) ?? 0) > Date.now();

export function resetCompilerCache() {
  wandboxList.reset();
  judge0List.reset();
  down.clear();
}

/** Bu kurulumda açık olan servisler, sırasıyla. */
const enabledServices = () => config.codeRunners.order.map((n) => [n, SERVICES[n]]).filter(([, s]) => s);

/** Sunucuda derlenen dillerden en az bir serviste bulunanlar. Hiçbir servise ulaşılamazsa null. */
export async function availableServerLanguages() {
  const services = enabledServices();
  if (!services.length) return [];
  const results = await Promise.allSettled(services.map(([, s]) => s.languages()));
  if (results.every((r) => r.status === "rejected")) return null;
  const keys = new Set(results.flatMap((r) => (r.status === "fulfilled" ? r.value : [])));
  return LANGUAGES.filter((l) => keys.has(l.key)).map((l) => l.key);
}

export async function runCode({ language, code, stdin }) {
  const lang = languageByKey(language);
  if (!lang || lang.runtime !== "server") throw new HttpError(400, "Bu dil tarayıcıda çalışır, sunucuya gönderilmez.");
  const services = enabledServices();
  if (!services.length) throw unavailable("Sunucu derleyicisi bu kurulumda kapalı. Yöneticinize haber verin.");
  const candidates = services.filter(([, s]) => s.supports(lang));
  if (!candidates.length) throw unavailable(`${lang.label} bu kurulumdaki derleme servislerinde bulunmuyor.`);
  // Yakın zamanda çöken servisler sona bırakılır ama yine de denenir: hepsi çökmüşse en azından bir şans olsun.
  const healthy = (n) => !isDown(n) && !isDown(`${n}:${lang.key}`);
  const ordered = [...candidates.filter(([n]) => healthy(n)), ...candidates.filter(([n]) => !healthy(n))];

  const deadline = Date.now() + TOTAL_MS;
  let timedOut = false;
  let reached = false;
  for (const [name, service] of ordered) {
    const left = deadline - Date.now();
    if (left < 3000) break;
    try {
      return await service.run(lang, code, stdin || "", Math.min(timeouts[name], left));
    } catch (err) {
      if (!(err instanceof ServiceError)) throw err;
      timedOut ||= err.timeout;
      reached ||= !err.whole;
      down.set(err.whole ? name : `${name}:${lang.key}`, Date.now() + (err.whole ? SERVICE_DOWN_MS : LANGUAGE_DOWN_MS));
      if (!config.isTest) console.warn(`[derleyici] ${service.name} ${lang.label}: ${err.message}`);
    }
  }
  if (timedOut) throw unavailable("Derleme servisleri zamanında cevap vermedi. Biraz sonra tekrar deneyin.");
  if (reached) throw unavailable(`${lang.label} şu an derleme servislerinde çalışmıyor. Biraz sonra tekrar deneyin.`);
  throw unavailable("Derleme servislerine ulaşılamadı. İnternet bağlantısını kontrol edip tekrar deneyin.");
}
