import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { usePageMeta } from "./usePageMeta";
import { DEFAULT_TITLE, clip } from "../seo/pages";

function Page(props) {
  usePageMeta(props);
  return null;
}
const meta = (sel) => document.head.querySelector(sel)?.getAttribute("content");

describe("usePageMeta", () => {
  it("başlık, açıklama, paylaşım bilgisi ve asıl adresi ayarlar", () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/courses/4?lesson=9"]}>
        <Page title="Python kursu" description="Python ile programlamaya giriş." jsonLd={{ "@type": "Course", name: "</script>" }} />
      </MemoryRouter>,
    );
    expect(document.title).toBe("Python kursu | Codevia");
    expect(meta('meta[name="description"]')).toBe("Python ile programlamaya giriş.");
    expect(meta('meta[property="og:title"]')).toBe("Python kursu | Codevia");
    expect(meta('meta[property="og:image"]')).toBe(`${window.location.origin}/og-image.png`);
    expect(meta('meta[name="robots"]')).toBe("index, follow");
    // Ders seçimi (?lesson=) aynı sayfanın kopyası sayılmaz.
    expect(document.head.querySelector('link[rel="canonical"]').href).toBe(`${window.location.origin}/courses/4`);
    expect(document.getElementById("page-jsonld").textContent).not.toContain("</script>");

    unmount();
    expect(document.title).toBe(DEFAULT_TITLE);
    expect(document.getElementById("page-jsonld")).toBeNull();
  });

  it("kişisel sayfaları arama sonuçlarından çıkarır", () => {
    render(<MemoryRouter><Page title="Profilim" noindex /></MemoryRouter>);
    expect(meta('meta[name="robots"]')).toBe("noindex, nofollow");
  });

  it("uzun açıklamayı kelime ortasında kesmeden kısaltır", () => {
    const text = "kelime ".repeat(60);
    const short = clip(text);
    expect(short.length).toBeLessThanOrEqual(160);
    expect(short.endsWith("kelime…")).toBe(true);
  });
});
