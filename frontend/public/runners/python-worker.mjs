// Python kodunu tarayıcıda Pyodide ile çalıştırır. İlk çalıştırmada Python yüklenir (birkaç saniye),
// sonraki çalıştırmalar hızlıdır. Her çalıştırma temiz bir değişken alanında başlar.
import { loadPyodide } from "/pyodide/pyodide.mjs";

let ready = null;
let output = (stream, text) => postMessage({ type: "out", stream, text });

function boot() {
  ready ??= loadPyodide({ indexURL: "/pyodide/" }).then((py) => {
    py.setStdout({ batched: (t) => output("stdout", `${t}\n`) });
    py.setStderr({ batched: (t) => output("stderr", `${t}\n`) });
    return py;
  });
  return ready;
}

self.onmessage = async ({ data }) => {
  let py;
  try {
    postMessage({ type: "status", text: "Python hazırlanıyor…" });
    py = await boot();
  } catch (err) {
    postMessage({ type: "out", stream: "stderr", text: `Python yüklenemedi: ${err.message}\n` });
    postMessage({ type: "done", exitCode: 1 });
    return;
  }
  const lines = (data.stdin || "").split("\n");
  py.setStdin({ stdin: () => (lines.length ? lines.shift() : undefined) });
  postMessage({ type: "status", text: "" });
  const globals = py.globals.get("dict")();
  try {
    await py.runPythonAsync(data.code, { globals });
    postMessage({ type: "done", exitCode: 0 });
  } catch (err) {
    // Python hata izinin Pyodide iç satırlarını atıp sadece öğrencinin koduyla ilgili kısmı gösterir.
    const msg = String(err.message || err);
    const i = msg.indexOf('File "<exec>"');
    output("stderr", `${i >= 0 ? `Traceback (most recent call last):\n  ${msg.slice(i)}` : msg}\n`);
    postMessage({ type: "done", exitCode: 1 });
  } finally {
    globals.destroy();
  }
};
