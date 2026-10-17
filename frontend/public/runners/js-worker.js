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

self.onmessage = async ({ data }) => {
  const lines = (data.stdin || "").split("\n");
  self.prompt = () => (lines.length ? lines.shift() : null);
  try {
    const AsyncFunction = (async () => {}).constructor;
    await new AsyncFunction(data.code)();
    postMessage({ type: "done", exitCode: 0 });
  } catch (err) {
    postMessage({ type: "out", stream: "stderr", text: `${err && err.name ? `${err.name}: ${err.message}` : String(err)}\n` });
    postMessage({ type: "done", exitCode: 1 });
  }
};
