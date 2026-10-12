// Bir kursun final testini geçen öğrencinin seçebileceği yazılım alanları ve her birinin yol haritası.
// Sıra önemlidir: liste ekranında bu sırayla gösterilir.

export const CAREERS = [
  {
    key: "frontend",
    title: "Frontend Geliştirme",
    tagline: "Kullanıcının gördüğü ve dokunduğu her şeyi sen yaparsın.",
    color: "#2563eb",
    stages: [
      {
        title: "Web'in temelleri",
        duration: "1-2 ay",
        topics: ["HTML5 ve anlamlı etiketler", "CSS, Flexbox ve Grid", "Responsive tasarım", "Erişilebilirlik temelleri"],
        project: "Kişisel tanıtım sayfanı mobil uyumlu olarak yap.",
      },
      {
        title: "JavaScript",
        duration: "2 ay",
        topics: ["Değişkenler, fonksiyonlar, diziler", "DOM ve olaylar", "fetch ile API'den veri çekme", "Modern JS (ES6+)"],
        project: "Hava durumu API'si kullanan bir uygulama yap.",
      },
      {
        title: "Araçlar ve Git",
        duration: "2-3 hafta",
        topics: ["Git ve GitHub", "npm ve paketler", "Vite ile proje kurulumu", "Tarayıcı geliştirici araçları"],
        project: "Projelerini GitHub'a yükle, README yaz.",
      },
      {
        title: "Bir framework: React",
        duration: "2-3 ay",
        topics: ["Bileşenler, props, state", "Hook'lar", "React Router", "Form ve API yönetimi"],
        project: "Bir yapılacaklar listesi ya da film arama uygulaması.",
      },
      {
        title: "Profesyonel seviye",
        duration: "Sürekli",
        topics: ["TypeScript", "Test yazma (Vitest, Testing Library)", "Performans ve SEO", "Yayına alma (Vercel, Netlify)"],
        project: "Portfolyo sitesi yapıp yayına al.",
      },
    ],
  },
  {
    key: "backend",
    title: "Backend Geliştirme",
    tagline: "Uygulamaların arkasındaki sunucuyu, veriyi ve mantığı kurarsın.",
    color: "#059669",
    stages: [
      {
        title: "Bir dil seç",
        duration: "2 ay",
        topics: ["Node.js (JavaScript) ya da Python", "Fonksiyonlar ve modüller", "Hata yönetimi", "Komut satırı kullanımı"],
        project: "Dosya okuyan ve özet çıkaran bir komut satırı aracı.",
      },
      {
        title: "Web ve HTTP",
        duration: "1 ay",
        topics: ["HTTP yöntemleri ve durum kodları", "REST API tasarımı", "JSON", "Postman ile test"],
        project: "Express ya da FastAPI ile not tutma API'si.",
      },
      {
        title: "Veritabanları",
        duration: "1-2 ay",
        topics: ["SQL temelleri", "PostgreSQL", "İlişkiler ve indeksler", "ORM (Prisma, SQLAlchemy)"],
        project: "Not API'sini veritabanına bağla.",
      },
      {
        title: "Güvenlik ve kimlik",
        duration: "1 ay",
        topics: ["Şifre hash'leme", "JWT ve oturum", "Yetkilendirme", "Girdi doğrulama"],
        project: "API'ne kayıt ve giriş ekle.",
      },
      {
        title: "Yayına alma",
        duration: "Sürekli",
        topics: ["Docker", "Bulut sunucular", "Log ve izleme", "Otomatik test ve CI"],
        project: "API'ni Docker ile paketleyip bir sunucuda yayınla.",
      },
    ],
  },
  {
    key: "mobile",
    title: "Mobil Uygulama",
    tagline: "Telefonlarda çalışan uygulamalar geliştirirsin.",
    color: "#7c3aed",
    stages: [
      {
        title: "Programlama temeli",
        duration: "2 ay",
        topics: ["JavaScript ya da Dart", "Nesne yönelimli programlama", "Asenkron işlemler", "Git"],
        project: "Konsolda çalışan bir hesap makinesi.",
      },
      {
        title: "Bir platform seç",
        duration: "2-3 ay",
        topics: ["React Native ya da Flutter", "Ekranlar ve gezinme", "Liste ve formlar", "Durum yönetimi"],
        project: "Alışveriş listesi uygulaması.",
      },
      {
        title: "Cihaz özellikleri",
        duration: "1 ay",
        topics: ["Kamera ve konum", "Bildirimler", "Yerel depolama", "İzinler"],
        project: "Fotoğraflı günlük uygulaması.",
      },
      {
        title: "Sunucuya bağlanma",
        duration: "1 ay",
        topics: ["REST API kullanma", "Firebase", "Giriş sistemi", "Çevrimdışı çalışma"],
        project: "Arkadaşlarınla paylaşılan bir not uygulaması.",
      },
      {
        title: "Mağazaya çıkış",
        duration: "Sürekli",
        topics: ["Uygulama ikonu ve tasarım", "Test", "Google Play ve App Store", "Kullanıcı geri bildirimi"],
        project: "Bir uygulamanı mağazada yayınla.",
      },
    ],
  },
  {
    key: "ai",
    title: "Yapay Zeka",
    tagline: "Veriden öğrenen ve karar veren sistemler kurarsın.",
    color: "#db2777",
    stages: [
      {
        title: "Python ve matematik",
        duration: "2-3 ay",
        topics: ["Python temelleri", "Doğrusal cebir (vektör, matris)", "Olasılık ve istatistik", "Türev mantığı"],
        project: "Python ile basit istatistik hesaplayan bir program.",
      },
      {
        title: "Veriyle çalışma",
        duration: "1-2 ay",
        topics: ["NumPy", "Pandas", "Veri temizleme", "Matplotlib ile grafik"],
        project: "Açık bir veri setini analiz et.",
      },
      {
        title: "Makine öğrenmesi",
        duration: "2-3 ay",
        topics: ["Regresyon ve sınıflandırma", "scikit-learn", "Eğitim ve test verisi", "Model değerlendirme"],
        project: "Ev fiyatı tahmin modeli.",
      },
      {
        title: "Derin öğrenme",
        duration: "3 ay",
        topics: ["Sinir ağları", "PyTorch ya da TensorFlow", "Görüntü sınıflandırma", "Dil modelleri ve transformer"],
        project: "El yazısı rakam tanıyan model.",
      },
      {
        title: "Uygulamalı yapay zeka",
        duration: "Sürekli",
        topics: ["Hazır modelleri API ile kullanma", "Etik ve yanlılık", "Modeli yayına alma", "Kaggle yarışmaları"],
        project: "Bir yapay zeka modelini web uygulamasına bağla.",
      },
    ],
  },
  {
    key: "data",
    title: "Veri Bilimi",
    tagline: "Veriden anlam çıkarır, kararlara yön verirsin.",
    color: "#0891b2",
    stages: [
      {
        title: "Temeller",
        duration: "2 ay",
        topics: ["Python", "Excel ve tablolar", "Temel istatistik", "Soru sorma ve hipotez"],
        project: "Sınıfının not ortalamalarını analiz et.",
      },
      {
        title: "SQL",
        duration: "1 ay",
        topics: ["SELECT, WHERE, JOIN", "Gruplama ve toplama", "Alt sorgular", "Veritabanı tasarımı"],
        project: "Örnek bir mağaza veritabanında satış raporu çıkar.",
      },
      {
        title: "Analiz araçları",
        duration: "2 ay",
        topics: ["Pandas", "Veri temizleme", "Jupyter Notebook", "Keşifsel veri analizi"],
        project: "Açık veriyle bir analiz defteri hazırla.",
      },
      {
        title: "Görselleştirme",
        duration: "1 ay",
        topics: ["Matplotlib ve Seaborn", "Doğru grafik seçimi", "Gösterge panelleri", "Hikaye anlatımı"],
        project: "Bulgularını anlatan bir gösterge paneli.",
      },
      {
        title: "Tahmin ve modelleme",
        duration: "Sürekli",
        topics: ["Makine öğrenmesine giriş", "A/B testleri", "Zaman serileri", "Raporlama"],
        project: "Gelecek ayın satışlarını tahmin et.",
      },
    ],
  },
  {
    key: "cyber",
    title: "Siber Güvenlik",
    tagline: "Sistemleri saldırılara karşı korursun.",
    color: "#dc2626",
    stages: [
      {
        title: "Bilgisayar ve ağ temelleri",
        duration: "2 ay",
        topics: ["İşletim sistemleri", "TCP/IP ve DNS", "Portlar ve protokoller", "Linux komut satırı"],
        project: "Evdeki ağını haritalandır (kendi cihazlarınla).",
      },
      {
        title: "Programlama",
        duration: "1-2 ay",
        topics: ["Python ile otomasyon", "Bash betikleri", "Web nasıl çalışır", "Temel SQL"],
        project: "Log dosyasından şüpheli girişleri bulan betik.",
      },
      {
        title: "Güvenlik temelleri",
        duration: "2 ay",
        topics: ["Şifreleme ve hash", "Kimlik doğrulama", "OWASP Top 10", "Sosyal mühendislik"],
        project: "Güvenli şifre üreten ve kontrol eden araç.",
      },
      {
        title: "Etik hacking",
        duration: "3 ay",
        topics: ["Sızma testi aşamaları", "Nmap, Wireshark, Burp Suite", "CTF yarışmaları", "TryHackMe ve Hack The Box"],
        project: "Yasal bir CTF yarışmasına katıl.",
      },
      {
        title: "Uzmanlaşma",
        duration: "Sürekli",
        topics: ["Savunma (SOC, olay müdahalesi)", "Web uygulama güvenliği", "Bulut güvenliği", "Sertifikalar (Security+)"],
        project: "Bir uzmanlık alanı seç ve laboratuvar ortamı kur.",
      },
    ],
  },
  {
    key: "iot",
    title: "Nesnelerin İnterneti (IoT)",
    tagline: "Fiziksel cihazları yazılımla internete bağlarsın.",
    color: "#ea580c",
    stages: [
      {
        title: "Elektronik temelleri",
        duration: "1 ay",
        topics: ["Akım, gerilim, direnç", "Breadboard ve devre kurma", "LED, buton, sensör", "Güvenli çalışma"],
        project: "Butona basınca yanan LED devresi.",
      },
      {
        title: "Mikrodenetleyiciler",
        duration: "2 ay",
        topics: ["Arduino", "C/C++ temelleri", "Dijital ve analog girişler", "Seri port"],
        project: "Sıcaklığa göre renk değiştiren lamba.",
      },
      {
        title: "Bağlantı",
        duration: "1-2 ay",
        topics: ["ESP32 ve Wi-Fi", "MQTT protokolü", "HTTP istekleri", "Bluetooth"],
        project: "Sensör verisini telefona gönderen cihaz.",
      },
      {
        title: "Veri ve bulut",
        duration: "1-2 ay",
        topics: ["Raspberry Pi ve Python", "Bulut IoT platformları", "Veri saklama", "Gösterge paneli"],
        project: "Odanın sıcaklık ve nemini grafikte gösteren sistem.",
      },
      {
        title: "Akıllı sistemler",
        duration: "Sürekli",
        topics: ["Otomasyon kuralları", "IoT güvenliği", "Düşük güç tasarımı", "Uç yapay zeka"],
        project: "Akıllı sulama sistemi.",
      },
    ],
  },
  {
    key: "game",
    title: "Oyun Geliştirme",
    tagline: "Oynanabilir dünyalar ve mekanikler tasarlarsın.",
    color: "#9333ea",
    stages: [
      {
        title: "Programlama temeli",
        duration: "2 ay",
        topics: ["C# ya da Python", "Değişken, döngü, fonksiyon", "Nesne yönelimli programlama", "Matematik: vektörler"],
        project: "Konsolda tahmin oyunu.",
      },
      {
        title: "Bir oyun motoru",
        duration: "2-3 ay",
        topics: ["Unity ya da Godot", "Sahne ve nesneler", "Fizik ve çarpışma", "Girdi yönetimi"],
        project: "Basit bir 2D platform oyunu.",
      },
      {
        title: "Oyun tasarımı",
        duration: "1 ay",
        topics: ["Oyun döngüsü", "Seviye tasarımı", "Zorluk dengesi", "Oyuncu geri bildirimi"],
        project: "Oyununa 3 farklı seviye ekle.",
      },
      {
        title: "Görsel ve ses",
        duration: "1-2 ay",
        topics: ["Sprite ve animasyon", "Arayüz (UI)", "Ses efektleri ve müzik", "Parçacık efektleri"],
        project: "Oyununa menü, skor ve ses ekle.",
      },
      {
        title: "Yayınlama",
        duration: "Sürekli",
        topics: ["Test ve hata ayıklama", "Performans", "itch.io ve Steam", "Game jam'ler"],
        project: "Bir game jam'e katıl ve oyununu yayınla.",
      },
    ],
  },
];

export const CAREER_KEYS = CAREERS.map((c) => c.key);

export function findCareer(key) {
  return CAREERS.find((c) => c.key === key) || null;
}
