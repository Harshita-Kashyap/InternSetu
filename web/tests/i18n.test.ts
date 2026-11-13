import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import hi from "../messages/hi.json";
import mr from "../messages/mr.json";
import bn from "../messages/bn.json";

// same rule as i18n/useT.ts (kept local so this test needs no React/next-intl)
const uiKey = (s: string) => {
  let x = s.replace(/:/g, " colon ");
  if (x.startsWith(" ")) x = "sp " + x;
  if (x.endsWith(" ")) x = x + " sp";
  return x.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "x";
};
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? (f === "node_modules" ? [] : walk(p)) : /\.tsx?$/.test(f) ? [p] : [];
});
const files = walk("app");

describe("translations", () => {
  const ui = { en: en.UI as Record<string, string>, hi: hi.UI as Record<string, string>, mr: mr.UI as Record<string, string>, bn: bn.UI as Record<string, string> };

  it("every tr(\"…\") string in the source exists in en, hi and mr", () => {
    const missing: string[] = [];
    for (const f of files) {
      for (const m of readFileSync(f, "utf8").matchAll(/\btr\("((?:[^"\\]|\\.)*)"\)/g)) {
        const k = uiKey(m[1].replace(/\\"/g, '"'));
        for (const l of ["en", "hi", "mr"] as const) if (!ui[l][k]) missing.push(`${l}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
  it("hi and mr have exactly the same UI keys as en", () => {
    expect(Object.keys(ui.hi).sort()).toEqual(Object.keys(ui.en).sort());
    expect(Object.keys(ui.mr).sort()).toEqual(Object.keys(ui.en).sort());
  });
  it("bn (partly translated, English fallback) has every en key, no empty values, same {placeholders}", () => {
    expect(Object.keys(ui.bn).sort()).toEqual(Object.keys(ui.en).sort());
    expect(Object.entries(ui.bn).filter(([, v]) => !String(v).trim())).toEqual([]);
    const ph = (t: string) => (t.match(/\{\w+\}/g) ?? []).sort();
    expect(Object.keys(ui.en).filter((k) => JSON.stringify(ph(ui.bn[k])) !== JSON.stringify(ph(ui.en[k])))).toEqual([]);
  });
  it("no translation is empty", () => {
    for (const l of ["hi", "mr"] as const) expect(Object.entries(ui[l]).filter(([, v]) => !String(v).trim())).toEqual([]);
  });
});

describe("language persistence", () => {
  it("pages use the locale-aware navigation, never plain next/link or next/navigation hooks", () => {
    const bad = files.filter((f) => {
      const s = readFileSync(f, "utf8");
      return /from "next\/link"/.test(s) || /import \{[^}]*\b(useRouter|usePathname|redirect)\b[^}]*\} from "next\/navigation"/.test(s);
    });
    expect(bad).toEqual([]);
  });

  it("plain-language guard: no jargon words in English UI text (#16)", () => {
    const bad = Object.entries(en.UI as Record<string, string>).filter(([, v]) => /relocat|taxonom|mandatory/i.test(v));
    expect(bad).toEqual([]);
  });
});
