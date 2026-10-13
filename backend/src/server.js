import { config } from "./config.js";
import { createApp } from "./app.js";
import { sweepOrphanUploads } from "./lib/uploads.js";

const server = createApp().listen(config.port, () => {
  console.log(`Codevia API http://localhost:${config.port} adresinde çalışıyor`);
});
// Node'un varsayılan 5 dakikalık istek süresi, yavaş bağlantıda 1 GB'lık video yüklemesini yarıda kesiyordu.
server.requestTimeout = 2 * 60 * 60 * 1000;

// Yüklenip hiçbir kayda bağlanmayan dosyalar (ör. ders penceresi kaydedilmeden kapatıldı) disk dolmasın diye silinir.
const sweep = () => sweepOrphanUploads().catch((err) => console.error("[uploads] temizlik başarısız:", err.message));
setTimeout(sweep, 60_000).unref();
setInterval(sweep, 6 * 60 * 60 * 1000).unref();
