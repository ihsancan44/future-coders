import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, OG_IMAGE, SITE_NAME, clip, fullTitle } from "../seo/pages";

const absolute = (url) => {
  if (!url) return `${window.location.origin}${OG_IMAGE}`;
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return `${window.location.origin}${OG_IMAGE}`;
  }
};

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (content == null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

function setJsonLd(data) {
  let el = document.getElementById("page-jsonld");
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = "page-jsonld";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
}

function apply({ title, description, image, type, noindex, jsonLd }, pathname) {
  const t = fullTitle(title);
  const d = clip(description || DEFAULT_DESCRIPTION);
  // Ders seçimi gibi sorgu parametreleri aynı sayfanın kopyası sayılmasın: asıl adres sorgusuz yoldur.
  const url = `${window.location.origin}${pathname}`;
  document.title = t;
  setMeta("name", "description", d);
  setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
  setMeta("property", "og:title", t);
  setMeta("property", "og:description", d);
  setMeta("property", "og:type", type || "website");
  setMeta("property", "og:url", url);
  setMeta("property", "og:image", absolute(image));
  setMeta("property", "og:site_name", SITE_NAME);
  setMeta("name", "twitter:title", t);
  setMeta("name", "twitter:description", d);
  setMeta("name", "twitter:image", absolute(image));
  setCanonical(url);
  setJsonLd(jsonLd);
}

/**
 * Sayfanın başlığını, açıklamasını, paylaşım önizlemesini (Open Graph) ve yapılandırılmış verisini ayarlar.
 * Sayfa kapanınca site geneli değerlere döner, böylece kendi bilgisi olmayan sayfalar eskisini taşımaz.
 */
export function usePageMeta(meta) {
  const { pathname } = useLocation();
  const key = JSON.stringify(meta);
  useEffect(() => {
    apply(JSON.parse(key), pathname);
    return () => apply({ title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION }, pathname);
  }, [key, pathname]);
}
