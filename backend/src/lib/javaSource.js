// Derleme servisleri Java kodunu sabit bir dosya adıyla (ör. prog.java) derler; Java da public sınıfın
// adının dosya adıyla aynı olmasını ister. Öğrenci sınıfına istediği adı verebilsin diye en dıştaki
// tiplerden "public" kaldırılır ve gerekirse servisin beklediği adla ana sınıfı çağıran küçük bir sınıf eklenir.

/** Kodu yorum, metin ve karakter sabitleri dışında kalan parçalarıyla gezer; her parça için derinliği verir. */
function scan(code, onCode) {
  let depth = 0;
  let i = 0;
  while (i < code.length) {
    const c = code[i];
    const next = code[i + 1];
    if (c === "/" && next === "/") {
      const end = code.indexOf("\n", i);
      i = end === -1 ? code.length : end;
    } else if (c === "/" && next === "*") {
      const end = code.indexOf("*/", i + 2);
      i = end === -1 ? code.length : end + 2;
    } else if (code.startsWith('"""', i)) {
      const end = code.indexOf('"""', i + 3);
      i = end === -1 ? code.length : end + 3;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < code.length && code[j] !== c && code[j] !== "\n") j += code[j] === "\\" ? 2 : 1;
      i = j + 1;
    } else {
      if (c === "{") depth++;
      else if (c === "}") depth = Math.max(0, depth - 1);
      else onCode(i, depth);
      i++;
    }
  }
}

const TYPE_DECL = /^public((?:\s+(?:final|abstract|sealed|non-sealed|static|strictfp))*\s+(?:class|interface|enum|record|@interface)\s+([A-Za-z_$][\w$]*))/;
const WORD = /[\w$]/;

/** En dıştaki tiplerin adları, "public" sözcüklerinin yerleri ve hangi tipin main içerdiği. */
function topLevelTypes(code) {
  const types = [];
  const publics = [];
  let current = null;
  scan(code, (i, depth) => {
    if (depth === 0) {
      if (code[i] === "p" && !WORD.test(code[i - 1] || "")) {
        const m = TYPE_DECL.exec(code.slice(i, i + 200));
        if (m) publics.push(i);
      }
      if (/[cier@]/.test(code[i]) && !WORD.test(code[i - 1] || "")) {
        const m = /^(?:class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/.exec(code.slice(i, i + 120));
        if (m) {
          current = { name: m[1], kind: m[0].split(/\s/)[0], hasMain: false };
          types.push(current);
        }
      }
    } else if (depth === 1 && current && code.startsWith("main", i) && !WORD.test(code[i - 1]) && !WORD.test(code[i + 4] || "")) {
      // "static void main(" kalıbı: önündeki kısa parçada static ve void geçmeli.
      const before = code.slice(Math.max(0, i - 80), i);
      if (/\bstatic\b[^;{}]*\bvoid\s+$/.test(before) && /^main\s*\(/.test(code.slice(i, i + 20))) current.hasMain = true;
    }
  });
  return { types, publics };
}

/**
 * Java kodunu verilen dosya/sınıf adına uygun hale getirir.
 * @param {string} code öğrencinin kodu
 * @param {string} entry servisin çalıştırdığı sınıf adı (dosya adı da bu)
 */
export function prepareJava(code, entry) {
  const { types, publics } = topLevelTypes(code);
  if (!types.length) return code;
  let out = code;
  for (const at of [...publics].reverse()) out = out.slice(0, at) + out.slice(at + "public".length);
  if (types.some((t) => t.name === entry)) return out;
  const main = types.find((t) => t.hasMain && t.kind !== "interface") || types.find((t) => t.hasMain);
  if (!main) return out;
  return `${out.replace(/\s*$/, "\n")}\nclass ${entry} { public static void main(String[] args) throws Exception { ${main.name}.main(args); } }\n`;
}
