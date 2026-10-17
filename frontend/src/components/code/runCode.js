import { api, apiError } from "../../api/client";
import { languageByKey } from "../../utils/languages";

const TIMEOUT_MS = { javascript: 8000, python: 30000, sql: 10000 };
const WORKERS = {
  javascript: () => new Worker("/runners/js-worker.js"),
  python: () => new Worker("/runners/python-worker.mjs", { type: "module" }),
  sql: () => new Worker("/runners/sql-worker.js"),
};
// Python'un yüklenmesi birkaç saniye sürer: çalışan bir kez açılıp tekrar kullanılır.
const pool = {};

function runInWorker(key, code, stdin, onStatus) {
  return new Promise((resolve) => {
    const worker = pool[key] || WORKERS[key]();
    pool[key] = key === "python" ? worker : null;
    const result = { stdout: "", stderr: "", tables: null, exitCode: null };
    let timer = null;
    const finish = (extra) => {
      clearTimeout(timer);
      worker.onmessage = null;
      if (key !== "python" || extra?.killed) worker.terminate();
      if (extra?.killed) pool[key] = null;
      resolve({ ...result, ...extra });
    };
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => finish({ killed: true, exitCode: null, stderr: `${result.stderr}Kod ${TIMEOUT_MS[key] / 1000} saniyede bitmedi ve durduruldu. Sonsuz döngü olabilir mi?\n` }),
        TIMEOUT_MS[key],
      );
    };
    worker.onmessage = ({ data }) => {
      if (data.type === "out") result[data.stream] += data.text;
      else if (data.type === "tables") result.tables = data.tables;
      else if (data.type === "status") {
        onStatus?.(data.text);
        // Python'un ilk yüklenmesi zaman sınırına sayılmaz; süre kod çalışmaya başlayınca başlar.
        if (!data.text) arm();
      } else if (data.type === "done") finish({ exitCode: data.exitCode });
    };
    worker.onerror = (e) => finish({ killed: true, exitCode: 1, stderr: `${result.stderr}${e.message || "Çalıştırıcı başlatılamadı."}\n` });
    if (key !== "python") arm();
    worker.postMessage({ code, stdin });
  });
}

/** Kodu dile göre tarayıcıda ya da derleme servisinde çalıştırır. */
export async function runCode(languageKey, code, stdin = "", { onStatus } = {}) {
  const lang = languageByKey(languageKey);
  if (!lang) throw new Error("Bilinmeyen dil.");
  if (lang.key === "web") return { preview: code };
  if (lang.runtime === "browser") return runInWorker(lang.key, code, stdin, onStatus);
  onStatus?.("Kod derleniyor…");
  try {
    const { data } = await api.post("/code/run", { language: lang.key, code, stdin });
    return data;
  } catch (err) {
    const e = apiError(err);
    return { stdout: "", stderr: `${e.message}\n`, exitCode: null, serviceError: true, status: e.status };
  } finally {
    onStatus?.("");
  }
}
