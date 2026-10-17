import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PracticeQuiz from "./PracticeQuiz";
import RichText from "../RichText";
import { LANGUAGES } from "../../utils/languages";

const questions = [
  { text: "kare(4) ne döndürür?", code: "function kare(x) { return x * x; }", options: ["8", "16"], answerIndex: 1, explanation: "4 × 4 = 16" },
  { text: "return'den sonraki satır çalışır mı?", code: "", options: ["Evet", "Hayır"], answerIndex: 1, explanation: "" },
];

describe("PracticeQuiz", () => {
  it("cevabı hemen kontrol eder, sonunda sonucu gösterir ve tekrar çözdürür", () => {
    render(<PracticeQuiz questions={questions} />);
    expect(screen.getByText("1 / 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: /16/ }));
    expect(screen.getByRole("status").textContent).toContain("Doğru!");
    // Cevap verildikten sonra diğer seçenek değiştirilemez.
    expect(screen.getByRole("radio", { name: /8/ }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Sonraki soru" }));

    fireEvent.click(screen.getByRole("radio", { name: /Evet/ }));
    expect(screen.getByRole("status").textContent).toContain("Doğru cevap B");
    fireEvent.click(screen.getByRole("button", { name: "Sonucu gör" }));
    expect(screen.getByText("2 sorudan 1 doğru.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Tekrar çöz/ }));
    expect(screen.getByText("1 / 2")).toBeTruthy();
  });
});

describe("RichText", () => {
  it("kod bloklarını, satır içi kodu, kalın yazıyı ve listeleri gösterir; HTML çalıştırmaz", () => {
    const { container } = render(
      <RichText text={"**return** sonucu verir: `x * x`\n\n```js\nconsole.log(1);\n```\n\n- bir\n- iki\n\n<img src=x onerror=alert(1)>"} />,
    );
    expect(container.querySelector("strong").textContent).toBe("return");
    expect(container.querySelector("p code").textContent).toBe("x * x");
    expect(container.querySelector("pre code").textContent).toBe("console.log(1);");
    expect([...container.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["bir", "iki"]);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<img src=x onerror=alert(1)>");
  });
});

describe("Derleyici dilleri", () => {
  it("her dilin benzersiz anahtarı ve başlangıç kodu var", () => {
    const keys = LANGUAGES.map((l) => l.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const l of LANGUAGES) {
      expect(l.starter.trim().length).toBeGreaterThan(0);
      expect(["browser", "server"]).toContain(l.runtime);
    }
  });
});
