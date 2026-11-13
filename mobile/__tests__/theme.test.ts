import { fonts, setFontScript } from "../src/theme";

describe("font family follows the app language", () => {
  afterEach(() => setFontScript("en"));
  it("uses Plus Jakarta Sans for English", () => {
    expect(fonts.body).toBe("PlusJakartaSans_400Regular");
    expect(fonts.headXL).toBe("PlusJakartaSans_800ExtraBold");
  });
  it("uses Noto Sans Devanagari for Hindi and Marathi", () => {
    for (const lang of ["hi", "mr"]) {
      setFontScript(lang);
      expect(fonts.body).toBe("NotoSansDevanagari_400Regular");
      expect(fonts.bold).toBe("NotoSansDevanagari_700Bold");
    }
  });
  it("uses Noto Sans Bengali for Bengali and returns to English", () => {
    setFontScript("bn");
    expect(fonts.medium).toBe("NotoSansBengali_500Medium");
    setFontScript("en");
    expect(fonts.medium).toBe("PlusJakartaSans_500Medium");
  });
});
