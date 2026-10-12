import { prisma } from "../lib/prisma.js";
import { forbidden, notFound, unauthorized } from "../lib/errors.js";

export const PLACEMENT_REQUIRED = "PLACEMENT_REQUIRED";
export const LEVEL_MISMATCH = "LEVEL_MISMATCH";

/** Öğrenci kendi sınıfının ve "ALL" seviyesindeki kursları açabilir; admin her şeyi açar. */
export function courseVisibleTo(user) {
  if (user?.role === "ADMIN") return {};
  if (user?.level) return { published: true, level: { in: ["ALL", user.level] } };
  return { published: true };
}

export function assertCourseAccess(user, course) {
  if (!user) throw unauthorized("Kurs içeriğini görmek için giriş yapın.");
  if (user.role === "ADMIN") return;
  if (!course.published) throw notFound("Kurs bulunamadı.");
  if (!user.level) {
    throw forbidden("Kurslara başlamadan önce seviye sınavını tamamlamalısınız.", PLACEMENT_REQUIRED);
  }
  if (course.level !== "ALL" && course.level !== user.level) {
    throw forbidden("Bu kurs sizin sınıfınıza açık değil.", LEVEL_MISMATCH);
  }
}

export async function getAccessibleCourse(user, courseId) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || (!course.published && user?.role !== "ADMIN")) throw notFound("Kurs bulunamadı.");
  assertCourseAccess(user, course);
  return course;
}

export function progressInfo(completed, total) {
  return {
    total,
    completed,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    finished: total > 0 && completed >= total,
  };
}

/** Kursun yüzde kaçı tamamlandı? (Ders yoksa %0 ve bitmemiş sayılır) */
export async function courseProgress(userId, courseId) {
  const [total, completed] = await Promise.all([
    prisma.lesson.count({ where: { courseId } }),
    prisma.lessonProgress.count({ where: { userId, lesson: { courseId } } }),
  ]);
  return progressInfo(completed, total);
}
