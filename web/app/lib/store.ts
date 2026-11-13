import { api, clearToken, ProfileUpdate } from "./api";
import { loadTax } from "./taxo";
import { findId, idOrOther, nameOf } from "./profileMap";

export type Profile = {
  education?: string; degree?: string; field?: string; college?: string;
  skills?: string[]; location?: string; preferredLocations?: string[]; relocate?: "nearby" | "selected" | "anywhere"; domains?: string[];
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

const namesOf = (items: { id: string; name: string }[], ids: string[]) => ids.map((i) => nameOf(items, i)).filter(Boolean) as string[];
const idsOf = (items: { id: string; name: string }[], names: string[]) =>
  names.map((n) => items.find((i) => i.name === n)?.id).filter(Boolean) as string[];

/** Server profile (ids) -> UI profile (names), plus local-only fields. */
export async function loadProfileRemote(): Promise<Profile> {
  const local = loadProfile();
  try {
    const [p, edu, deg, fos, sk, sec, city] = await Promise.all([
      api.getProfile(), loadTax("education_level"), loadTax("degree"), loadTax("field_of_study"),
      loadTax("skill"), loadTax("sector"), loadTax("city"),
    ]);
    const others = p.preferred_location_ids.filter((id) => id !== p.home_location_id);
    return {
      ...local,
      education: nameOf(edu, p.education_level_id), degree: nameOf(deg, p.degree_id) ?? p.degree_other ?? undefined, field: nameOf(fos, p.field_of_study_id) ?? p.field_of_study_other ?? undefined,
      skills: namesOf(sk, p.skill_ids), domains: namesOf(sec, p.preferred_sector_ids),
      location: nameOf(city, p.home_location_id) ?? p.home_location_other ?? undefined,
      preferredLocations: namesOf(city, others),
      relocate: !(p.home_location_id || p.home_location_other) ? undefined : p.willing_to_relocate ? "anywhere" : others.length ? "selected" : "nearby",
    };
  } catch { return local; }
}

/** UI profile (names) -> PATCH /me/profile (ids). Throws Error with a user-facing message. */
export async function saveProfileRemote(patch: Partial<Profile>) {
  const u: ProfileUpdate = {};
  if (patch.education) { const m = idsOf(await loadTax("education_level"), [patch.education]); if (m[0]) u.education_level_id = m[0]; }
  if (patch.degree) Object.assign(u, idOrOther(await loadTax("degree"), patch.degree, "degree_id", "degree_other"));
  if (patch.field) Object.assign(u, idOrOther(await loadTax("field_of_study"), patch.field, "field_of_study_id", "field_of_study_other"));
  if (patch.skills) u.skill_ids = idsOf(await loadTax("skill"), patch.skills);
  if (patch.domains) u.preferred_sector_ids = idsOf(await loadTax("sector"), patch.domains);
  if (patch.location) {
    const cities = await loadTax("city");
    Object.assign(u, idOrOther(cities, patch.location, "home_location_id", "home_location_other"));
    const home = findId(cities, patch.location);               // typed city: no id, no "home" credit, still never a gate
    const mode = patch.relocate ?? "nearby";
    const extra = mode === "nearby" ? [] : idsOf(cities, patch.preferredLocations ?? []).filter((id) => id !== home);
    u.preferred_location_ids = home ? [home, ...extra] : extra; // matching uses these as "preferred cities"
    u.willing_to_relocate = mode === "anywhere";               // matching uses this as "open to relocate"
    u.willing_to_travel = mode !== "nearby";
  }
  if (Object.keys(u).length) await api.updateProfile(u);
  saveProfile(patch);
}

// Consent now lives on the server (api.consent / api.giveConsent / api.withdrawConsent).
