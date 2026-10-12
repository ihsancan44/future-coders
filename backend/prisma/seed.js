// Örnek veri: admin hesabı, kurslar, dersler, seviye sınavı, final sınavları ve blog yazıları.
// Tekrar çalıştırılabilir: mevcut admin korunur, örnek içerik sadece veritabanı boşsa eklenir.
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

function finalQuestions(course) {
  return course.lessons.map(([title, content], i) => {
    const others = course.lessons.filter((_, j) => j !== i).map(([t]) => t);
    const options = [title, ...others].slice(0, 4);
    // Doğru şıkkı sabit bir yere koymamak için döndür.
    const shift = i % options.length;
    const rotated = options.map((_, k) => options[(k + shift) % options.length]);
    return {
      text: `Şu açıklama hangi derse aittir? "${content.split(".")[0]}."`,
      options: rotated.map((t) => ({ text: t, isCorrect: t === title })),
    };
  });
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
    const questions = finalQuestions(c);
    await prisma.exam.create({
      data: {
        type: "FINAL",
        title: `${c.title} Final Sınavı`,
        description: "Kursun tüm adımlarını tamamladıktan sonra girebilirsin.",
        courseId: course.id,
        durationMinutes: 15,
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
