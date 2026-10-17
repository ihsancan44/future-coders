import request from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { signToken } from "../src/middleware/auth.js";

export const app = createApp();
export const api = () => request(app);

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Reel","PracticeQuestion","AttemptAnswer","ExamAttempt","Option","Question","Exam","LessonProgress","Comment","Lesson","Course","BlogPost","User" RESTART IDENTITY CASCADE',
  );
}

let n = 0;
export async function createUser(overrides = {}) {
  n += 1;
  const user = await prisma.user.create({
    data: {
      firstName: "Test",
      lastName: `Kullanıcı${n}`,
      email: `user${n}@test.dev`,
      passwordHash: await bcrypt.hash("Sifre12345", 4),
      school: "Test Lisesi",
      ...overrides,
    },
  });
  return { user, token: signToken(user), auth: { Authorization: `Bearer ${signToken(user)}` } };
}

export async function createCourse({ level = "ALL", published = true, lessons = 2, withFinal = false } = {}) {
  const course = await prisma.course.create({
    data: {
      title: `Kurs ${level}`,
      summary: "Özet",
      description: "Açıklama",
      category: "Frontend",
      level,
      published,
      lessons: {
        create: Array.from({ length: lessons }, (_, i) => ({ order: i + 1, title: `Ders ${i + 1}`, content: "İçerik", durationMinutes: 10 })),
      },
    },
    include: { lessons: true },
  });
  let exam = null;
  if (withFinal) exam = await createExam({ type: "FINAL", courseId: course.id });
  return { course, exam };
}

/** Her soruda ilk şık doğru. */
export async function createExam({ type = "PLACEMENT", courseId = null, questions = 5, passingScore = 60, published = true } = {}) {
  return prisma.exam.create({
    data: {
      type,
      title: `${type} sınavı`,
      courseId,
      passingScore,
      published,
      questions: {
        create: Array.from({ length: questions }, (_, i) => ({
          order: i + 1,
          text: `Soru ${i + 1}`,
          options: { create: [{ text: "Doğru", isCorrect: true }, { text: "Yanlış", isCorrect: false }] },
        })),
      },
    },
    include: { questions: { include: { options: { orderBy: { id: "asc" } } }, orderBy: { order: "asc" } } },
  });
}

/** İlk `correct` soruyu doğru, kalanları yanlış cevaplar. */
export function answersFor(exam, correct) {
  return exam.questions.map((q, i) => ({ questionId: q.id, optionId: q.options[i < correct ? 0 : 1].id }));
}
