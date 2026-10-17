// Derleyicideki diller. "browser" diller öğrencinin tarayıcısında çalışır (internet gerekmez);
// "server" diller kodu derleme servisine (varsayılan: Wandbox) gönderir. Anahtarlar
// frontend/src/utils/languages.js ile aynıdır; "wandbox" alanı servisteki dil adıdır.
export const LANGUAGES = [
  { key: "javascript", label: "JavaScript", runtime: "browser" },
  { key: "python", label: "Python", runtime: "browser" },
  { key: "web", label: "HTML / CSS / JS", runtime: "browser" },
  { key: "sql", label: "SQL (SQLite)", runtime: "browser" },
  { key: "typescript", label: "TypeScript", runtime: "server", wandbox: "TypeScript" },
  { key: "c", label: "C", runtime: "server", wandbox: "C" },
  { key: "cpp", label: "C++", runtime: "server", wandbox: "C++" },
  { key: "csharp", label: "C#", runtime: "server", wandbox: "C#" },
  { key: "java", label: "Java", runtime: "server", wandbox: "Java" },
  { key: "go", label: "Go", runtime: "server", wandbox: "Go" },
  { key: "rust", label: "Rust", runtime: "server", wandbox: "Rust" },
  { key: "php", label: "PHP", runtime: "server", wandbox: "PHP" },
  { key: "ruby", label: "Ruby", runtime: "server", wandbox: "Ruby" },
  { key: "swift", label: "Swift", runtime: "server", wandbox: "Swift" },
  { key: "scala", label: "Scala", runtime: "server", wandbox: "Scala" },
  { key: "haskell", label: "Haskell", runtime: "server", wandbox: "Haskell" },
  { key: "lua", label: "Lua", runtime: "server", wandbox: "Lua" },
  { key: "perl", label: "Perl", runtime: "server", wandbox: "Perl" },
  { key: "r", label: "R", runtime: "server", wandbox: "R" },
  { key: "julia", label: "Julia", runtime: "server", wandbox: "Julia" },
  { key: "elixir", label: "Elixir", runtime: "server", wandbox: "Elixir" },
  { key: "erlang", label: "Erlang", runtime: "server", wandbox: "Erlang" },
  { key: "ocaml", label: "OCaml", runtime: "server", wandbox: "OCaml" },
  { key: "pascal", label: "Pascal", runtime: "server", wandbox: "Pascal" },
  { key: "bash", label: "Bash", runtime: "server", wandbox: "Bash script" },
];

export const LANGUAGE_KEYS = LANGUAGES.map((l) => l.key);
export const languageByKey = (key) => LANGUAGES.find((l) => l.key === key);
