import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { config } from "../src/config.js";
import { api, createCourse, resetDb } from "./helpers.js";

beforeEach(resetDb);

describe("arama motoru dosyaları", () => {
  it("robots.txt özel sayfaları kapatır ve site haritasını gösterir", async () => {
    const res = await api().get("/robots.txt");
    expect(res.status).toBe(200);
    expect(res.type).toBe("text/plain");
    expect(res.text).toContain("Disallow: /admin");
    expect(res.text).toContain("Disallow: /profile");
    expect(res.text).toContain(`Sitemap: ${config.siteUrl}/sitemap.xml`);
  });

  it("sitemap.xml sadece yayındaki kursları ve yazıları listeler", async () => {
    const { course } = await createCourse();
    const { course: draft } = await createCourse({ published: false });
    const post = await prisma.blogPost.create({ data: { title: "Yol", summary: "Özet", content: "İçerik", published: true } });
    await prisma.blogPost.create({ data: { title: "Taslak", summary: "Özet", content: "İçerik", published: false } });

    const res = await api().get("/sitemap.xml");
    expect(res.status).toBe(200);
    expect(res.type).toBe("application/xml");
    expect(res.text).toContain(`<loc>${config.siteUrl}/</loc>`);
    expect(res.text).toContain(`<loc>${config.siteUrl}/courses/${course.id}</loc>`);
    expect(res.text).not.toContain(`/courses/${draft.id}<`);
    expect(res.text).toContain(`<loc>${config.siteUrl}/roadmap/${post.id}</loc>`);
    expect(res.text.match(/<url>/g)).toHaveLength(8);
  });
});
