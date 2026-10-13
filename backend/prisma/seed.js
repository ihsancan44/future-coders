// Örnek veri: admin hesabı, kurslar, dersler, seviye sınavı, final sınavları ve blog yazıları.
// Tekrar çalıştırılabilir: mevcut admin korunur, örnek içerik sadece veritabanı boşsa eklenir;
// dolu veritabanında eski final soruları yeni kurs sonu testleriyle değiştirilir.
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

// Orijinal projedeki tanıtım videosu. Gerçek ders videolarını admin panelinden değiştirin.
const VIDEO = "https://www.youtube.com/watch?v=CgkZ7MvWUAA";

const courses = [
  {
    title: "Web'e Giriş: HTML ve CSS",
    summary: "İlk web sayfanı sıfırdan yaz, CSS ile düzenle ve yayınla.",
    category: "Frontend",
    level: "ALL",
    description:
      "Bu kurs hiç kod yazmamış öğrenciler için hazırlandı. Bir web sayfasının iskeletini HTML ile kurmayı, CSS ile renk, yazı tipi ve yerleşim vermeyi öğreneceksin. Kursun sonunda kendi kişisel tanıtım sayfanı hazırlamış olacaksın.",
    lessons: [
      ["Web nasıl çalışır?", "Tarayıcı bir adrese gittiğinde sunucudan HTML, CSS ve JavaScript dosyalarını ister. HTML içeriği, CSS görünümü, JavaScript ise davranışı belirler.", 12],
      ["HTML etiketleri", "Başlıklar (h1-h6), paragraflar (p), bağlantılar (a), görseller (img) ve listeler (ul, ol, li) bir sayfanın temel yapı taşlarıdır.", 18],
      ["CSS ile stil verme", "Seçiciler bir veya daha fazla öğeyi hedefler. color, font-size, margin ve padding en sık kullanacağın özelliklerdir.", 20],
      ["Flexbox ile yerleşim", "display: flex ile öğeleri yatay ya da dikey hizalayabilir, gap ile aralarına boşluk koyabilirsin.", 22],
    ],
  },
  {
    title: "JavaScript Temelleri",
    summary: "Değişkenler, koşullar, döngüler ve fonksiyonlarla programlamaya başla.",
    category: "Programlama",
    level: "ALPHA",
    description:
      "Programlamanın temel kavramlarını JavaScript ile öğren. Her derste küçük alıştırmalar yaparak değişken, koşul, döngü ve fonksiyon mantığını oturtacaksın.",
    lessons: [
      ["Değişkenler ve veri tipleri", "let ve const ile değişken tanımlanır. Sayı, metin (string), mantıksal (boolean), dizi ve nesne en sık kullanılan tiplerdir.", 15],
      ["Koşullar", "if, else if ve else ile programın farklı durumlarda farklı davranmasını sağlarsın. Karşılaştırmada === kullanmayı alışkanlık edin.", 15],
      ["Döngüler", "for ve while döngüleri bir işi tekrar tekrar yapmanı sağlar. Dizilerde for...of en okunaklı yoldur.", 18],
      ["Fonksiyonlar", "Fonksiyonlar tekrar kullanılabilir kod bloklarıdır. Parametre alır, return ile sonuç döndürür.", 20],
    ],
  },
  {
    title: "React İle Başlangıç",
    summary: "Bileşen mantığını öğren, ilk React uygulamanı oluştur.",
    category: "Frontend",
    level: "ALPHA",
    description:
      "React, kullanıcı arayüzlerini bileşenlere bölerek geliştirmeyi sağlayan bir JavaScript kütüphanesidir. Bu kursta JSX, bileşenler, props ve state kavramlarını küçük bir proje üzerinde öğreneceksin.",
    lessons: [
      ["React ne demek?", "React, arayüzü bileşenlere bölerek kullanım kolaylığı ve hızlı çalışma sağlayan bir JavaScript kütüphanesidir.", 10],
      ["Bileşen yapısı", "Bileşenler React'in asıl çalışma mantığıdır. Her parçayı ayrı yazar, sonra istediğin yerde tekrar kullanırsın.", 16],
      ["Props ve state", "Props bileşene dışarıdan gelen veridir, state ise bileşenin kendi içinde değişen verisidir. useState ile state tanımlanır.", 22],
    ],
  },
  {
    title: "İleri Seviye React",
    summary: "Hook'lar, yönlendirme ve API'den veri çekme.",
    category: "Frontend",
    level: "BETA",
    description:
      "React temellerini bilen öğrenciler için. useEffect, özel hook yazma, React Router ile sayfa yönetimi ve bir REST API'den veri çekme konularını gerçek bir uygulama üzerinde işliyoruz.",
    lessons: [
      ["useEffect ve yan etkiler", "useEffect, bileşen ekrana geldikten sonra çalışacak işleri (veri çekme, abonelik) tanımlamak için kullanılır. Bağımlılık dizisi ne zaman yeniden çalışacağını belirler.", 20],
      ["Özel hook yazmak", "Tekrarlanan state ve effect mantığını use ile başlayan kendi fonksiyonuna taşıyarak bileşenleri sadeleştirebilirsin.", 18],
      ["React Router", "createBrowserRouter ile sayfaları tanımlar, Link ile aralarında geçiş yapar, useParams ile adresteki değerleri okursun.", 20],
      ["API'den veri çekmek", "fetch veya axios ile istek atar, yükleniyor ve hata durumlarını state ile yönetirsin.", 24],
    ],
  },
  {
    title: "Python ile Algoritma",
    summary: "Problem çözme becerini Python ile geliştir.",
    category: "Programlama",
    level: "BETA",
    description:
      "Sıralama, arama ve özyineleme gibi temel algoritmaları Python ile yazarak öğren. Üniversite ve yarışmalara hazırlık için sağlam bir temel.",
    lessons: [
      ["Karmaşıklık nedir?", "Bir algoritmanın girdi büyüdükçe ne kadar yavaşladığını Big-O gösterimiyle ifade ederiz. O(n) doğrusal, O(n²) karesel büyür.", 15],
      ["Arama algoritmaları", "Doğrusal arama her öğeye bakar; ikili arama sıralı dizide her adımda aralığı yarıya indirir.", 20],
      ["Sıralama algoritmaları", "Kabarcık sıralaması basit ama yavaştır; birleştirme sıralaması böl ve fethet yaklaşımıyla O(n log n) çalışır.", 25],
    ],
  },
];

const placementQuestions = [
  ["HTML'de en büyük başlık etiketi hangisidir?", ["<h6>", "<h1>", "<head>", "<title>"], 1],
  ["CSS'te yazı rengini hangi özellik belirler?", ["font-color", "text-color", "color", "background"], 2],
  ["JavaScript'te değeri değişmeyecek bir değişken nasıl tanımlanır?", ["var", "let", "const", "static"], 2],
  ["`[1, 2, 3].length` ifadesinin sonucu nedir?", ["2", "3", "4", "undefined"], 1],
  ["`5 === \"5\"` ifadesinin sonucu nedir?", ["true", "false", "Hata verir", "undefined"], 1],
  ["Bir fonksiyondan değer döndürmek için hangi anahtar kelime kullanılır?", ["break", "yield", "return", "continue"], 2],
  ["React'te bileşenin kendi içinde değişen verisi için hangi hook kullanılır?", ["useState", "useRef", "useMemo", "useContext"], 0],
  ["Sıralı bir dizide ikili aramanın zaman karmaşıklığı nedir?", ["O(1)", "O(n)", "O(log n)", "O(n²)"], 2],
  ["HTTP'de sunucudan veri okumak için genellikle hangi yöntem kullanılır?", ["GET", "POST", "PUT", "DELETE"], 0],
  ["Git'te değişiklikleri kalıcı olarak kaydetmek için hangi komut kullanılır?", ["git add", "git commit", "git status", "git clone"], 1],
];

// Kurs sonu testleri: orta-zor seviye, ezber yerine kavramı ve kod okumayı ölçer.
// [soru, şıklar, doğru şıkkın sırası]
const finalBank = {
  "Web'e Giriş: HTML ve CSS": [
    ["Sitenin ana menü bağlantılarını saran en uygun (anlamlı) HTML etiketi hangisidir?", ['<div class="menu">', "<nav>", "<section>", "<aside>"], 1],
    ["`.kart p { color: red; }` kuralı hangi öğeleri kırmızı yapar?", ["Sadece class'ı kart olan p öğelerini", "kart class'lı bir öğenin içindeki tüm p öğelerini", "Sayfadaki ilk p öğesini", "kart class'lı öğeyi ve tüm p öğelerini"], 1],
    ["`box-sizing: content-box` iken `width: 200px; padding: 10px; border: 2px solid` olan kutunun toplam genişliği kaç piksel olur?", ["200px", "212px", "220px", "224px"], 3],
    ["Aynı başlığa `#baslik`, `.baslik` ve `h1` seçicileriyle farklı renkler verilirse hangisi uygulanır?", ["h1", ".baslik", "#baslik", "En son yazılan kural"], 2],
    ["`display: flex` olan bir satırda öğeleri yatayda ortalamak için hangisi kullanılır?", ["align-items: center", "justify-content: center", "text-align: center", "vertical-align: middle"], 1],
    ["`display: none` ile `visibility: hidden` arasındaki fark nedir?", ["İkisi de aynıdır", "display: none öğeyi yerleşimden çıkarır, visibility: hidden yerini korur", "visibility: hidden öğeyi siler", "display: none sadece metinleri gizler"], 1],
    ["Kök (html) yazı boyutuna göre hesaplanan CSS birimi hangisidir?", ["em", "px", "rem", "%"], 2],
    ["`<img>` etiketindeki `alt` özelliğinin asıl amacı nedir?", ["Görseli büyütmek", "Görsel yüklenemezse ve ekran okuyucular için açıklama sağlamak", "Görsele bağlantı eklemek", "Görseli önbelleğe almak"], 1],
  ],
  "JavaScript Temelleri": [
    ["`let x = 5; x += \"2\";` satırlarından sonra x'in değeri nedir?", ["7", "\"52\"", "NaN", "Hata verir"], 1],
    ["`const dizi = [1, 2, 3]; dizi.push(4);` kodu çalışınca ne olur?", ["TypeError: const değiştirilemez", "dizi [1, 2, 3, 4] olur", "dizi [4] olur", "Hiçbir şey değişmez"], 1],
    ["`for (let i = 0; i < 3; i++) {}` döngüsünden sonra `console.log(i)` ne yazdırır?", ["3", "2", "undefined", "ReferenceError verir"], 3],
    ["`[1, 2, 3, 4].filter(n => n % 2 === 0)` ifadesinin sonucu nedir?", ["[1, 3]", "[2, 4]", "[false, true, false, true]", "2"], 1],
    ["`typeof null` ifadesinin sonucu nedir?", ["\"null\"", "\"undefined\"", "\"object\"", "\"boolean\""], 2],
    ["`0 || \"varsayılan\"` ifadesinin sonucu nedir?", ["0", "\"varsayılan\"", "true", "false"], 1],
    ["`function f(a, b = 2) { return a * b; }` tanımında `f(3)` çağrısı ne döndürür?", ["3", "5", "6", "NaN"], 2],
    ["`\"5\" * \"2\"` ifadesinin sonucu nedir?", ["\"52\"", "10", "NaN", "\"10\""], 1],
  ],
  "React İle Başlangıç": [
    ["Listeleri `map` ile çizerken her öğeye `key` vermek neden gerekir?", ["Stil vermek için", "React'in hangi öğenin değiştiğini ayırt edebilmesi için", "Öğeleri sıralamak için", "Zorunlu değildir, sadece uyarıyı kapatır"], 1],
    ["Bir tıklamada `setSayac(sayac + 1); setSayac(sayac + 1);` çalışıyor ve sayac 0 ise yeni değer ne olur?", ["0", "1", "2", "Hata verir"], 1],
    ["Bir alt bileşen kendisine gelen props'u değiştirebilir mi?", ["Evet, doğrudan değiştirebilir", "Hayır, props salt okunurdur; değişiklik üst bileşenin state'i ile yapılır", "Sadece sayı ise değiştirebilir", "Sadece useEffect içinde değiştirebilir"], 1],
    ["JSX'te HTML'deki `class` özelliği nasıl yazılır?", ["class", "className", "cssClass", "styleName"], 1],
    ["React bileşen adları neden büyük harfle başlamalıdır?", ["Sadece gelenek, zorunlu değil", "Küçük harfli adlar HTML etiketi sanılır", "Büyük harf daha hızlı çalışır", "Dosya adıyla aynı olması için"], 1],
    ["Aşağıdakilerden hangisi bileşenin yeniden çizilmesine (render) yol açar?", ["Normal bir değişkeni değiştirmek", "console.log çağırmak", "State'i set fonksiyonuyla değiştirmek", "Bir yorumu silmek"], 2],
    ["`{girisYapti && <Panel />}` ifadesinde girisYapti false ise ekranda ne görünür?", ["\"false\" yazısı", "Hiçbir şey", "Boş bir Panel", "Hata mesajı"], 1],
  ],
  "İleri Seviye React": [
    ["`useEffect(() => { ... }, [])` ne zaman çalışır?", ["Her render'dan sonra", "Sadece ilk render'dan sonra bir kez", "Hiç çalışmaz", "Bileşen silinirken"], 1],
    ["useEffect'ten döndürülen temizleme (cleanup) fonksiyonu ne zaman çalışır?", ["Sadece ilk render'da", "Effect yeniden çalışmadan önce ve bileşen kaldırılırken", "Her tıklamada", "Hiçbir zaman"], 1],
    ["Bağımlılık dizisi verilmemiş ve içinde veri çekip state set eden bir effect'te ne olur?", ["Veri bir kez çekilir", "Sonsuz render ve istek döngüsü oluşur", "Effect hiç çalışmaz", "React otomatik olarak durdurur"], 1],
    ["Özel (custom) hook adları için kural nedir?", ["Büyük harfle başlamalı", "\"use\" ile başlamalı", "\"hook\" ile bitmeli", "Kural yoktur"], 1],
    ["`/courses/:id` rotasında adres `/courses/42` iken `useParams()` ne döndürür?", ["42", "{ id: 42 }", "{ id: \"42\" }", "[\"courses\", \"42\"]"], 2],
    ["React Router'da `<a href>` yerine `<Link>` kullanmanın temel faydası nedir?", ["Daha renkli görünür", "Sayfayı tamamen yeniden yüklemeden geçiş yapar", "SEO'yu kapatır", "Sadece dış sitelere gider"], 1],
    ["`useMemo` ne için kullanılır?", ["State tanımlamak için", "Pahalı bir hesaplamanın sonucunu bağımlılıklar değişene kadar saklamak için", "DOM öğesine erişmek için", "API isteği atmak için"], 1],
  ],
  "Python ile Algoritma": [
    ["1024 elemanlı sıralı bir listede ikili arama en fazla yaklaşık kaç adımda sonuca ulaşır?", ["10", "32", "512", "1024"], 0],
    ["Birleştirme sıralamasının (merge sort) zaman karmaşıklığı nedir?", ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], 1],
    ["İç içe iki döngünün her biri n kez dönüyorsa karmaşıklık nedir?", ["O(n)", "O(2n)", "O(n²)", "O(log n)"], 2],
    ["Durma koşulu (base case) olmayan özyinelemeli bir fonksiyon Python'da ne olur?", ["Sonsuza kadar sessizce çalışır", "RecursionError verir", "None döndürür", "0 döndürür"], 1],
    ["`sorted([3, 1, 2], reverse=True)` ifadesinin sonucu nedir?", ["[1, 2, 3]", "[3, 2, 1]", "[2, 1, 3]", "None"], 1],
    ["Aşağıdaki algoritmalardan hangisi verinin önceden sıralı olmasını gerektirir?", ["Doğrusal arama", "İkili arama", "Kabarcık sıralaması", "En büyüğü bulma"], 1],
    ["`len({1, 2, 2, 3})` ifadesinin sonucu nedir?", ["4", "3", "2", "Hata verir"], 1],
  ],
};

const FINAL_DESCRIPTION =
  "Orta-zor seviyede kurs sonu testi. Geçersen bir yazılım alanı seçip yol haritanı alırsın; kalırsan kursa baştan başlarsın.";

function finalQuestions(title) {
  return (finalBank[title] || []).map(([text, options, correct], i) => {
    // Doğru şık hep aynı harfte olmasın diye şıkları her soruda farklı miktarda döndür.
    const shift = (i * 3 + 1) % options.length;
    const rotated = options.map((_, k) => (k + shift) % options.length);
    return { text, options: rotated.map((k) => ({ text: options[k], isCorrect: k === correct })) };
  });
}

/** Eski sürümün otomatik ürettiği basit final sorularını yeni testlerle değiştirir. */
async function upgradeFinalExams() {
  const exams = await prisma.exam.findMany({
    where: { type: "FINAL", questions: { some: { text: { startsWith: "Şu açıklama hangi derse aittir?" } } } },
    include: { course: { select: { title: true } } },
  });
  for (const exam of exams) {
    const questions = finalQuestions(exam.course?.title);
    if (!questions.length) continue;
    await prisma.$transaction([
      prisma.question.deleteMany({ where: { examId: exam.id } }),
      prisma.exam.update({
        where: { id: exam.id },
        data: {
          description: FINAL_DESCRIPTION,
          durationMinutes: 20,
          questions: { create: questions.map((q, i) => ({ order: i + 1, text: q.text, options: { create: q.options } })) },
        },
      }),
    ]);
    console.log(`Final testi güncellendi: ${exam.course.title}`);
  }
}

const posts = [
  {
    title: "Frontend geliştirici olmak için yol haritası",
    tag: "Yol Haritası",
    summary: "HTML'den React'e kadar hangi sırayla ilerlemelisin? Adım adım bir plan.",
    content:
      "1. HTML ve CSS: Sayfa yapısı, Flexbox ve Grid ile yerleşim.\n\n2. JavaScript: Değişkenler, fonksiyonlar, diziler, DOM işlemleri ve fetch ile veri çekme.\n\n3. Git ve GitHub: Projelerini sürüm kontrolüyle yönet, portfolyonu oluştur.\n\n4. React: Bileşenler, state, hook'lar ve yönlendirme.\n\n5. Proje: Öğrendiklerinle kendi fikrini hayata geçir ve yayınla.\n\nHer adımda küçük projeler yapmak, sadece video izlemekten çok daha kalıcı öğrenmeni sağlar.",
  },
  {
    title: "Üniversiteye başlamadan kod yazmanın 5 faydası",
    tag: "Kariyer",
    summary: "Lisede yazılıma başlamak sana nasıl bir avantaj sağlar?",
    content:
      "Problem çözme alışkanlığı kazanırsın. Üniversitedeki programlama derslerine hazırlıklı başlarsın. Erken yaşta portfolyo oluşturursun. Yaz stajlarına ve hackathon'lara katılabilirsin. En önemlisi, bu alanı gerçekten sevip sevmediğini bölüm seçmeden önce görürsün.",
  },
  {
    title: "Seviye sınavı nasıl değerlendiriliyor?",
    tag: "Duyuru",
    summary: "Kayıttan sonra girdiğin sınav seni hangi sınıfa yerleştiriyor?",
    content:
      "Kayıt olduktan sonra kısa bir seviye sınavına girersin. Sınavdaki doğru cevap oranın eşik puanın üzerindeyse Beta (ileri), altındaysa Alpha (başlangıç) sınıfına yerleşirsin. Her sınıf kendi seviyesine uygun kurslara ve herkese açık kurslara erişir. Sınav bir kez çözülür; bir sorun olursa eğitmeninle iletişime geç.",
  },
];

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@futurecoders.dev").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin12345";
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      firstName: "FutureCoders",
      lastName: "Admin",
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "ADMIN",
    },
  });
  console.log(`Admin hesabı: ${email}`);

  if ((await prisma.course.count()) > 0) {
    await upgradeFinalExams();
    console.log("Kurslar zaten var, örnek içerik eklenmedi.");
    return;
  }

  for (const c of courses) {
    const course = await prisma.course.create({
      data: {
        title: c.title,
        summary: c.summary,
        description: c.description,
        category: c.category,
        level: c.level,
        published: true,
        lessons: {
          create: c.lessons.map(([title, content, minutes], i) => ({
            order: i + 1,
            title,
            content,
            videoUrl: VIDEO,
            durationMinutes: minutes,
          })),
        },
      },
    });
    const questions = finalQuestions(c.title);
    await prisma.exam.create({
      data: {
        type: "FINAL",
        title: `${c.title} Final Testi`,
        description: FINAL_DESCRIPTION,
        courseId: course.id,
        durationMinutes: 20,
        passingScore: 60,
        published: true,
        questions: { create: questions.map((q, i) => ({ order: i + 1, text: q.text, options: { create: q.options } })) },
      },
    });
  }

  await prisma.exam.create({
    data: {
      type: "PLACEMENT",
      title: "FutureCoders Seviye Sınavı",
      description:
        "Bu sınav seni Alpha (başlangıç) ya da Beta (ileri) sınıfına yerleştirir. Bilmediğin soruları boş bırakabilirsin.",
      durationMinutes: 20,
      passingScore: 60,
      published: true,
      questions: {
        create: placementQuestions.map(([text, options, correct], i) => ({
          order: i + 1,
          text,
          options: { create: options.map((o, k) => ({ text: o, isCorrect: k === correct })) },
        })),
      },
    },
  });

  for (const p of posts) {
    await prisma.blogPost.create({ data: { ...p, published: true, authorId: admin.id } });
  }
  console.log("Örnek kurslar, sınavlar ve blog yazıları eklendi.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
