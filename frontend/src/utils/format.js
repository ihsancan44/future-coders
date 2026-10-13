export const LEVEL_LABEL = { ALPHA: "Alpha", BETA: "Beta", ALL: "Tüm seviyeler" };
export const LEVEL_DESC = {
  ALPHA: "Başlangıç sınıfı",
  BETA: "İleri sınıf",
  ALL: "Herkese açık",
};
export const LEVEL_COLOR = { ALPHA: "blue", BETA: "magenta", ALL: "green" };

export function formatDuration(minutes = 0) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} dk`;
  return m ? `${h} sa ${m} dk` : `${h} sa`;
}

const dateFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });
export const formatDate = (value) => (value ? dateFmt.format(new Date(value)) : "");
/** Sadece gün bilgisi olan tarihler (doğum tarihi) saat dilimine göre bir gün kaymasın diye UTC'de gösterilir. */
const dayFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
export const formatDay = (value) => (value ? dayFmt.format(new Date(value)) : "");
/** "2008-05-10T00:00:00.000Z" → "2008-05-10" (tarih seçicide yerel saatle bir gün geri gitmesin). */
export const dayPart = (value) => (value ? String(value).slice(0, 10) : null);

/** Sunucuya yüklenmiş ya da doğrudan video dosyasına giden adres mi? (<video> ile oynatılır) */
export function isVideoFile(url) {
  if (!url) return false;
  if (url.startsWith("/uploads/")) return true;
  return /\.(mp4|webm|ogv|ogg)(\?.*)?$/i.test(url);
}

/** Ders tablolarında video durumunu kısaca anlatır. */
export const videoLabel = (url) => (!url ? "Yok" : url.startsWith("/uploads/") ? "Yüklenen dosya" : "Bağlantı");

/** YouTube izleme/kısa bağlantısını gömülebilir adrese çevirir; diğer adresleri olduğu gibi bırakır. */
export function embedUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    // Sadece http(s) gömülür: javascript: veya data: adresi iframe içinde sitenin kendi yetkisiyle kod çalıştırabilir.
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    let id = null;
    if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
    else if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2];
      else if (u.pathname.startsWith("/shorts/") || u.pathname.startsWith("/live/")) id = u.pathname.split("/")[2];
      else id = u.searchParams.get("v");
    } else if (u.hostname.includes("vimeo.com")) {
      // vimeo.com/123456, vimeo.com/123456/abcdef (liste dışı paylaşım: ikinci parça gizli anahtar),
      // player.vimeo.com/video/123456
      const parts = u.pathname.split("/").filter(Boolean);
      const i = parts.findIndex((p) => /^\d+$/.test(p));
      if (i < 0) return null;
      const hash = parts[i + 1] && /^[0-9a-f]+$/i.test(parts[i + 1]) ? parts[i + 1] : u.searchParams.get("h");
      return `https://player.vimeo.com/video/${parts[i]}${hash ? `?h=${hash}` : ""}`;
    }
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : url;
  } catch {
    return null;
  }
}

/** Düz metni boş satırlardan paragraflara böler. */
export const paragraphs = (text = "") => text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
