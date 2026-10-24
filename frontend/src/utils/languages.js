// Derleyicideki diller. Anahtarlar backend/src/data/languages.js ile aynıdır.
// "browser": öğrencinin tarayıcısında, internetsiz çalışır. "server": kod derleme servisine gönderilir.

const hello = "Merhaba Codevia!";

export const LANGUAGES = [
  { key: "javascript", label: "JavaScript", runtime: "browser", editor: "javascript", starter: `// Konsola yazdır\nconst isim = "Codevia";\nconsole.log("Merhaba " + isim + "!");\n\nfor (let i = 1; i <= 3; i++) {\n  console.log(i, "x", i, "=", i * i);\n}\n` },
  { key: "python", label: "Python", runtime: "browser", editor: "python", starter: `# Ekrana yazdır\nisim = "Codevia"\nprint(f"Merhaba {isim}!")\n\nfor i in range(1, 4):\n    print(i, "x", i, "=", i * i)\n` },
  {
    key: "web",
    label: "HTML / CSS / JS",
    runtime: "browser",
    editor: "html",
    starter: `<!doctype html>\n<html>\n<head>\n  <style>\n    body { font-family: sans-serif; text-align: center; padding: 24px; }\n    button { padding: 8px 16px; border-radius: 8px; }\n  </style>\n</head>\n<body>\n  <h1>${hello}</h1>\n  <button onclick="say()">Tıkla</button>\n  <p id="out"></p>\n  <script>\n    function say() {\n      document.getElementById("out").textContent = "İlk web sayfan çalışıyor!";\n    }\n  </script>\n</body>\n</html>\n`,
  },
  { key: "sql", label: "SQL (SQLite)", runtime: "browser", editor: "sql", starter: `CREATE TABLE ogrenci (id INTEGER, ad TEXT, puan INTEGER);\nINSERT INTO ogrenci VALUES (1, 'Ayşe', 92), (2, 'Mert', 78), (3, 'Elif', 85);\n\nSELECT ad, puan FROM ogrenci WHERE puan > 80 ORDER BY puan DESC;\n` },
  { key: "typescript", label: "TypeScript", runtime: "server", editor: "typescript", starter: `const isim: string = "Codevia";\nconsole.log(\`Merhaba \${isim}!\`);\n` },
  { key: "c", label: "C", runtime: "server", editor: "cpp", starter: `#include <stdio.h>\n\nint main(void) {\n    printf("${hello}\\n");\n    return 0;\n}\n` },
  { key: "cpp", label: "C++", runtime: "server", editor: "cpp", starter: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "${hello}" << endl;\n    return 0;\n}\n` },
  { key: "csharp", label: "C#", runtime: "server", editor: "csharp", starter: `using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("${hello}");\n    }\n}\n` },
  { key: "java", label: "Java", runtime: "server", editor: "java", starter: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("${hello}");\n    }\n}\n` },
  { key: "go", label: "Go", runtime: "server", editor: "go", starter: `package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("${hello}")\n}\n` },
  { key: "rust", label: "Rust", runtime: "server", editor: "rust", starter: `fn main() {\n    println!("${hello}");\n}\n` },
  { key: "php", label: "PHP", runtime: "server", editor: "php", starter: `<?php\n$isim = "Codevia";\necho "Merhaba $isim!\\n";\n` },
  { key: "ruby", label: "Ruby", runtime: "server", editor: "ruby", starter: `isim = "Codevia"\nputs "Merhaba #{isim}!"\n` },
  { key: "swift", label: "Swift", runtime: "server", editor: "swift", starter: `let isim = "Codevia"\nprint("Merhaba \\(isim)!")\n` },
  { key: "scala", label: "Scala", runtime: "server", editor: "scala", starter: `object Main extends App {\n  println("${hello}")\n}\n` },
  { key: "haskell", label: "Haskell", runtime: "server", editor: "haskell", starter: `main :: IO ()\nmain = putStrLn "${hello}"\n` },
  { key: "lua", label: "Lua", runtime: "server", editor: "lua", starter: `print("${hello}")\n` },
  { key: "perl", label: "Perl", runtime: "server", editor: "perl", starter: `print "${hello}\\n";\n` },
  { key: "r", label: "R", runtime: "server", editor: "r", starter: `isim <- "Codevia"\ncat("Merhaba", isim, "\\n")\n` },
  { key: "julia", label: "Julia", runtime: "server", editor: "julia", starter: `println("${hello}")\n` },
  { key: "elixir", label: "Elixir", runtime: "server", editor: null, starter: `IO.puts "${hello}"\n` },
  { key: "erlang", label: "Erlang", runtime: "server", editor: "erlang", starter: `-module(prog).\n-export([main/0]).\n\nmain() ->\n    io:format("${hello}~n").\n` },
  { key: "ocaml", label: "OCaml", runtime: "server", editor: "ocaml", starter: `let () = print_endline "${hello}"\n` },
  { key: "pascal", label: "Pascal", runtime: "server", editor: "pascal", starter: `program Merhaba;\nbegin\n  writeln('${hello}');\nend.\n` },
  { key: "bash", label: "Bash", runtime: "server", editor: "shell", starter: `isim="Codevia"\necho "Merhaba $isim!"\n` },
];

export const languageByKey = (key) => LANGUAGES.find((l) => l.key === key);
export const DEFAULT_LANGUAGE = "python";

/** Admin formlarındaki dil seçimi için. */
export const LANGUAGE_OPTIONS = LANGUAGES.map((l) => ({ value: l.key, label: l.label }));
