import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { dicts } from "../src/i18n";

const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
const files = [...walk("src"), "App.tsx"];

describe("translations", () => {
  it('every t("...") string used in the app exists in Hindi and Marathi', () => {
    const missing: string[] = [];
    for (const f of files) {
      for (const m of readFileSync(f, "utf8").matchAll(/\bt\("((?:[^"\\]|\\.)*)"\)/g)) {
        const s = m[1].replace(/\\"/g, '"');
        for (const l of ["hi", "mr"] as const) if (!dicts[l][s]) missing.push(`${l}: ${s}`);
      }
    }
    expect(missing).toEqual([]);
  });
  it("no translation is empty", () => {
    for (const l of ["hi", "mr"] as const) {
      expect(Object.entries(dicts[l]).filter(([, v]) => !String(v).trim())).toEqual([]);
    }
  });
});
