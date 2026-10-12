import { describe, expect, it } from "vitest";
import { embedUrl, formatDuration, paragraphs } from "./format";

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
