import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, notFound } from "../lib/errors.js";
import { idParam } from "../lib/params.js";
import { authorName } from "../lib/serializers.js";
import { validate } from "../middleware/validate.js";

const router = Router();

export function blogCard(post) {
  return {
    id: post.id,
    title: post.title,
    summary: post.summary,
    coverImage: post.coverImage,
    tag: post.tag,
    author: authorName(post.author),
    published: post.published,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

router.get(
  "/",
  validate(z.object({ tag: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).optional() }), "query"),
  asyncHandler(async (req, res) => {
    const posts = await prisma.blogPost.findMany({
      where: { published: true, ...(req.query.tag ? { tag: req.query.tag } : {}) },
      orderBy: { createdAt: "desc" },
      take: req.query.limit,
      include: { author: true },
    });
    const tags = await prisma.blogPost.findMany({
      where: { published: true },
      distinct: ["tag"],
      select: { tag: true },
      orderBy: { tag: "asc" },
    });
    res.json({ posts: posts.map(blogCard), tags: tags.map((t) => t.tag) });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const post = await prisma.blogPost.findFirst({
      where: { id: idParam(req.params.id), published: true },
      include: { author: true },
    });
    if (!post) throw notFound("Yazı bulunamadı.");
    res.json({ post: { ...blogCard(post), content: post.content } });
  }),
);

export default router;
