// Derleyicideki diller. "browser" diller öğrencinin tarayıcısında çalışır (internet gerekmez);
// "server" diller kodu derleme servislerine gönderir (bkz. lib/codeRunner.js). Anahtarlar
// frontend/src/utils/languages.js ile aynıdır.
// Her sunucu dili için hangi serviste hangi adla çalıştığı:
//   wandbox: servisteki dil adı ve denenmiş, çalışan derleyici sürümleri (öncelik sırasıyla, ad başlangıcı).
//     Liste boşsa ya da listedekilerin hiçbiri serviste yoksa en yeni kararlı sürüm seçilir; null: bu dil Wandbox'ta bozuk.
//   judge0: Judge0'daki dil adının başı (ör. "C (GCC"); aynı başla birden çok sürüm varsa en yenisi seçilir.
//   paiza: paiza.io'daki dil anahtarı.
// Bir servis listede yoksa o dil o servise hiç gönderilmez (ör. Erlang kodu servisler arasında farklı yazılır).
// Wandbox listeleri 2026-10-24'te tek tek denendi: daha yeni Go/Rust/Haskell/Julia sürümleri zaman aşımına
// uğruyor, dotnetcore/Scala 3.5/Lua 5.2-5.3/Erlang 26+ bozuk; Swift, Elixir ve OCaml Wandbox'ta hiç çalışmıyor.
export const LANGUAGES = [
  { key: "javascript", label: "JavaScript", runtime: "browser" },
  { key: "python", label: "Python", runtime: "browser" },
  { key: "web", label: "HTML / CSS / JS", runtime: "browser" },
  { key: "sql", label: "SQL (SQLite)", runtime: "browser" },
  { key: "typescript", label: "TypeScript", runtime: "server", wandbox: { language: "TypeScript", prefer: ["typescript-"] }, judge0: "TypeScript (", paiza: "typescript" },
  { key: "c", label: "C", runtime: "server", wandbox: { language: "C", prefer: ["gcc-13", "clang-17", "gcc-12"] }, judge0: "C (GCC", paiza: "c" },
  { key: "cpp", label: "C++", runtime: "server", wandbox: { language: "C++", prefer: ["gcc-13", "clang-17", "gcc-12"] }, judge0: "C++ (GCC", paiza: "cpp" },
  { key: "csharp", label: "C#", runtime: "server", wandbox: { language: "C#", prefer: ["mono-"] }, judge0: "C# (Mono", paiza: "csharp" },
  { key: "java", label: "Java", runtime: "server", wandbox: { language: "Java", prefer: ["openjdk-jdk-22", "openjdk-jdk-21"] }, judge0: "Java (OpenJDK", paiza: "java" },
  { key: "go", label: "Go", runtime: "server", wandbox: { language: "Go", prefer: ["go-1.16", "go-1.15"] }, judge0: "Go (", paiza: "go" },
  { key: "rust", label: "Rust", runtime: "server", wandbox: { language: "Rust", prefer: ["rust-1.80", "rust-1.79"] }, judge0: "Rust (", paiza: "rust" },
  { key: "php", label: "PHP", runtime: "server", wandbox: { language: "PHP", prefer: ["php-8.3", "php-8.2"] }, judge0: "PHP (", paiza: "php" },
  { key: "ruby", label: "Ruby", runtime: "server", wandbox: { language: "Ruby", prefer: ["ruby-3.4", "ruby-3.3"] }, judge0: "Ruby (", paiza: "ruby" },
  { key: "swift", label: "Swift", runtime: "server", wandbox: null, judge0: "Swift (", paiza: "swift" },
  { key: "scala", label: "Scala", runtime: "server", wandbox: { language: "Scala", prefer: ["scala-3.3", "scala-2.13"] }, judge0: "Scala (", paiza: "scala" },
  { key: "haskell", label: "Haskell", runtime: "server", wandbox: { language: "Haskell", prefer: ["ghc-9.0", "ghc-8.10"] }, judge0: "Haskell (", paiza: "haskell" },
  { key: "lua", label: "Lua", runtime: "server", wandbox: { language: "Lua", prefer: ["lua-5.4", "luajit-"] }, judge0: "Lua (" },
  { key: "perl", label: "Perl", runtime: "server", wandbox: { language: "Perl", prefer: ["perl-5.40", "perl-5.38"] }, judge0: "Perl (", paiza: "perl" },
  { key: "r", label: "R", runtime: "server", wandbox: { language: "R", prefer: ["r-"] }, judge0: "R (", paiza: "r" },
  { key: "julia", label: "Julia", runtime: "server", wandbox: { language: "Julia", prefer: ["julia-1.0"] } },
  { key: "elixir", label: "Elixir", runtime: "server", wandbox: null, judge0: "Elixir (", paiza: "elixir" },
  { key: "erlang", label: "Erlang", runtime: "server", wandbox: { language: "Erlang", prefer: ["erlang-25"] } },
  { key: "ocaml", label: "OCaml", runtime: "server", wandbox: null, judge0: "OCaml (" },
  { key: "pascal", label: "Pascal", runtime: "server", wandbox: { language: "Pascal", prefer: ["fpc-"] }, judge0: "Pascal (" },
  { key: "bash", label: "Bash", runtime: "server", wandbox: { language: "Bash script", prefer: ["bash"] }, judge0: "Bash (", paiza: "bash" },
];

export const LANGUAGE_KEYS = LANGUAGES.map((l) => l.key);
export const languageByKey = (key) => LANGUAGES.find((l) => l.key === key);
