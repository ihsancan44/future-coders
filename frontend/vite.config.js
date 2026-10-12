import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Geliştirmede /api ve /uploads istekleri backend'e yönlendirilir.
const backend = process.env.VITE_DEV_BACKEND || "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
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
