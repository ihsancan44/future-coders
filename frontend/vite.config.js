import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { DEFAULT_DESCRIPTION, OG_IMAGE, PAGES, SITE_NAME, clip, fullTitle } from "./src/seo/pages.js";

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

// Sitenin internetteki adresi (örn. https://codevia.com.tr). Verilirse sayfaların asıl adresi (canonical) ve
// paylaşım görseli tam adresle yazılır; verilmezse tarayıcıdaki adres kullanılır.
const siteUrl = (process.env.VITE_SITE_URL || "").trim().replace(/\/+$/, "");

const escapeAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Bir sayfanın <head> etiketleri: başlık, açıklama, paylaşım önizlemesi (Open Graph / Twitter). */
function seoHead(pagePath) {
  const page = PAGES[pagePath] || {};
  const title = escapeAttr(fullTitle(page.title));
  const description = escapeAttr(clip(page.description || DEFAULT_DESCRIPTION));
  const image = `${siteUrl}${OG_IMAGE}`;
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="robots" content="index, follow" />`,
    siteUrl && `<link rel="canonical" href="${siteUrl}${pagePath}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="tr_TR" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    siteUrl && `<meta property="og:url" content="${siteUrl}${pagePath}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Codevia logosu ve sloganı" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ];
  return `<!-- seo:start -->\n    ${tags.filter(Boolean).join("\n    ")}\n    <!-- seo:end -->`;
}

/**
 * Arama motorları ve paylaşım önizlemeleri (WhatsApp, X...) sayfanın JavaScript'ini çalıştırmadan da doğru başlığı
 * görsün diye sabit sayfalar (/courses, /roadmap...) için kendi başlıklarıyla hazır HTML kopyası yazılır.
 * nginx önce bu dosyalara bakar (nginx.conf). Kurs ve yazı sayfalarının bilgisi sayfa açılınca eklenir.
 */
function seoPages() {
  let outDir = "dist";
  return {
    name: "codevia-seo-pages",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    transformIndexHtml: (html) => html.replace("<!-- seo -->", seoHead("/")),
    writeBundle() {
      const index = fs.readFileSync(path.join(outDir, "index.html"), "utf8");
      const block = /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/;
      for (const pagePath of Object.keys(PAGES)) {
        if (pagePath === "/") continue;
        fs.mkdirSync(path.join(outDir, pagePath), { recursive: true });
        fs.writeFileSync(path.join(outDir, pagePath, "index.html"), index.replace(block, seoHead(pagePath)));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), codeRuntimes(), seoPages()],
  server: {
    proxy: {
      "/api": backend,
      "/uploads": backend,
      "/robots.txt": backend,
      "/sitemap.xml": backend,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
  },
});
