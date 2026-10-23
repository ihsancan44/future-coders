// Sayfaların arama sonuçlarında ve paylaşım önizlemelerinde görünen başlık ve açıklamaları.
// Hem sayfalar (usePageMeta) hem de derleme (vite.config.js: sabit sayfalara hazır HTML) burayı kullanır.

export const SITE_NAME = "Codevia";
export const DEFAULT_TITLE = "Codevia: Lise öğrencileri için yazılım kursları";
export const DEFAULT_DESCRIPTION =
  "Codevia ile üniversiteye geçmeden yazılım öğren. Seviye sınavı, seviyene göre video kurslar, tarayıcıda çalışan derleyici ve kurs sonu testleriyle adım adım ilerle.";
export const OG_IMAGE = "/og-image.png";

export const PAGES = {
  "/": { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, fullTitle: true },
  "/courses": {
    title: "Kurslar",
    description:
      "HTML, CSS, JavaScript, Python, React ve algoritma kursları. Seviye sınavına göre ALPHA ve BETA sınıflarına ayrılmış, videolu ve uygulamalı yazılım dersleri.",
  },
  "/roadmap": {
    title: "Yol Haritası",
    description: "Yazılıma nereden başlamalı, hangi alanı seçmeli? Codevia yol haritası yazılarıyla kariyer planını adım adım çıkar.",
  },
  "/compiler": {
    title: "Online Derleyici",
    description:
      "Python, JavaScript, HTML/CSS, SQL, Java, C, C++ ve 25 dilde kodunu tarayıcıda yaz ve çalıştır. Kurulum gerektirmeyen ücretsiz online derleyici.",
  },
  "/login": { title: "Giriş yap", description: "Codevia hesabına giriş yap, kurslarına kaldığın yerden devam et." },
  "/register": {
    title: "Kayıt ol",
    description: "Ücretsiz Codevia hesabı aç, seviye sınavına gir ve sana uygun yazılım kurslarıyla öğrenmeye başla.",
  },
};

/** "Kurslar" -> "Kurslar | Codevia". */
export function fullTitle(title) {
  if (!title) return DEFAULT_TITLE;
  return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
}

/** Açıklamayı arama sonucuna sığacak uzunlukta tek satıra indirir. */
export function clip(text, max = 160) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 80 ? cut.lastIndexOf(" ") : cut.length)}…`;
}
