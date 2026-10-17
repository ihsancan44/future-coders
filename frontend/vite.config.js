import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Geliştirmede /api ve /uploads istekleri backend'e yönlendirilir.
const backend = process.env.VITE_DEV_BACKEND || "http://localhost:4000";

// Derleyicinin tarayıcıda çalışan Python (Pyodide) ve SQL (sql.js) dosyaları node_modules'tan
// aynı adresle sunulur: internet olmadan da çalışır, sürüm package.json'daki sürümdür.
const runtimeFiles = {
  pyodide: { dir: "node_modules/pyodide", files: ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"] },
  sqljs: { dir: "node_modules/sql.js/dist", files: ["sql-wasm.js", "sql-wasm.wasm"] },
};

const MIME = { ".mjs": "text/javascript", ".js": "text/javascript", ".wasm": "application/wasm", ".zip": "application/zip", ".json": "application/json" };

function codeRuntimes() {
  let outDir = "dist";
  let building = false;
  return {
    name: "codevia-code-runtimes",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      building = config.command === "build" && !process.env.VITEST;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const [, prefix, name] = (req.url || "").split("?")[0].split("/");
        const group = runtimeFiles[prefix];
        if (!group || !group.files.includes(name)) return next();
        res.setHeader("Content-Type", MIME[path.extname(name)] || "application/octet-stream");
        fs.createReadStream(path.resolve(group.dir, name)).pipe(res);
      });
    },
    closeBundle() {
      if (!building) return;
      for (const [prefix, group] of Object.entries(runtimeFiles)) {
        fs.mkdirSync(path.join(outDir, prefix), { recursive: true });
        for (const name of group.files) fs.copyFileSync(path.resolve(group.dir, name), path.join(outDir, prefix, name));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), codeRuntimes()],
  server: {
    proxy: {
      "/api": backend,
      "/uploads": backend,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
  },
});
