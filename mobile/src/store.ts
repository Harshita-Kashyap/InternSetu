import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, clearToken, ProfileUpdate } from "./api";
import { loadTax, resolveId } from "./taxo";

export type Profile = {
  education?: string; degree?: string; field?: string; college?: string;
  skills?: string[]; interests?: string[]; location?: string; preferredLocations?: string[]; relocate?: "nearby" | "selected" | "anywhere"; domains?: string[];
};

// Local cache only for fields the backend has no column for (college) and as an offline fallback.
const PROFILE_KEY = "internsetu_profile";

export async function loadProfile(): Promise<Profile> {
  try { return JSON.parse((await AsyncStorage.getItem(PROFILE_KEY)) || "{}"); } catch { return {}; }
}
export async function saveProfile(patch: Partial<Profile>) {
  const cur = await loadProfile();
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify({ ...cur, ...patch }));
}
export async function endSession() {
  await clearToken();
  await AsyncStorage.removeItem(PROFILE_KEY);
}

type Named = { id: string; name: string }[];
const nameOf = (items: Named, id?: string | null) => items.find((i) => i.id === id)?.name;
const namesOf = (items: Named, ids: string[]) => ids.map((i) => nameOf(items, i)).filter(Boolean) as string[];
const idsOf = (items: Named, names: string[]) => names.map((n) => items.find((i) => i.name === n)?.id).filter(Boolean) as string[];

/** Server profile (ids) -> UI profile (names), merged with local-only fields. */
export async function loadProfileRemote(): Promise<Profile> {
  const local = await loadProfile();
  try {
    const [p, edu, deg, fos, sk, int, sec, city] = await Promise.all([
      api.getProfile(), loadTax("education_level"), loadTax("degree"), loadTax("field_of_study"),
      loadTax("skill"), loadTax("interest"), loadTax("sector"), loadTax("city"),
    ]);
    const others = p.preferred_location_ids.filter((id) => id !== p.home_location_id);
    return {
      ...local,
      education: nameOf(edu, p.education_level_id) ?? local.education, degree: nameOf(deg, p.degree_id) ?? local.degree, field: nameOf(fos, p.field_of_study_id) ?? local.field,
      skills: namesOf(sk, p.skill_ids), interests: namesOf(int, p.interest_ids), domains: namesOf(sec, p.preferred_sector_ids),
      location: nameOf(city, p.home_location_id) ?? local.location,
      preferredLocations: namesOf(city, others),
      relocate: !p.home_location_id ? undefined : p.willing_to_relocate ? "anywhere" : others.length ? "selected" : "nearby",
    };
  } catch { return local; }
}

/** UI profile (names) -> PATCH /me/profile (ids). Throws Error with a user-facing message. */
export async function saveProfileRemote(patch: Partial<Profile>) {
  const u: ProfileUpdate = {};
  if (patch.education) { const [id] = idsOf(await loadTax("education_level"), [patch.education]); if (id) u.education_level_id = id; }
  if (patch.degree) { const id = await resolveId("degree", patch.degree); if (!id) throw new Error(`We could not match "${patch.degree}". Try a common name like B.Tech or B.Com.`); u.degree_id = id; }
  if (patch.field) { const id = await resolveId("field_of_study", patch.field); if (!id) throw new Error(`We could not match "${patch.field}". Try a common name like Computer Science.`); u.field_of_study_id = id; }
  if (patch.skills) u.skill_ids = idsOf(await loadTax("skill"), patch.skills);
  if (patch.interests) u.interest_ids = idsOf(await loadTax("interest"), patch.interests);
  if (patch.domains) u.preferred_sector_ids = idsOf(await loadTax("sector"), patch.domains);
  if (patch.location) {
    const cities = await loadTax("city");
    const [home] = idsOf(cities, [patch.location]);
    if (home) {
      u.home_location_id = home;
      const mode = patch.relocate ?? "nearby";
      const extra = mode === "nearby" ? [] : idsOf(cities, patch.preferredLocations ?? []).filter((id) => id !== home);
      u.preferred_location_ids = [home, ...extra];   // matching: preferred cities
      u.willing_to_relocate = mode === "anywhere";    // matching: open to relocate
      u.willing_to_travel = mode !== "nearby";
    }
  }
  if (Object.keys(u).length) await api.updateProfile(u);
  await saveProfile(patch);
}
