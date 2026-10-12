# FutureCoders

Üniversite öncesi öğrencilere yazılım öğreten eğitim platformu. Öğrenci kayıt olur, seviye sınavına girer, sonucuna göre **Alpha** (başlangıç) ya da **Beta** (ileri) sınıfına yerleşir, sınıfına açık kursları adım adım tamamlar ve her kursun sonunda final sınavına girer. Admin paneli kursları, yol haritası blogunu, sınavları ve öğrencileri yönetir.

| Klasör | İçerik |
| --- | --- |
| `frontend/` | React 18 + Vite + Ant Design arayüzü (öğrenci sitesi ve `/admin` paneli) |
| `backend/` | Node.js + Express REST API, PostgreSQL + Prisma |
| `docker-compose.yml` | Veritabanı, API ve arayüzü birlikte çalıştırır |

## Hızlı başlangıç (Docker)

```bash
docker compose up --build
```

- Site: http://localhost:8080
- Admin girişi: `admin@futurecoders.dev` / `Admin12345` (canlıya almadan önce `ADMIN_PASSWORD` ve `JWT_SECRET` değiştirin)

İlk açılışta veritabanı şeması kurulur ve örnek kurslar, seviye sınavı, final sınavları ve blog yazıları eklenir.

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

### Testler

```bash
cd backend && npm test        # API testleri (TEST_DATABASE_URL'deki veritabanını sıfırlar)
cd frontend && npm test       # arayüz testleri
npm run lint                  # her iki klasörde de çalışır
```

GitHub Actions her push ve pull request'te lint, test ve build adımlarını çalıştırır (`.github/workflows/ci.yml`).

## Uygulama kuralları

Bu kurallar zip'teki senaryo diyagramlarından çıkarıldı. Karar ağacına göre değişebilir; hepsi tek bir yerden ayarlanır.

| Kural | Varsayılan | Nereden değişir |
| --- | --- | --- |
| Seviye sınavı sonucu | Puan ≥ eşik → Beta, altı → Alpha | Admin › Sınavlar › "Beta eşiği" (varsayılan %60) |
| Seviye sınavı hakkı | Bir kez; admin öğrencinin sınavını sıfırlayabilir | Admin › Öğrenciler › "Sınavı sıfırla" |
| Kurs erişimi | Öğrenci kendi sınıfının ve "Herkese açık" kursları açar | Kurs düzenleme › "Hangi sınıfa açık?" |
| Final sınavı | Kursun tüm adımları bitince açılır, tekrar denenebilir | Sınav düzenleme › "Geçme notu" |
| Puanlama | Doğru / toplam soru; boş bırakılan yanlış sayılır | `backend/src/services/exams.js` |
| Yorumlar | Kursa erişimi olan öğrenci yazar, anında yayınlanır; sahibi veya admin siler | `backend/src/routes/courses.js` |

## Ekranlar

**Öğrenci:** Ana sayfa, kurs listesi (arama, kategori, sınıf filtresi), kurs sayfası (video, adım listesi, ilerleme, açıklama, yorumlar), seviye sınavı, final sınavı, yol haritası blogu ve yazı detayı, kayıt (isim, soyisim, e-posta, doğum tarihi, okul), giriş, şifremi unuttum / şifre sıfırlama, profil (sınıf bilgisi, sınav geçmişi, bilgi ve şifre değiştirme).

**Admin (`/admin`):** İstatistikler (kurs, blog, öğrenci sayıları, Alpha/Beta dağılımı, sınav puanları, okullar, son 30 gün kayıtlar, kurs bazında öğrenci ve final sonuçları), kurs ekle / düzenle / sil / yayınla-gizle ve ders yönetimi (video, sıralama), blog ekle / düzenle / sil / yayınla-gizle (görsel yükleme), seviye ve final sınavı yönetimi (soru ekle / düzenle / sil, doğru cevap, yayınla), öğrenci listesi (sınıf ve rol değiştirme), yorum moderasyonu.

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
| * | `/api/admin/...` | Kurs, ders, blog, sınav, soru, kullanıcı, yorum, istatistik ve görsel yükleme (sadece admin) |

## Ortam değişkenleri

Tam liste ve açıklamalar `backend/.env.example` ve `frontend/.env.example` dosyalarında. Şifre sıfırlama e-postası için `SMTP_*` değişkenlerini doldurun; boş bırakılırsa sıfırlama bağlantısı sunucu loguna yazılır.
