import AsyncStorage from "@react-native-async-storage/async-storage";

const taxo: Record<string, { id: string; name: string }[]> = {
  education_level: [{ id: "EDU-12", name: "Class 12" }], degree: [{ id: "D1", name: "B.Sc" }], field_of_study: [{ id: "F1", name: "Physics" }],
  skill: [{ id: "S1", name: "Excel" }, { id: "S2", name: "SQL" }], sector: [{ id: "SEC1", name: "IT" }], city: [{ id: "C1", name: "Indore" }, { id: "C2", name: "Bhopal" }],
};
const mockUpdate = jest.fn();
jest.mock("../src/api", () => {
  const real = jest.requireActual("../src/api");
  return {
    ...real,
    api: {
      taxonomy: jest.fn(async (t: string) => taxo[t] ?? []),
      normalize: jest.fn(async (_t: string, text: string) => (text === "excell" ? { entry: { id: "S1" } } : { entry: null, suggestion: null })),
      getProfile: jest.fn(async () => ({ status: "draft", missing_fields: [], education_level_id: "EDU-12", degree_id: "D1", field_of_study_id: "F1", year_of_completion: null,
        skill_ids: ["S1", "S2"], preferred_role_ids: [], preferred_sector_ids: ["SEC1"], home_location_id: "C1", preferred_location_ids: ["C1", "C2"],
        willing_to_relocate: false, willing_to_travel: true, duration_preference: null, stipend_expectation: null })),
      updateProfile: (...a: unknown[]) => mockUpdate(...a),
    },
  };
});

import { endSession, loadProfile, loadProfileRemote, saveProfile, saveProfileRemote } from "../src/store";
import { resolveId } from "../src/taxo";
import { getToken, setToken } from "../src/api";

describe("local profile", () => {
  beforeEach(() => AsyncStorage.clear());
  it("merges saved fields and survives corrupt data", async () => {
    await saveProfile({ education: "Class 12" });
    await saveProfile({ skills: ["Excel"] });
    expect(await loadProfile()).toEqual({ education: "Class 12", skills: ["Excel"] });
    await AsyncStorage.setItem("internsetu_profile", "oops");
    expect(await loadProfile()).toEqual({});
  });
  it("endSession removes the token and the local profile", async () => {
    await setToken("t"); await saveProfile({ degree: "BA" });
    await endSession();
    expect(await getToken()).toBeNull();
    expect(await loadProfile()).toEqual({});
  });
});

describe("server profile mapping", () => {
  beforeEach(() => { AsyncStorage.clear(); mockUpdate.mockReset(); mockUpdate.mockResolvedValue({}); });
  it("turns ids into names", async () => {
    const p = await loadProfileRemote();
    expect(p).toMatchObject({ education: "Class 12", degree: "B.Sc", field: "Physics", skills: ["Excel", "SQL"], location: "Indore", domains: ["IT"] });
  });
  it("turns names into ids and drops unknown names", async () => {
    await saveProfileRemote({ education: "Class 12", skills: ["SQL", "Unknown"], domains: ["IT"] });
    const sent = mockUpdate.mock.calls[0][0];
    expect(sent.education_level_id).toBe("EDU-12");
    expect(sent.skill_ids).toEqual(["S2"]);
  });
  it("resolveId matches exact names, asks the backend for near matches, else null", async () => {
    expect(await resolveId("skill", " excel ")).toBe("S1");
    expect(await resolveId("skill", "excell")).toBe("S1");
    expect(await resolveId("skill", "zzz")).toBeNull();
    expect(await resolveId("skill", "  ")).toBeNull();
  });
});
