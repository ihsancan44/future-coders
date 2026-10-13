import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, notFound } from "../../lib/errors.js";
import { idParam } from "../../lib/params.js";
import { validate } from "../../middleware/validate.js";
import { blogCard } from "../blog.js";
import { removeUpload } from "../../lib/uploads.js";
import { imageUrl } from "../../lib/validators.js";

const router = Router();

const postSchema = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter olmalı.").max(150),
  summary: z.string().trim().min(3, "Özet girin.").max(400),
  content: z.string().trim().min(3, "Yazı içeriği girin.").max(50000),
  coverImage: imageUrl,
  tag: z.string().trim().min(2).max(40).default("Genel"),
  published: z.boolean().optional(),
});

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: "desc" }, include: { author: true } });
    res.json({ posts: posts.map(blogCard) });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const post = await prisma.blogPost.findUnique({ where: { id: idParam(req.params.id) }, include: { author: true } });
    if (!post) throw notFound("Yazı bulunamadı.");
    res.json({ post: { ...blogCard(post), content: post.content } });
  }),
);

router.post(
  "/",
  validate(postSchema),
  asyncHandler(async (req, res) => {
    const post = await prisma.blogPost.create({ data: { ...req.body, authorId: req.user.id } });
    res.status(201).json({ post });
  }),
);

router.put(
  "/:id",
  validate(postSchema.partial()),
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const before = await prisma.blogPost.findUnique({ where: { id }, select: { coverImage: true } });
    const post = await prisma.blogPost.update({ where: { id }, data: req.body });
    if (before && before.coverImage !== post.coverImage) await removeUpload(before.coverImage);
    res.json({ post });
  }),
);

router.patch(
  "/:id/publish",
  validate(z.object({ published: z.boolean() })),
  asyncHandler(async (req, res) => {
    const post = await prisma.blogPost.update({
      where: { id: idParam(req.params.id) },
      data: { published: req.body.published },
    });
    res.json({ post });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const post = await prisma.blogPost.delete({ where: { id: idParam(req.params.id) } });
    await removeUpload(post.coverImage);
    res.status(204).end();
  }),
);

export default router;
