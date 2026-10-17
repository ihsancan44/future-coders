// Örnek kursların "Kısa ve net" özetleri, örnek kodları ve pratik soruları.
// Seed, bu içeriği sadece özeti ve pratiği henüz boş olan derslere ekler; adminin yazdıkları korunur.
// Pratik: [soru, kod, şıklar, doğru şıkkın sırası, açıklama]

export const learningContent = {
  "Web'e Giriş: HTML ve CSS": {
    "Web nasıl çalışır?": {
      language: "web",
      keyPoints: [
        "Tarayıcı bir adrese gidince sunucudan HTML, CSS ve JavaScript dosyalarını ister.",
        "HTML sayfanın içeriğini ve iskeletini kurar.",
        "CSS görünümü (renk, yazı, yerleşim), JavaScript ise davranışı belirler.",
      ],
      codeExample: "<!doctype html>\n<html>\n  <body>\n    <h1>Merhaba Web!</h1>\n    <p style=\"color: tomato\">CSS ile renkli bir paragraf.</p>\n    <button onclick=\"alert('JavaScript çalıştı!')\">Tıkla</button>\n  </body>\n</html>",
      tip: "İçerik HTML'de, görünüm CSS'te, davranış JavaScript'te: üçünü ayrı düşün.",
      practice: [
        ["Sayfadaki bir düğmenin rengini değiştirmek hangi dilin işidir?", "", ["HTML", "CSS", "JavaScript", "SQL"], 1, "Renk bir görünüm özelliğidir, CSS ile verilir."],
        ["Tarayıcı bir web sayfasını açarken ilk olarak hangi dosyayı ister?", "", ["CSS dosyasını", "Resimleri", "HTML dosyasını", "Veritabanını"], 2, "HTML sayfanın iskeletidir; CSS ve JavaScript dosyaları HTML'in içinden çağrılır."],
      ],
    },
    "HTML etiketleri": {
      language: "web",
      keyPoints: [
        "Etiketler açılır ve kapanır: <p>…</p>. Bazıları tek başınadır: <img>.",
        "Başlıklar h1'den (en büyük) h6'ya kadar gider.",
        "<a href> bağlantı, <img src alt> görsel, <ul>/<ol> ile <li> liste yapar.",
      ],
      codeExample: "<h1>Hobilerim</h1>\n<ul>\n  <li>Kod yazmak</li>\n  <li>Satranç</li>\n</ul>\n<a href=\"https://developer.mozilla.org\">MDN'e git</a>",
      tip: "Görsellere her zaman alt yaz: görsel açılmazsa ve ekran okuyucular için gerekir.",
      practice: [
        ["Numaralı (1, 2, 3…) bir liste hangi etiketle yapılır?", "", ["<ul>", "<ol>", "<li>", "<list>"], 1, "ol: ordered list (sıralı liste). ul madde işaretli listedir."],
        ["Bu kodda bağlantının gideceği adresi hangi özellik belirler?", "<a href=\"https://codevia.dev\">Codevia</a>", ["a", "href", "Codevia", "https"], 1, "href (hypertext reference) bağlantının hedefidir."],
      ],
    },
    "CSS ile stil verme": {
      language: "web",
      keyPoints: [
        "Kural = seçici + özellikler: p { color: navy; }",
        ".isim class'ı, #isim id'yi, p etiketi seçer.",
        "margin dış boşluk, padding iç boşluktur.",
      ],
      codeExample: "<style>\n  .kart {\n    padding: 16px;\n    margin: 12px;\n    border-radius: 12px;\n    background: #eef4ff;\n    color: #053471;\n  }\n</style>\n<div class=\"kart\">Ben bir kartım</div>",
      tip: "Aynı öğeye birden çok kural uyarsa en özel seçici kazanır: #id > .class > etiket.",
      practice: [
        ["class'ı \"kutu\" olan öğeleri seçen CSS seçicisi hangisi?", "", ["#kutu", ".kutu", "kutu", "*kutu"], 1, "Nokta class'ı, diyez id'yi seçer."],
        ["Öğenin kenarlığı ile içindeki yazı arasındaki boşluk hangisiyle ayarlanır?", "", ["margin", "padding", "gap", "border"], 1, "padding iç boşluktur; margin öğenin dışındaki boşluk."],
      ],
    },
    "Flexbox ile yerleşim": {
      language: "web",
      keyPoints: [
        "display: flex öğenin çocuklarını yan yana dizer.",
        "justify-content ana eksende (yatay), align-items çapraz eksende (dikey) hizalar.",
        "gap öğelerin arasına boşluk koyar; flex-direction: column alt alta dizer.",
      ],
      codeExample: "<style>\n  .satir { display: flex; gap: 12px; justify-content: center; align-items: center; height: 120px; }\n  .satir div { background: #1b5fb8; color: white; padding: 12px; border-radius: 8px; }\n</style>\n<div class=\"satir\">\n  <div>1</div><div>2</div><div>3</div>\n</div>",
      tip: "Yatay ortalama justify-content: center, dikey ortalama align-items: center.",
      practice: [
        ["display: flex olan satırda öğeleri yatayda ortalamak için ne yazılır?", "", ["align-items: center", "justify-content: center", "text-align: center", "float: center"], 1, "Satırda ana eksen yataydır; ana eksen hizası justify-content'tir."],
        ["Öğeleri alt alta dizmek için hangisi kullanılır?", "", ["flex-direction: column", "flex-wrap: wrap", "gap: column", "display: block-flex"], 0, "flex-direction: column ana ekseni dikey yapar."],
      ],
    },
  },
  "JavaScript Temelleri": {
    "Değişkenler ve veri tipleri": {
      language: "javascript",
      keyPoints: [
        "let değişebilen, const değişmeyen değişken tanımlar.",
        "Temel tipler: sayı, metin (string), true/false (boolean), dizi ve nesne.",
        "typeof bir değerin tipini söyler.",
      ],
      codeExample: "let yas = 15;\nconst isim = \"Ayşe\";\nconst notlar = [90, 75, 100];\nconsole.log(typeof yas, typeof isim, notlar.length);\nyas = yas + 1;\nconsole.log(isim + \" artık \" + yas + \" yaşında\");",
      tip: "Varsayılan olarak const kullan; değeri değişecekse let'e geç.",
      practice: [
        ["Bu kod ne yazdırır?", "let x = 5;\nx = x + \"2\";\nconsole.log(x);", ["7", "\"52\" (52)", "NaN", "Hata verir"], 1, "Sayı + metin birleştirme yapar: \"5\" + \"2\" = \"52\"."],
        ["typeof [1, 2, 3] ne döndürür?", "", ["\"array\"", "\"object\"", "\"list\"", "\"number\""], 1, "JavaScript'te diziler de nesnedir; dizi olup olmadığını Array.isArray söyler."],
      ],
    },
    "Koşullar": {
      language: "javascript",
      keyPoints: [
        "if (koşul) { … } else { … } farklı durumlarda farklı kod çalıştırır.",
        "=== hem değeri hem tipi karşılaştırır; == tip dönüştürür, kullanma.",
        "&& (ve), || (veya), ! (değil) koşulları birleştirir.",
      ],
      codeExample: "const puan = 72;\nif (puan >= 85) {\n  console.log(\"Pekiyi\");\n} else if (puan >= 60) {\n  console.log(\"Geçti\");\n} else {\n  console.log(\"Tekrar dene\");\n}",
      tip: "Karşılaştırmada her zaman === kullan: 5 == \"5\" true, 5 === \"5\" false'tur.",
      practice: [
        ["puan = 60 iken ne yazdırır?", "if (puan > 60) console.log(\"A\");\nelse if (puan === 60) console.log(\"B\");\nelse console.log(\"C\");", ["A", "B", "C", "Hiçbir şey"], 1, "60 > 60 yanlıştır; 60 === 60 doğru olduğu için B yazar."],
        ["true && false || true ifadesinin sonucu nedir?", "", ["true", "false", "undefined", "Hata"], 0, "Önce && hesaplanır: false; sonra false || true = true."],
      ],
    },
    "Döngüler": {
      language: "javascript",
      keyPoints: [
        "for (let i = 0; i < n; i++) bir işi n kez yapar.",
        "while (koşul) koşul doğru olduğu sürece döner; koşulu değiştirmeyi unutma.",
        "Dizilerde for (const x of dizi) en okunaklı yoldur.",
      ],
      codeExample: "const meyveler = [\"elma\", \"armut\", \"kiraz\"];\nfor (const m of meyveler) {\n  console.log(m.toUpperCase());\n}\nlet sayac = 3;\nwhile (sayac > 0) {\n  console.log(\"Geri sayım:\", sayac);\n  sayac--;\n}",
      tip: "Koşulu hiç yanlış olmayan bir while döngüsü sonsuza kadar döner.",
      practice: [
        ["Bu döngü kaç kez \"Merhaba\" yazdırır?", "for (let i = 1; i < 5; i++) {\n  console.log(\"Merhaba\");\n}", ["5", "4", "6", "1"], 1, "i değerleri 1, 2, 3, 4: dört kez çalışır."],
        ["Toplam kaç olur?", "let t = 0;\nfor (const n of [2, 4, 6]) t += n;", ["6", "12", "246", "0"], 1, "2 + 4 + 6 = 12."],
      ],
    },
    "Fonksiyonlar": {
      language: "javascript",
      keyPoints: [
        "Fonksiyon, bir işi yapan ve tekrar tekrar çağrılabilen kod bloğudur.",
        "Dışarıdan aldığı değerlere parametre denir: topla(a, b).",
        "return sonucu geri verir ve fonksiyonu orada bitirir.",
      ],
      codeExample: "function selamla(isim) {\n  return \"Merhaba \" + isim;\n}\nconst kare = (x) => x * x;\nconsole.log(selamla(\"Ayşe\"));\nconsole.log(kare(4));",
      tip: "return yoksa fonksiyon undefined döndürür.",
      practice: [
        ["kare(4) ne döndürür?", "function kare(x) { return x * x; }", ["8", "16", "undefined", "44"], 1, "4 × 4 = 16."],
        ["Bu kod ne yazdırır?", "function f() {\n  return 1;\n  console.log(\"iki\");\n}\nconsole.log(f());", ["iki", "1", "1 ve iki", "undefined"], 1, "return'den sonraki satır hiç çalışmaz; sadece 1 yazdırılır."],
      ],
    },
  },
  "React İle Başlangıç": {
    "React ne demek?": {
      language: "javascript",
      keyPoints: [
        "React, arayüzü küçük parçalara (bileşenlere) bölen bir JavaScript kütüphanesidir.",
        "JSX, JavaScript içinde HTML'e benzeyen bir yazımdır.",
        "Veri değişince React ekranın sadece değişen kısmını yeniden çizer.",
      ],
      codeExample: "// JSX aslında bir fonksiyon çağrısıdır:\n// <h1 className=\"baslik\">Merhaba</h1>\n// React.createElement(\"h1\", { className: \"baslik\" }, \"Merhaba\")\nconst eleman = { type: \"h1\", props: { className: \"baslik\", children: \"Merhaba\" } };\nconsole.log(eleman);",
      tip: "JSX'te class yerine className yazılır, çünkü class JavaScript'te ayrılmış bir kelimedir.",
      practice: [
        ["JSX'te bir öğeye CSS class'ı vermek için hangi özellik kullanılır?", "", ["class", "className", "cssClass", "style"], 1, "class JavaScript'te ayrılmış kelime olduğu için JSX className kullanır."],
        ["React en çok ne için kullanılır?", "", ["Veritabanı yönetmek", "Kullanıcı arayüzü yapmak", "Sunucu kurmak", "Resim düzenlemek"], 1, "React bir arayüz (UI) kütüphanesidir."],
      ],
    },
    "Bileşen yapısı": {
      language: "javascript",
      keyPoints: [
        "Bileşen, JSX döndüren bir fonksiyondur ve adı büyük harfle başlar.",
        "Bir bileşeni başka bileşenin içinde <Kart /> gibi kullanırsın.",
        "Bir bileşen tek bir kök öğe döndürür; gerekirse <>…</> ile sarılır.",
      ],
      codeExample: "// Bileşen = veri alıp arayüz döndüren fonksiyon\nfunction Kart(baslik) {\n  return `<div class=\"kart\"><h2>${baslik}</h2></div>`;\n}\nconsole.log([\"HTML\", \"CSS\"].map(Kart).join(\"\\n\"));",
      tip: "Küçük harfle başlayan <kart /> React'te HTML etiketi sanılır; bileşen adları büyük harfle başlar.",
      practice: [
        ["Hangisi geçerli bir React bileşen adıdır?", "", ["profilKarti", "ProfilKarti", "profil-karti", "_profil"], 1, "Bileşen adları büyük harfle başlar (PascalCase)."],
        ["İki kardeş öğeyi fazladan div eklemeden sarmak için ne kullanılır?", "", ["<span>", "<>…</> (Fragment)", "<body>", "<root>"], 1, "Fragment ekrana ek bir öğe koymadan sarar."],
      ],
    },
    "Props ve state": {
      language: "javascript",
      keyPoints: [
        "Props bileşene dışarıdan gelen veridir ve bileşen içinde değiştirilmez.",
        "State bileşenin kendi içinde değişen verisidir: const [sayi, setSayi] = useState(0).",
        "setSayi çağrılınca bileşen yeni değerle yeniden çizilir.",
      ],
      codeExample: "// useState'in mantığı: değer + o değeri değiştiren fonksiyon\nfunction useStateBenzeri(ilk) {\n  let deger = ilk;\n  const ayarla = (yeni) => { deger = yeni; console.log(\"yeniden çiz:\", deger); };\n  return [() => deger, ayarla];\n}\nconst [sayi, setSayi] = useStateBenzeri(0);\nsetSayi(sayi() + 1);",
      tip: "State'i doğrudan değiştirme (sayi++ yazma); her zaman set fonksiyonunu kullan.",
      practice: [
        ["Bir bileşene <Selam isim=\"Ali\" /> şeklinde gönderilen isim nedir?", "", ["state", "prop", "hook", "effect"], 1, "Dışarıdan gelen değerler prop'tur."],
        ["Butona basınca sayacı 1 artırmak için ne yazılır?", "const [sayi, setSayi] = useState(0);", ["sayi++", "sayi = sayi + 1", "setSayi(sayi + 1)", "useState(sayi + 1)"], 2, "State sadece set fonksiyonuyla değiştirilir, React de ekranı yeniler."],
      ],
    },
  },
  "İleri Seviye React": {
    "useEffect ve yan etkiler": {
      language: "javascript",
      keyPoints: [
        "useEffect, bileşen ekrana geldikten sonra çalışacak işler içindir (veri çekme, zamanlayıcı).",
        "Bağımlılık dizisi [] ise bir kez, [x] ise x değişince yeniden çalışır.",
        "Döndürülen temizlik fonksiyonu bileşen kaldırılınca çalışır.",
      ],
      codeExample: "// Temizlik fonksiyonu mantığı\nfunction effect() {\n  const id = setInterval(() => console.log(\"tik\"), 300);\n  return () => { clearInterval(id); console.log(\"temizlendi\"); };\n}\nconst temizle = effect();\nsetTimeout(temizle, 1000);",
      tip: "Zamanlayıcı ya da abonelik başlatan effect mutlaka temizlik fonksiyonu döndürmeli.",
      practice: [
        ["useEffect(() => {...}, []) ne zaman çalışır?", "", ["Her çizimde", "Sadece bileşen ilk ekrana gelince", "Hiç çalışmaz", "Sadece bileşen kaldırılınca"], 1, "Boş bağımlılık dizisi: sadece ilk yüklemede."],
        ["useEffect'ten döndürülen fonksiyon ne işe yarar?", "", ["Hata yakalar", "Temizlik yapar (ör. zamanlayıcıyı durdurur)", "State'i sıfırlar", "Sayfayı yeniler"], 1, "Bileşen kaldırılırken ya da effect yeniden çalışmadan önce çağrılır."],
      ],
    },
    "Özel hook yazmak": {
      language: "javascript",
      keyPoints: [
        "Tekrarlanan state ve effect mantığını kendi fonksiyonuna taşıyabilirsin.",
        "Hook adları use ile başlar: useSayac, useFetch.",
        "Hook'lar sadece bileşenin ya da başka hook'un en üst seviyesinde çağrılır.",
      ],
      codeExample: "// Özel hook fikri: mantığı tek yerde topla\nfunction useSayac(baslangic = 0) {\n  let n = baslangic;\n  return { artir: () => ++n, deger: () => n };\n}\nconst sayac = useSayac(5);\nsayac.artir();\nconsole.log(sayac.deger());",
      tip: "Hook'u if ya da döngü içinde çağırma: React çağrı sırasına güvenir.",
      practice: [
        ["Hangisi doğru bir özel hook adıdır?", "", ["fetchData", "useFetch", "UseFetchHook", "hookFetch"], 1, "Özel hook'lar use ile başlar."],
        ["Bu kullanım neden hatalı?", "if (girisYapti) {\n  const [x, setX] = useState(0);\n}", ["useState sadece sınıflarda çalışır", "Hook koşul içinde çağrılmış", "x adı geçersiz", "Hatalı değil"], 1, "Hook'lar her çizimde aynı sırayla çağrılmalı; koşul içinde çağrılamaz."],
      ],
    },
    "React Router": {
      language: "javascript",
      keyPoints: [
        "createBrowserRouter ile adresleri (path) sayfalara bağlarsın.",
        "<Link to=\"/kurslar\"> sayfayı yenilemeden geçiş yapar.",
        "useParams adresteki değerleri okur: /kurs/:id → id.",
      ],
      codeExample: "// /kurs/:id kalıbından id'yi okumak\nfunction eslestir(kalip, adres) {\n  const k = kalip.split(\"/\"), a = adres.split(\"/\");\n  const params = {};\n  k.forEach((p, i) => { if (p.startsWith(\":\")) params[p.slice(1)] = a[i]; });\n  return params;\n}\nconsole.log(eslestir(\"/kurs/:id\", \"/kurs/42\"));",
      tip: "Site içi bağlantılarda <a> yerine <Link> kullan; sayfa baştan yüklenmez.",
      practice: [
        ["Adres /kurs/42 ve rota /kurs/:id ise useParams().id nedir?", "", ["42 (metin olarak \"42\")", "kurs", ":id", "undefined"], 0, "Adresteki değerler metin olarak gelir; sayı lazımsa Number() ile çevir."],
        ["Sayfayı yenilemeden başka sayfaya geçmek için hangisi kullanılır?", "", ["<a href>", "<Link to>", "window.location", "<form>"], 1, "Link, React Router içinde geçiş yapar."],
      ],
    },
    "API'den veri çekmek": {
      language: "javascript",
      keyPoints: [
        "fetch(adres) bir Promise döndürür; await ile cevabı beklersin.",
        "Cevabı res.json() ile nesneye çevirirsin.",
        "Yükleniyor ve hata durumlarını ayrı state'lerde tut.",
      ],
      codeExample: "// Sahte bir API ile async/await\nconst api = () => new Promise((ok) => setTimeout(() => ok({ kurslar: [\"HTML\", \"React\"] }), 300));\nasync function yukle() {\n  console.log(\"Yükleniyor...\");\n  try {\n    const veri = await api();\n    console.log(veri.kurslar);\n  } catch (e) {\n    console.log(\"Hata:\", e.message);\n  }\n}\nyukle();",
      tip: "await sadece async fonksiyonların içinde kullanılabilir.",
      practice: [
        ["Bu kod hangi sırayla yazdırır?", "console.log(\"A\");\nsetTimeout(() => console.log(\"B\"), 0);\nconsole.log(\"C\");", ["A B C", "A C B", "B A C", "C A B"], 1, "setTimeout'taki iş, mevcut kod bittikten sonra çalışır."],
        ["fetch cevabını nesneye çevirmek için ne yazılır?", "const res = await fetch(\"/api/kurslar\");", ["res.text", "await res.json()", "JSON(res)", "res.body"], 1, "res.json() de bir Promise döndürür, await ile beklenir."],
      ],
    },
  },
  "Python ile Algoritma": {
    "Karmaşıklık nedir?": {
      language: "python",
      keyPoints: [
        "Big-O, girdi büyüdükçe algoritmanın ne kadar yavaşladığını anlatır.",
        "O(1) sabit, O(n) doğrusal, O(n²) karesel büyür.",
        "İç içe iki döngü genellikle O(n²) demektir.",
      ],
      codeExample: "def ciftleri_say(sayilar):\n    adim = 0\n    for a in sayilar:\n        for b in sayilar:\n            adim += 1\n    return adim\n\nfor n in [10, 100, 1000]:\n    print(n, \"eleman ->\", ciftleri_say(range(n)), \"adım\")",
      tip: "Girdi 10 kat büyüyünce O(n) 10 kat, O(n²) 100 kat yavaşlar.",
      practice: [
        ["Bu fonksiyonun karmaşıklığı nedir?", "def ilk(liste):\n    return liste[0]", ["O(1)", "O(n)", "O(log n)", "O(n²)"], 0, "Liste ne kadar büyük olursa olsun tek adımdır."],
        ["İç içe iki for döngüsü n elemanlı liste üzerinde dönüyorsa?", "", ["O(n)", "O(2n)", "O(n²)", "O(log n)"], 2, "Her eleman için tüm liste dolaşılır: n × n."],
      ],
    },
    "Arama algoritmaları": {
      language: "python",
      keyPoints: [
        "Doğrusal arama elemanlara tek tek bakar: O(n).",
        "İkili arama sadece sıralı listede çalışır ve aralığı her adımda yarıya indirir: O(log n).",
        "1 milyon elemanda ikili arama en fazla ~20 adımda bulur.",
      ],
      codeExample: "def ikili_ara(liste, hedef):\n    sol, sag = 0, len(liste) - 1\n    while sol <= sag:\n        orta = (sol + sag) // 2\n        if liste[orta] == hedef:\n            return orta\n        if liste[orta] < hedef:\n            sol = orta + 1\n        else:\n            sag = orta - 1\n    return -1\n\nprint(ikili_ara([2, 5, 8, 12, 16, 23, 38], 16))",
      tip: "İkili aramadan önce listenin sıralı olduğundan emin ol.",
      practice: [
        ["İkili arama hangi listede doğru çalışır?", "", ["Her listede", "Sadece sıralı listede", "Sadece sayılardan oluşan listede", "Sadece kısa listede"], 1, "Ortadaki elemana bakıp yarısını atabilmek için sıralı olmalı."],
        ["Bu kod ne yazdırır?", "liste = [3, 7, 9, 14]\nprint(liste.index(9))", ["9", "2", "3", "-1"], 1, "index konumu verir ve sayma 0'dan başlar: 3→0, 7→1, 9→2."],
      ],
    },
    "Sıralama algoritmaları": {
      language: "python",
      keyPoints: [
        "Kabarcık sıralaması komşu elemanları yer değiştirir: basit ama O(n²).",
        "Birleştirme sıralaması listeyi bölüp sıralı parçaları birleştirir: O(n log n).",
        "Python'da sorted(liste) yeni sıralı liste, liste.sort() listenin kendisini sıralar.",
      ],
      codeExample: "def kabarcik(liste):\n    a = list(liste)\n    for i in range(len(a)):\n        for j in range(len(a) - 1 - i):\n            if a[j] > a[j + 1]:\n                a[j], a[j + 1] = a[j + 1], a[j]\n    return a\n\nprint(kabarcik([5, 1, 4, 2, 8]))\nprint(sorted([5, 1, 4, 2, 8], reverse=True))",
      tip: "Gerçek projelerde kendi sıralamanı yazmak yerine sorted() kullan; o zaten O(n log n).",
      practice: [
        ["Bu kod ne yazdırır?", "s = [3, 1, 2]\nt = sorted(s)\nprint(s, t)", ["[1, 2, 3] [1, 2, 3]", "[3, 1, 2] [1, 2, 3]", "[3, 1, 2] None", "Hata verir"], 1, "sorted yeni liste döndürür, orijinal liste değişmez."],
        ["Birleştirme sıralamasının (merge sort) karmaşıklığı nedir?", "", ["O(n)", "O(n log n)", "O(n²)", "O(1)"], 1, "Liste log n kez bölünür, her seviyede n iş yapılır."],
      ],
    },
  },
};

/** Özeti ve pratiği boş olan örnek derslere içerik ekler; eklenen ders sayısını döndürür. */
export async function addLearningContent(prisma) {
  let added = 0;
  for (const [courseTitle, lessons] of Object.entries(learningContent)) {
    for (const [lessonTitle, c] of Object.entries(lessons)) {
      const targets = await prisma.lesson.findMany({
        where: { title: lessonTitle, course: { title: courseTitle }, keyPoints: { isEmpty: true }, practice: { none: {} } },
        select: { id: true, language: true, codeExample: true, tip: true },
      });
      for (const l of targets) {
        await prisma.lesson.update({
          where: { id: l.id },
          data: {
            keyPoints: c.keyPoints,
            codeExample: l.codeExample || c.codeExample,
            tip: l.tip || c.tip,
            language: l.language || c.language,
            practice: {
              create: c.practice.map(([text, code, options, answerIndex, explanation], i) => ({ order: i + 1, text, code, options, answerIndex, explanation })),
            },
          },
        });
        added++;
      }
    }
  }
  return added;
}
