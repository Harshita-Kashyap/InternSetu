import { ART, ART_ANIM, iconFor } from "../src/illustrations";

describe("illustrations", () => {
  it("has the same scenes in the static and animated sets; only the animated one has CSS", () => {
    expect(Object.keys(ART).sort()).toEqual(Object.keys(ART_ANIM).sort());
    expect(Object.keys(ART)).toHaveLength(9);
    for (const k of Object.keys(ART) as (keyof typeof ART)[]) {
      expect(ART[k]).toMatch(/^<svg /);
      expect(ART[k]).not.toContain("<style>");
      expect(ART_ANIM[k]).toContain("prefers-reduced-motion");
    }
  });
  it("picks an icon for each education level", () => {
    expect(iconFor("Class 10")).toBe("📘");
    expect(iconFor("Class 12")).toBe("🎒");
    expect(iconFor("ITI")).toBe("🔧");
    expect(iconFor("Diploma")).toBe("📜");
    expect(iconFor("Postgraduate")).toBe("🎓");
    expect(iconFor("Undergraduate")).toBe("🎓");
    expect(iconFor("something else")).toBe("📘");
  });
});
