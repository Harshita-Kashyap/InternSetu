import { api, clearToken, ProfileUpdate } from "./api";
import { loadTax, resolveId } from "./taxo";

export type Profile = {
  education?: string; degree?: string; field?: string; college?: string;
  skills?: string[]; interests?: string[]; location?: string; preferredLocations?: string[]; relocate?: "nearby" | "selected" | "anywhere"; domains?: string[];
};

// Local cache only for things the backend has no field for (college, workMode) and as an offline fallback.
const PROFILE_KEY = "internsetu_profile";
const SESSION_KEY = "internsetu_session";

export function loadProfile(): Profile {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}"); } catch { return {}; }
}
export function saveProfile(patch: Partial<Profile>) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...loadProfile(), ...patch })); } catch {}
}
export function startSession(username: string) { try { localStorage.setItem(SESSION_KEY, username); } catch {} }
export function getSession(): string { try { return localStorage.getItem(SESSION_KEY) || ""; } catch { return ""; } }
export function endSession() {
  clearToken();
  try { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(PROFILE_KEY); } catch {}
}

const nameOf = (items: { id: string; name: string }[], id?: string | null) => items.find((i) => i.id === id)?.name;
const namesOf = (items: { id: string; name: string }[], ids: string[]) => ids.map((i) => nameOf(items, i)).filter(Boolean) as string[];
const idsOf = (items: { id: string; name: string }[], names: string[]) =>
  names.map((n) => items.find((i) => i.name === n)?.id).filter(Boolean) as string[];

/** Server profile (ids) -> UI profile (names), plus local-only fields. */
export async function loadProfileRemote(): Promise<Profile> {
  const local = loadProfile();
  try {
    const [p, edu, deg, fos, sk, int, sec, city] = await Promise.all([
      api.getProfile(), loadTax("education_level"), loadTax("degree"), loadTax("field_of_study"),
      loadTax("skill"), loadTax("interest"), loadTax("sector"), loadTax("city"),
    ]);
    const others = p.preferred_location_ids.filter((id) => id !== p.home_location_id);
    return {
      ...local,
      education: nameOf(edu, p.education_level_id), degree: nameOf(deg, p.degree_id), field: nameOf(fos, p.field_of_study_id),
      skills: namesOf(sk, p.skill_ids), interests: namesOf(int, p.interest_ids), domains: namesOf(sec, p.preferred_sector_ids),
      location: nameOf(city, p.home_location_id),
      preferredLocations: namesOf(city, others),
      relocate: !p.home_location_id ? undefined : p.willing_to_relocate ? "anywhere" : others.length ? "selected" : "nearby",
    };
  } catch { return local; }
}

/** UI profile (names) -> PATCH /me/profile (ids). Throws Error with a user-facing message. */
export async function saveProfileRemote(patch: Partial<Profile>) {
  const u: ProfileUpdate = {};
  if (patch.education) { const m = idsOf(await loadTax("education_level"), [patch.education]); if (m[0]) u.education_level_id = m[0]; }
  if (patch.degree) { const id = await resolveId("degree", patch.degree); if (!id) throw new Error(`We could not match "${patch.degree}". Please pick a degree from the suggestions.`); u.degree_id = id; }
  if (patch.field) { const id = await resolveId("field_of_study", patch.field); if (!id) throw new Error(`We could not match "${patch.field}". Please pick a field from the suggestions.`); u.field_of_study_id = id; }
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
      u.preferred_location_ids = [home, ...extra];          // matching uses these as "preferred cities"
      u.willing_to_relocate = mode === "anywhere";           // matching uses this as "open to relocate"
      u.willing_to_travel = mode !== "nearby";
    }
  }
  if (Object.keys(u).length) await api.updateProfile(u);
  saveProfile(patch);
}

// Consent now lives on the server (api.consent / api.giveConsent / api.withdrawConsent).
