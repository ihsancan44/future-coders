import { StreamLanguage } from "@codemirror/language";

const legacy = (load) => async () => StreamLanguage.define(await load());

/** Editörün renklendirmesi; dil paketleri sadece seçilince indirilir. */
const loaders = {
  javascript: async () => (await import("@codemirror/lang-javascript")).javascript(),
  typescript: async () => (await import("@codemirror/lang-javascript")).javascript({ typescript: true }),
  python: async () => (await import("@codemirror/lang-python")).python(),
  html: async () => (await import("@codemirror/lang-html")).html(),
  sql: async () => (await import("@codemirror/lang-sql")).sql(),
  cpp: async () => (await import("@codemirror/lang-cpp")).cpp(),
  java: async () => (await import("@codemirror/lang-java")).java(),
  php: async () => (await import("@codemirror/lang-php")).php(),
  rust: async () => (await import("@codemirror/lang-rust")).rust(),
  go: async () => (await import("@codemirror/lang-go")).go(),
  csharp: legacy(async () => (await import("@codemirror/legacy-modes/mode/clike")).csharp),
  scala: legacy(async () => (await import("@codemirror/legacy-modes/mode/clike")).scala),
  swift: legacy(async () => (await import("@codemirror/legacy-modes/mode/swift")).swift),
  ruby: legacy(async () => (await import("@codemirror/legacy-modes/mode/ruby")).ruby),
  haskell: legacy(async () => (await import("@codemirror/legacy-modes/mode/haskell")).haskell),
  lua: legacy(async () => (await import("@codemirror/legacy-modes/mode/lua")).lua),
  perl: legacy(async () => (await import("@codemirror/legacy-modes/mode/perl")).perl),
  r: legacy(async () => (await import("@codemirror/legacy-modes/mode/r")).r),
  julia: legacy(async () => (await import("@codemirror/legacy-modes/mode/julia")).julia),
  erlang: legacy(async () => (await import("@codemirror/legacy-modes/mode/erlang")).erlang),
  ocaml: legacy(async () => (await import("@codemirror/legacy-modes/mode/mllike")).oCaml),
  pascal: legacy(async () => (await import("@codemirror/legacy-modes/mode/pascal")).pascal),
  shell: legacy(async () => (await import("@codemirror/legacy-modes/mode/shell")).shell),
};

export async function editorLanguage(name) {
  const load = loaders[name];
  if (!load) return [];
  try {
    return [await load()];
  } catch {
    return []; // renklendirme yüklenemezse editör düz metinle çalışır
  }
}
