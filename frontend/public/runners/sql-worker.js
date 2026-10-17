// SQL kodunu tarayıcıda SQLite (sql.js) ile çalıştırır. Her çalıştırma boş bir veritabanıyla başlar.
importScripts("/sqljs/sql-wasm.js");

const ready = initSqlJs({ locateFile: (f) => `/sqljs/${f}` });

self.onmessage = async ({ data }) => {
  let db;
  try {
    const SQL = await ready;
    db = new SQL.Database();
    const results = db.exec(data.code);
    postMessage({ type: "tables", tables: results.map((r) => ({ columns: r.columns, rows: r.values })) });
    if (!results.length) postMessage({ type: "out", stream: "stdout", text: "Sorgu çalıştı (gösterilecek satır yok).\n" });
    postMessage({ type: "done", exitCode: 0 });
  } catch (err) {
    postMessage({ type: "out", stream: "stderr", text: `${err.message}\n` });
    postMessage({ type: "done", exitCode: 1 });
  } finally {
    if (db) db.close();
  }
};
