// Derleyicideki JavaScript kodunu sayfadan ayrı bir iş parçacığında çalıştırır:
// sonsuz döngü sayfayı kilitlemez, sayfa çalışanı zaman aşımında sonlandırır.
const show = (v) => {
  if (typeof v === "string") return v;
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  try {
    const seen = new WeakSet();
    return JSON.stringify(v, (_k, x) => {
      if (typeof x === "object" && x !== null) {
        if (seen.has(x)) return "[Döngüsel]";
        seen.add(x);
      }
      if (typeof x === "function") return `[Fonksiyon ${x.name || "anonim"}]`;
      if (typeof x === "bigint") return `${x}n`;
      return x;
    });
  } catch {
    return String(v);
  }
};

const emit = (stream) => (...args) => postMessage({ type: "out", stream, text: `${args.map(show).join(" ")}\n` });
console.log = console.info = console.debug = emit("stdout");
console.error = console.warn = emit("stderr");
console.table = emit("stdout");

const report = (err) => postMessage({ type: "out", stream: "stderr", text: `${err && err.name ? `${err.name}: ${err.message}` : String(err)}\n` });

// Zamanlayıcılar sayılır: kod bitse de bekleyen setTimeout/setInterval varsa onların çıktısı da beklenir.
// Hiç durdurulmayan setInterval sayfanın koyduğu zaman sınırında kesilir.
const active = new Set();
let finished = false;
let exitCode = 0;
const check = () => {
  if (finished && active.size === 0) {
    finished = false;
    postMessage({ type: "done", exitCode });
  }
};
const { setTimeout: st, clearTimeout: ct, setInterval: si, clearInterval: ci } = self;
self.setTimeout = (fn, ms, ...args) => {
  const id = st(() => {
    active.delete(id);
    try {
      if (typeof fn === "function") fn(...args);
    } catch (err) {
      report(err);
      exitCode = 1;
    }
    check();
  }, ms);
  active.add(id);
  return id;
};
self.clearTimeout = (id) => {
  active.delete(id);
  ct(id);
  check();
};
self.setInterval = (fn, ms, ...args) => {
  const id = si(() => {
    try {
      fn(...args);
    } catch (err) {
      report(err);
      exitCode = 1;
    }
  }, ms);
  active.add(id);
  return id;
};
self.clearInterval = (id) => {
  active.delete(id);
  ci(id);
  check();
};
self.addEventListener("unhandledrejection", (e) => {
  report(e.reason);
  exitCode = 1;
});

self.onmessage = async ({ data }) => {
  const lines = (data.stdin || "").split("\n");
  self.prompt = () => (lines.length ? lines.shift() : null);
  try {
    const AsyncFunction = (async () => {}).constructor;
    await new AsyncFunction(data.code)();
  } catch (err) {
    report(err);
    exitCode = 1;
  }
  // Promise'lerin kalan adımları (then/await) çalışsın diye bir tur beklenir.
  st(() => {
    finished = true;
    check();
  }, 0);
};
