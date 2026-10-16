# Codevia

Üniversite öncesi öğrencilere yazılım öğreten eğitim platformu. Öğrenci kayıt olur, seviye sınavına girer, sonucuna göre **Alpha** (başlangıç) ya da **Beta** (ileri) sınıfına yerleşir, sınıfına açık kursları adım adım tamamlar ve her kursun sonunda final sınavına girer. Admin paneli kursları, yol haritası blogunu, sınavları ve öğrencileri yönetir.

| Klasör | İçerik |
| --- | --- |
| `frontend/` | React 18 + Vite + Ant Design arayüzü (öğrenci sitesi ve `/admin` paneli) |
| `backend/` | Node.js + Express REST API, PostgreSQL + Prisma |
| `docker-compose.yml` | Veritabanı, API ve arayüzü birlikte çalıştırır |

## Hızlı başlangıç (Docker)

```bash
cp .env.example .env          # JWT_SECRET ve ADMIN_PASSWORD değerlerini doldurun
docker compose up --build
```

- Site: http://localhost:8080
- Admin girişi: `ADMIN_EMAIL` / `ADMIN_PASSWORD` (varsayılan e-posta `admin@futurecoders.dev`)

İlk açılışta veritabanı şeması kurulur ve örnek kurslar, seviye sınavı, final sınavları ve blog yazıları eklenir.

## Canlıya alma

Docker ile internete açmadan önce:

1. **`JWT_SECRET`**: en az 32 karakterlik rastgele bir değer (`openssl rand -hex 32`). Örnek değerlerle sunucu açılmaz; bu değeri bilen herkes admin oturumu taklit edebilir.
2. **`ADMIN_PASSWORD`**: en az 10 karakter. Yalnızca admin hesabı ilk kez oluşturulurken kullanılır; sonradan değiştirmek için sitede admin olarak girip profil sayfasından şifreyi değiştirin.
3. **`CLIENT_URL`**: sitenin herkese açık adresi (örn. `https://codevia.com`). Şifre sıfırlama e-postasındaki bağlantı buradaki ilk adresi kullanır.
4. **HTTPS**: `docker compose` sadece 8080 portunda düz HTTP sunar. Önüne HTTPS sağlayan bir ters vekil (Caddy, Traefik, Cloudflare, sunucudaki nginx) koyun ve **`TRUST_PROXY=2`** yapın; yoksa giriş denemesi sınırı tüm ziyaretçileri tek kişi sayar.
5. **E-posta**: şifre sıfırlama için `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` ve alan adı size ait bir `MAIL_FROM` verin. SMTP yoksa canlıda e-posta gönderilmez (yerel kurulumda bağlantı sunucu loguna yazılır).
6. **Yedek**: veritabanı `db-data`, yüklenen videolar ve görseller `uploads` adlı Docker birimlerinde durur; ikisini de düzenli yedekleyin.

Kapsayıcılar sunucu yeniden başlayınca kendiliğinden açılır (`restart: unless-stopped`).

## Geliştirme ortamı

Gereksinimler: Node.js 20+, PostgreSQL 14+.

```bash
# 1) Backend
cd backend
cp .env.example .env          # DATABASE_URL ve JWT_SECRET değerlerini düzenleyin
npm install
npx prisma migrate dev        # tabloları oluşturur
npm run db:seed               # admin hesabı + örnek içerik
npm run dev                   # http://localhost:4000

# 2) Frontend (ayrı terminalde)
cd frontend
npm install
npm run dev                   # http://localhost:5173 (/api istekleri backend'e yönlenir)
```

### Güncelleme

Yeni sürümü çektikten sonra backend klasöründe veritabanını güncelleyin. Seed komutu mevcut verilere dokunmaz; sadece eski sürümün basit final sorularını yeni kurs sonu testleriyle değiştirir.

```bash
git pull
cd backend && npm install && npm run db:deploy && npm run db:seed
cd ../frontend && npm install
```

### Testler

```bash
cd backend && npm test        # API testleri (TEST_DATABASE_URL'deki veritabanını sıfırlar)
cd frontend && npm test       # arayüz testleri
npm run lint                  # her iki klasörde de çalışır
```

Uçtan uca senaryolar (misafir, yeni kayıt, Alpha, Beta ve admin akışları; 73 adım) çalışan bir sunucuya karşı denenir.
Boş ve seed edilmiş bir veritabanı kullanın; giriş hız sınırını son adım bilerek aştığı için tekrar çalıştırmadan önce sunucuyu yeniden başlatın:

```bash
cd backend && npm run db:seed && npm start   # ayrı terminalde
cd backend && npm run test:e2e
```

Uç durum senaryoları (yetki ve oturum güvenliği, aynı anda gelen istekler, öğrenci sınavdayken admin değişiklikleri, bozuk girdiler; 39 adım)
aynı şekilde çalışır. Şifre sıfırlama adımı için sunucu çıktısının yazıldığı dosyayı `SERVER_LOG` ile verin:

```bash
cd backend && SERVER_LOG=sunucu.log npm run test:e2e:edge
```

Bu iki betik test kullanıcıları ekler; gerçek verilerin olduğu veritabanında çalıştırmayın.

GitHub Actions her push ve pull request'te lint, test ve build adımlarını çalıştırır (`.github/workflows/ci.yml`).

## Uygulama kuralları

Bu kurallar zip'teki senaryo diyagramlarından çıkarıldı. Karar ağacına göre değişebilir; hepsi tek bir yerden ayarlanır.

| Kural | Varsayılan | Nereden değişir |
| --- | --- | --- |
| Seviye sınavı sonucu | Puan ≥ eşik → Beta, altı → Alpha | Admin › Sınavlar › "Beta eşiği" (varsayılan %60) |
| Seviye sınavı hakkı | Bir kez; admin öğrencinin sınavını sıfırlayabilir | Admin › Öğrenciler › "Sınavı sıfırla" |
| Kurs erişimi | Öğrenci sadece kendi sınıfının ve "Herkese açık" kursları açar; Beta öğrenci Alpha kurslarına, Alpha öğrenci Beta kurslarına giremez (içerik, video, ilerleme, yorum ve final testi sunucuda da kapalı). Kurs listesi varsayılan olarak öğrenciye açık kursları gösterir | Kurs düzenleme › "Hangi sınıfa açık?" |
| Oturumlar | Şifre değiştirilince ya da "şifremi unuttum" ile sıfırlanınca diğer cihazlardaki oturumlar kapanır; şifreyi değiştiren cihaz açık kalır | `backend/src/middleware/auth.js` |
| Yayın kuralları | Dersi olmayan kurs ve sorusu olmayan sınav yayına alınamaz; yayındaki kursun son dersi ve yayındaki sınavın son sorusu silinemez; aynı anda tek seviye sınavı yayında olur | Admin › Kurslar / Sınavlar |
| Sınıf değişikliği | Admin öğrencinin sınıfını değiştirirse erişim hemen değişir; sınıfı kaldırırsa öğrenci seviye sınavına yeniden girer | Admin › Üyeler |
| Kurs ilerlemesi | Tamamlanan adım / toplam adım, yüzde olarak kurs kartında, kurs sayfasında ve profilde | `backend/src/services/access.js` |
| Kurs sonu testi | Orta-zor seviye; kursun tüm adımları bitince açılır. Geçen öğrenci aynı teste tekrar girmez | Sınav düzenleme › "Geçme notu" (varsayılan %60) |
| Testte kalmak | O kurstaki tüm ilerleme silinir, öğrenci kursa baştan başlar | `backend/src/services/exams.js` |
| Alan seçimi | Bir kursun testini geçen öğrenci yazılım alanını seçer (frontend, backend, mobil, yapay zeka, veri bilimi, siber güvenlik, IoT, oyun) ve o alanın görsel yol haritasını görür; alanı sonra değiştirebilir | Alanlar ve aşamalar: `backend/src/data/careers.js` |
| Puanlama | Doğru / toplam soru; boş bırakılan yanlış sayılır | `backend/src/services/exams.js` |
| Yorumlar | Kursa erişimi olan öğrenci yazar, anında yayınlanır; sahibi veya admin siler | `backend/src/routes/courses.js` |

## Ekranlar

**Öğrenci:** Ana sayfa, kurs listesi (arama, kategori, sınıf filtresi), kurs sayfası (video, adım listesi, ilerleme, açıklama, yorumlar), seviye sınavı, kurs sonu testi, alan seçimi ve görsel kariyer yol haritası, yol haritası blogu ve yazı detayı, kayıt (isim, soyisim, e-posta, doğum tarihi, okul), giriş, şifremi unuttum / şifre sıfırlama, profil (sınıf bilgisi, sınav geçmişi, bilgi ve şifre değiştirme).

**Admin (`/admin`):** İstatistikler (kurs, blog, öğrenci sayıları, Alpha/Beta dağılımı, sınav puanları, okullar, son 30 gün kayıtlar, kurs bazında öğrenci ve final sonuçları), kurs ekle / düzenle / sil / yayınla-gizle (başlıklar listeden de düzenlenir) ve ders yönetimi (video, sıralama), videolar sayfası (tüm derslerin videoları: bilgisayardan video yükleme (MP4/WEBM/OGG, en fazla 1 GB) veya YouTube/Vimeo bağlantısı, izleme, değiştirme, silme, ders başlığını değiştirme; kaldırılan video dosyaları diskten de silinir), blog ekle / düzenle / sil / yayınla-gizle (görsel yükleme), seviye ve final sınavı yönetimi (soru ekle / düzenle / sil, doğru cevap, yayınla), üyeler (arama, sınıf/rol filtresi, sınıf ve rol değiştirme, üye detayı: bilgiler, kurs ilerlemesi, sınav sonuçları, seçtiği alan; isim/okul düzenleme, üye silme), yorum moderasyonu.

## API özeti

| Yöntem | Adres | Açıklama |
| --- | --- | --- |
| POST | `/api/auth/register` · `/login` | Kayıt ve giriş (JWT döner) |
| GET/PATCH | `/api/auth/me` | Oturumdaki kullanıcı, profil güncelleme |
| POST | `/api/auth/forgot-password` · `/reset-password` · `/change-password` | Şifre işlemleri |
| GET | `/api/courses` · `/api/courses/:id` | Kurs listesi ve detayı (erişim bilgisiyle) |
| POST/DELETE | `/api/courses/:id/lessons/:lessonId/complete` | Adımı tamamla / geri al |
| GET/POST/DELETE | `/api/courses/:id/comments` | Yorumlar |
| GET/POST | `/api/exams/placement` · `/placement/start` | Seviye sınavı durumu ve başlatma |
| POST | `/api/exams/courses/:id/final/start` | Final sınavını başlat |
| POST | `/api/exams/attempts/:id/submit` | Cevapları gönder, sonucu al |
| GET | `/api/blog` · `/api/blog/:id` | Yayındaki blog yazıları |
| GET/PUT | `/api/career` | Alan listesi ve seçim hakkı / alan seçimi (final testi geçilmiş olmalı) |
| GET | `/api/career/:key` | Bir alanın yol haritası |
| * | `/api/admin/...` | Kurs, ders, blog, sınav, soru, kullanıcı, yorum, istatistik ve görsel yükleme (sadece admin) |

## Ortam değişkenleri

Tam liste ve açıklamalar `backend/.env.example`, `frontend/.env.example` ve (Docker için) kök klasördeki `.env.example` dosyalarında. Şifre sıfırlama e-postası için `SMTP_*` değişkenlerini doldurun; boş bırakılırsa yerel kurulumda sıfırlama bağlantısı sunucu loguna yazılır. `TRUST_PROXY`, önündeki ters vekil sayısıdır (varsayılan 1).
