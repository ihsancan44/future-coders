import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CourseCard from "./CourseCard";

const course = {
  id: 3,
  title: "React İle Başlangıç",
  summary: "Bileşen mantığını öğren.",
  category: "Frontend",
  coverImage: null,
  level: "ALPHA",
  lessonCount: 3,
  totalMinutes: 112,
  commentCount: 7,
  access: { canAccess: false, message: "Kurs içeriğini görmek için giriş yapın." },
};

describe("CourseCard", () => {
  it("kurs bilgilerini ve doğru bağlantıyı gösterir", () => {
    render(<MemoryRouter><CourseCard course={course} /></MemoryRouter>);
    expect(screen.getByRole("link")).toHaveProperty("pathname", "/courses/3");
    expect(screen.getByText("React İle Başlangıç")).toBeTruthy();
    expect(screen.getByText("3 ders")).toBeTruthy();
    expect(screen.getByText("1 sa 52 dk")).toBeTruthy();
    expect(screen.getByText("Kilitli")).toBeTruthy();
  });

  it("erişimi olan kursta kilit göstermez", () => {
    render(<MemoryRouter><CourseCard course={{ ...course, access: { canAccess: true } }} /></MemoryRouter>);
    expect(screen.queryByText("Kilitli")).toBeNull();
  });
});
