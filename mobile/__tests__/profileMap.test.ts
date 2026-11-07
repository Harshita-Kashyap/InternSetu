import { findId, idOrOther } from "../src/profileMap";

const degrees = [{ id: "DEG-BTECH", name: "B.Tech" }, { id: "DEG-BSC", name: "B.Sc" }];

describe("findId", () => {
  it("matches names case-insensitively and ignores outer spaces", () => {
    expect(findId(degrees, "  b.tech ")).toBe("DEG-BTECH");
  });
  it("never guesses: near matches and empty text give undefined", () => {
    expect(findId(degrees, "B.Tec")).toBeUndefined();
    expect(findId(degrees, "")).toBeUndefined();
    expect(findId(degrees, undefined)).toBeUndefined();
  });
});

describe("idOrOther", () => {
  it("listed value -> id and clears the free text", () => {
    expect(idOrOther(degrees, "B.Sc", "degree_id", "degree_other")).toEqual({ degree_id: "DEG-BSC", degree_other: null });
  });
  it("unlisted value -> cleaned free text and clears the id", () => {
    expect(idOrOther(degrees, "  B.Voc    Animation ", "degree_id", "degree_other")).toEqual({ degree_id: null, degree_other: "B.Voc Animation" });
  });
  it("blank input sends nothing", () => {
    expect(idOrOther(degrees, "   ", "degree_id", "degree_other")).toEqual({});
  });
});
