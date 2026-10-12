import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middleware/auth.js";
import courses from "./courses.js";
import blog from "./blog.js";
import exams from "./exams.js";
import users from "./users.js";
import stats from "./stats.js";
import uploads from "./uploads.js";

const router = Router();
router.use(requireAuth, requireAdmin);
router.use("/courses", courses);
router.use("/blog", blog);
router.use("/exams", exams);
router.use(users);
router.use(stats);
router.use(uploads);

export default router;
