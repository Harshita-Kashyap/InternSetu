import { beforeEach, describe, expect, it, vi } from "vitest";

const { taxo, patch } = vi.hoisted(() => ({ taxo: {} as Record<string, { id: string; name: string }[]>, patch: vi.fn() }));
Object.assign(taxo, {
  education_level: [{ id: "EDU-12", name: "Class 12" }],
  degree: [{ id: "D1", name: "B.Sc" }],
  field_of_study: [{ id: "F1", name: "Physics" }],
  skill: [{ id: "S1", name: "Excel" }, { id: "S2", name: "SQL" }],
  sector: [{ id: "SEC1", name: "IT" }],
  city: [{ id: "C1", name: "Indore" }, { id: "C2", name: "Bhopal" }],
});
vi.mock("../app/lib/api", async (orig) => {
  const real = await orig<typeof import("../app/lib/api")>();
  return {
    ...real,
    api: {
      taxonomy: vi.fn(async (type: string) => taxo[type] ?? []),
      normalize: vi.fn(async (_t: string, text: string) => (text === "excell" ? { entry: { id: "S1", name: "Excel" } } : { entry: null, suggestion: null })),
      getProfile: vi.fn(async () => ({ status: "draft", missing_fields: [], education_level_id: "EDU-12", degree_id: "D1", field_of_study_id: null, field_of_study_other: "Aerospace",
        year_of_completion: null, skill_ids: ["S1", "S2"], preferred_role_ids: [], preferred_sector_ids: ["SEC1"], home_location_id: "C1", preferred_location_ids: ["C1", "C2"],
        willing_to_relocate: false, willing_to_travel: true, duration_preference: null, stipend_expectation: null })),
      updateProfile: patch,
    },
  };
});

import { loadProfileRemote, saveProfileRemote } from "../app/lib/store";
import { resolveId } from "../app/lib/taxo";

describe("profile <-> server mapping", () => {
  beforeEach(() => { localStorage.clear(); patch.mockReset(); patch.mockResolvedValue({}); });

  it("turns server ids into the names shown on screen", async () => {
    const p = await loadProfileRemote();
    expect(p.education).toBe("Class 12");
    expect(p.degree).toBe("B.Sc");
    expect(p.field).toBe("Aerospace");              // free-text 'Other' value is kept
    expect(p.skills).toEqual(["Excel", "SQL"]);
    expect(p.location).toBe("Indore");
    expect(p.preferredLocations).toEqual(["Bhopal"]);
  });

  it("turns names back into ids when saving", async () => {
    await saveProfileRemote({ education: "Class 12", skills: ["SQL", "Unknown"], domains: ["IT"] });
    const sent = patch.mock.calls[0][0];
    expect(sent.education_level_id).toBe("EDU-12");
    expect(sent.skill_ids).toEqual(["S2"]);          // unknown names are dropped, not sent
    expect(sent.preferred_sector_ids).toEqual(["SEC1"]);
  });

  it("resolveId finds a name exactly, else asks the backend, else returns null", async () => {
    expect(await resolveId("skill", " excel ")).toBe("S1");
    expect(await resolveId("skill", "excell")).toBe("S1");
    expect(await resolveId("skill", "zzz")).toBeNull();
    expect(await resolveId("skill", "   ")).toBeNull();
  });
});
