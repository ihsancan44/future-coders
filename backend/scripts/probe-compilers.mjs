// Geçici teşhis betiği: derleme servislerini bu bilgisayardan dener, sonucu JSON olarak yazar.
// Kullanım: node scripts/probe-compilers.mjs > probe.json
const T = 40_000;
const hello = "Merhaba Codevia!";
const progs = {
  "TypeScript": `const isim: string = "Codevia";\nconsole.log(\`Merhaba \${isim}!\`);\n`,
  "C": `#include <stdio.h>\nint main(void){char s[64];if(fgets(s,64,stdin))printf("in:%s",s);printf("${hello}\\n");return 0;}\n`,
  "C++": `#include <iostream>\nint main(){std::cout<<"${hello}"<<std::endl;}\n`,
  "C#": `using System;\nclass Program { static void Main() { Console.WriteLine("${hello}"); } }\n`,
  "Java": `public class prog {\n public static void main(String[] a){ System.out.println("${hello}"); }\n}\n`,
  "Go": `package main\nimport "fmt"\nfunc main(){ fmt.Println("${hello}") }\n`,
  "Rust": `fn main(){ println!("${hello}"); }\n`,
  "PHP": `<?php\necho "${hello}\\n";\n`,
  "Ruby": `puts "${hello}"\n`,
  "Swift": `print("${hello}")\n`,
  "Scala": `object Main extends App {\n  println("${hello}")\n}\n`,
  "Haskell": `main = putStrLn "${hello}"\n`,
  "Lua": `print("${hello}")\n`,
  "Perl": `print "${hello}\\n";\n`,
  "R": `cat("${hello}\\n")\n`,
  "Julia": `println("${hello}")\n`,
  "Elixir": `IO.puts "${hello}"\n`,
  "Erlang": `-module(prog).\n-export([main/0]).\nmain() -> io:format("${hello}~n").\n`,
  "OCaml": `let () = print_endline "${hello}"\n`,
  "Pascal": `program M;\nbegin\n writeln('${hello}');\nend.\n`,
  "Bash script": `echo "${hello}"\n`,
};
const javaVariants = {
  publicMain: `public class Main {\n public static void main(String[] a){ System.out.println("${hello}"); }\n}\n`,
  plainMain: `class Main {\n public static void main(String[] a){ System.out.println("${hello}"); }\n}\n`,
  wrapper: `class Main {\n public static void main(String[] a){ System.out.println("${hello}"); }\n}\nclass prog { public static void main(String[] a) throws Exception { Main.main(a); } }\n`,
  wrapperFirst: `class prog { public static void main(String[] a) throws Exception { Main.main(a); } }\nclass Main {\n public static void main(String[] a){ System.out.println("${hello}"); }\n}\n`,
};
const out = { at: new Date().toISOString(), node: process.version };
async function j(url, opt = {}) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { ...opt, signal: AbortSignal.timeout(T) });
    const text = await r.text();
    let body; try { body = JSON.parse(text); } catch { body = text.slice(0, 300); }
    return { status: r.status, ms: Date.now() - t0, body };
  } catch (e) { return { error: String(e?.cause?.code || e?.message || e), ms: Date.now() - t0 }; }
}
const post = (url, b, h = {}) => j(url, { method: "POST", headers: { "Content-Type": "application/json", ...h }, body: JSON.stringify(b) });
const vk = (v) => String(v || "").split(/[^\d]+/).filter(Boolean).map(Number);
const cmp = (a, b) => { const x = vk(a.version), y = vk(b.version); for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (y[i] ?? 0) - (x[i] ?? 0); return 0; };
const short = (r) => r.error ? { error: r.error, ms: r.ms } : { http: r.status, ms: r.ms, status: r.body?.status, signal: r.body?.signal, out: String(r.body?.program_output ?? "").slice(0, 120), err: String(r.body?.program_error ?? "").slice(0, 200), cmsg: String(r.body?.compiler_message ?? "").slice(0, 300) };

// 1) Wandbox
const list = await j("https://wandbox.org/api/list.json");
out.wandboxList = { status: list.status, ms: list.ms, error: list.error, count: Array.isArray(list.body) ? list.body.length : null };
out.wandbox = {};
if (Array.isArray(list.body)) {
  for (const [lang, code] of Object.entries(progs)) {
    const all = list.body.filter((c) => c.language === lang).sort(cmp);
    const res = { compilers: all.map((c) => `${c.name} (${c.version})`), tries: [] };
    const stable = all.filter((c) => !/head|dev|snapshot/i.test(`${c.name} ${c.version}`));
    for (const c of (stable.length ? stable : all).slice(0, 4)) {
      const r = await post("https://wandbox.org/api/compile.json", { compiler: c.name, code, stdin: "abc\n", save: false });
      res.tries.push({ compiler: c.name, cmd: c["display-compile-command"], ...short(r) });
    }
    out.wandbox[lang] = res;
  }
  const javas = list.body.filter((c) => c.language === "Java").sort(cmp).slice(0, 3);
  out.javaVariants = {};
  for (const c of javas) for (const [k, code] of Object.entries(javaVariants)) {
    out.javaVariants[`${c.name}/${k}`] = short(await post("https://wandbox.org/api/compile.json", { compiler: c.name, code, save: false }));
  }
}
// 2) Diğer servisler
out.piston = await j("https://emkc.org/api/v2/piston/runtimes").then((r) => ({ status: r.status, error: r.error, count: Array.isArray(r.body) ? r.body.length : null, body: Array.isArray(r.body) ? undefined : r.body }));
out.pistonRun = await post("https://emkc.org/api/v2/piston/execute", { language: "c", version: "*", files: [{ content: progs.C }] }).then((r) => ({ status: r.status, error: r.error, body: r.body }));
out.judge0 = await j("https://ce.judge0.com/languages").then((r) => ({ status: r.status, error: r.error, count: Array.isArray(r.body) ? r.body.length : null }));
out.judge0Run = await post("https://ce.judge0.com/submissions?wait=true&base64_encoded=false", { language_id: 50, source_code: progs.C, stdin: "abc\n" }).then((r) => ({ status: r.status, error: r.error, body: r.body }));
const pz = await post("https://api.paiza.io/runners/create", { source_code: progs.C, language: "c", input: "abc\n", api_key: "guest" });
out.paizaCreate = { status: pz.status, error: pz.error, body: pz.body };
if (pz.body?.id) {
  await new Promise((r) => setTimeout(r, 4000));
  out.paizaDetails = await j(`https://api.paiza.io/runners/get_details?id=${pz.body.id}&api_key=guest`).then((r) => ({ status: r.status, body: r.body }));
}
out.godbolt = await j("https://godbolt.org/api/languages", { headers: { Accept: "application/json" } }).then((r) => ({ status: r.status, error: r.error, count: Array.isArray(r.body) ? r.body.length : null }));
out.codapi = await post("https://api.codapi.org/v1/exec", { sandbox: "python", command: "run", files: { "": "print(1)" } }).then((r) => ({ status: r.status, error: r.error, body: r.body }));
console.log(JSON.stringify(out, null, 1));
