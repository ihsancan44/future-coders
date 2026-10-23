import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import courseRoutes from "./routes/courses.js";
import examRoutes from "./routes/exams.js";
import blogRoutes from "./routes/blog.js";
import careerRoutes from "./routes/career.js";
import adminRoutes from "./routes/admin/index.js";
import codeRoutes from "./routes/code.js";
import assistantRoutes from "./routes/assistant.js";
import seoRoutes from "./routes/seo.js";
import { errorHandler, notFoundHandler, rejectNullChars } from "./middleware/error.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: config.clientUrls }));
  app.use(express.json({ limit: "1mb" }));
  app.use(rejectNullChars);
  if (!config.isTest) app.use(morgan(config.isProduction ? "combined" : "dev"));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/uploads", express.static(config.uploadDir, { maxAge: "7d" }));
  app.use("/api/auth", authRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api/exams", examRoutes);
  app.use("/api/blog", blogRoutes);
  app.use("/api/career", careerRoutes);
  app.use("/api/code", codeRoutes);
  app.use("/api/assistant", assistantRoutes);
  app.use("/api/admin", adminRoutes);
  // robots.txt ve sitemap.xml: nginx (ve geliştirmede Vite) bu iki adresi backend'e yönlendirir.
  app.use(seoRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
