import { Router } from "express";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/errors.js";

const router = Router();

// Arama motorlarının gezebileceği herkese açık sayfalar. Giriş gerektiren ve kişiye özel sayfalar listede yok.
const STATIC_PAGES = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/courses", priority: "0.9", changefreq: "daily" },
  { path: "/roadmap", priority: "0.8", changefreq: "weekly" },
  { path: "/compiler", priority: "0.6", changefreq: "monthly" },
  { path: "/register", priority: "0.5", changefreq: "yearly" },
  { path: "/login", priority: "0.3", changefreq: "yearly" },
];

// Arama sonuçlarında çıkmaması gerekenler: yönetim paneli, kişisel sayfalar, sınavlar ve şifre sayfaları.
const PRIVATE_PATHS = ["/admin", "/api/", "/profile", "/placement", "/career", "/forgot-password", "/reset-password", "/courses/*/final"];

const xmlEscape = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);
const day = (d) => d.toISOString().slice(0, 10);

router.get("/robots.txt", (_req, res) => {
  const lines = ["User-agent: *", ...PRIVATE_PATHS.map((p) => `Disallow: ${p}`), "", `Sitemap: ${config.siteUrl}/sitemap.xml`, ""];
  res.type("text/plain").set("Cache-Control", "public, max-age=3600").send(lines.join("\n"));
});

router.get(
  "/sitemap.xml",
  asyncHandler(async (_req, res) => {
    const [courses, posts] = await Promise.all([
      prisma.course.findMany({ where: { published: true }, select: { id: true, updatedAt: true }, orderBy: { id: "asc" } }),
      prisma.blogPost.findMany({ where: { published: true }, select: { id: true, updatedAt: true }, orderBy: { id: "asc" } }),
    ]);
    const urls = [
      ...STATIC_PAGES,
      ...courses.map((c) => ({ path: `/courses/${c.id}`, lastmod: day(c.updatedAt), priority: "0.8", changefreq: "weekly" })),
      ...posts.map((p) => ({ path: `/roadmap/${p.id}`, lastmod: day(p.updatedAt), priority: "0.7", changefreq: "monthly" })),
    ];
    const body = urls
      .map((u) =>
        [
          "  <url>",
          `    <loc>${xmlEscape(config.siteUrl + u.path)}</loc>`,
          u.lastmod && `    <lastmod>${u.lastmod}</lastmod>`,
          `    <changefreq>${u.changefreq}</changefreq>`,
          `    <priority>${u.priority}</priority>`,
          "  </url>",
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .join("\n");
    res
      .type("application/xml")
      .set("Cache-Control", "public, max-age=3600")
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
  }),
);

export default router;
