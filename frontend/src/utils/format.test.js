import { describe, expect, it } from "vitest";
import { dayPart, embedUrl, formatDay, formatDuration, isVideoFile, paragraphs } from "./format";

describe("embedUrl", () => {
  it("YouTube bağlantılarını gömülebilir adrese çevirir", () => {
    const embed = "https://www.youtube-nocookie.com/embed/CgkZ7MvWUAA";
    expect(embedUrl("https://www.youtube.com/watch?v=CgkZ7MvWUAA")).toBe(embed);
    expect(embedUrl("https://youtu.be/CgkZ7MvWUAA")).toBe(embed);
    expect(embedUrl("https://www.youtube.com/embed/CgkZ7MvWUAA?si=x")).toBe(embed);
  });

  it("Vimeo bağlantısını oynatıcı adresine çevirir", () => {
    expect(embedUrl("https://vimeo.com/123456")).toBe("https://player.vimeo.com/video/123456");
  });

  it("boş veya bozuk adreste null döner", () => {
    expect(embedUrl("")).toBeNull();
    expect(embedUrl("bozuk adres")).toBeNull();
  });

  it("javascript: ve data: adreslerini gömmez", () => {
    expect(embedUrl("javascript:alert(document.domain)")).toBeNull();
    expect(embedUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
  });
});

describe("formatDuration", () => {
  it("dakikayı saat ve dakikaya böler", () => {
    expect(formatDuration(45)).toBe("45 dk");
    expect(formatDuration(60)).toBe("1 sa");
    expect(formatDuration(112)).toBe("1 sa 52 dk");
  });
});

describe("paragraphs", () => {
  it("boş satırlardan böler", () => {
    expect(paragraphs("a\n\nb\n\n\n c ")).toEqual(["a", "b", "c"]);
  });
});

describe("isVideoFile", () => {
  it("yüklenen ve doğrudan video dosyalarını tanır", () => {
    expect(isVideoFile("/uploads/123-abc.mp4")).toBe(true);
    expect(isVideoFile("https://cdn.site.com/ders.webm?x=1")).toBe(true);
    expect(isVideoFile("https://youtu.be/abc")).toBe(false);
    expect(isVideoFile(null)).toBe(false);
  });
});

describe("embedUrl (Vimeo ve YouTube canlı yayın)", () => {
  it("liste dışı Vimeo bağlantısını gizli anahtarla gömer", () => {
    expect(embedUrl("https://vimeo.com/123456/abcdef0123")).toBe("https://player.vimeo.com/video/123456?h=abcdef0123");
    expect(embedUrl("https://player.vimeo.com/video/123456")).toBe("https://player.vimeo.com/video/123456");
  });
  it("YouTube /live/ bağlantısını gömer", () => {
    expect(embedUrl("https://www.youtube.com/live/CgkZ7MvWUAA")).toBe("https://www.youtube-nocookie.com/embed/CgkZ7MvWUAA");
  });
});

describe("formatDay / dayPart", () => {
  it("doğum tarihini saat diliminden bağımsız gösterir", () => {
    expect(dayPart("2008-05-10T00:00:00.000Z")).toBe("2008-05-10");
    expect(formatDay("2008-05-10T00:00:00.000Z")).toBe("10 Mayıs 2008");
  });
});
