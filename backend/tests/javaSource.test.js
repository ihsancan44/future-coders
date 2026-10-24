import { describe, expect, it } from "vitest";
import { prepareJava } from "../src/lib/javaSource.js";

describe("Java kaynağı", () => {
  it("sınıf adı serbest: public kaldırılır, servis adıyla çağıran sınıf eklenir", () => {
    const out = prepareJava(`public class Main {\n  public static void main(String[] args) {\n    System.out.println("public class X {");\n  }\n  public static class Ic {}\n}\n`, "prog");
    expect(out).not.toMatch(/^public class Main/m);
    expect(out).toContain(`"public class X {"`);
    expect(out).toContain("public static class Ic");
    expect(out).toMatch(/class prog \{ public static void main\(String\[\] args\) throws Exception \{ Main\.main\(args\); \} \}/);
  });

  it("yorumlardaki ve yardımcı sınıflardaki adlara aldanmaz", () => {
    const out = prepareJava(`// public class Yorum\nclass Yardimci {}\npublic final class Uygulama {\n  public static void main(String... a) {}\n}\n`, "prog");
    expect(out).toContain("Uygulama.main(args)");
    expect(out).toContain("// public class Yorum");
  });

  it("sınıf zaten doğru adlıysa ek sınıf eklemez; satır numaraları değişmez", () => {
    const code = `public class prog {\n  public static void main(String[] a) {}\n}\n`;
    const out = prepareJava(code, "prog");
    expect(out).not.toContain("throws Exception");
    expect(out.split("\n").length).toBe(code.split("\n").length);
  });
});
