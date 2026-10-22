/**
 * InternSetu API client - ONE file for both the Next.js web app and the Expo mobile app.
 * Copy it to  web: app/lib/api.ts   mobile: src/api.ts
 * It uses only fetch(), so it works in both. You pass in where the token is stored.
 *
 *   // web (localStorage)                       // mobile (expo-secure-store)
 *   const storage = {                            const storage = {
 *     get: () => localStorage.getItem("t"),        get: () => SecureStore.getItemAsync("t"),
 *     set: (t) => t ? localStorage.setItem("t", t) : localStorage.removeItem("t"),
 *   };                                              set: (t) => t ? SecureStore.setItemAsync("t", t) : SecureStore.deleteItemAsync("t"),
 *                                                 };
 *   export const api = createApi({ baseUrl: process.env.NEXT_PUBLIC_API_URL!, storage, onUnauthorized: () => router.push("/") });
 *   (mobile: baseUrl: process.env.EXPO_PUBLIC_API_URL!)
 */

// ----------------------------------------------------------------------------- types
export interface User { id: number; full_name: string; email: string | null; mobile: string | null; role: "candidate" | "admin"; preferred_language: "en" | "hi" | "mr"; created_at: string }
export interface TokenResponse { access_token: string; token_type: "bearer"; expires_in: number; user: User }
export interface TaxonomyItem { id: string; name: string; parent_id: string | null; order_rank: number | null; latitude: number | null; longitude: number | null }
export type TaxonomyType = "education_level" | "degree" | "field_of_study" | "skill_category" | "skill" | "sector" | "role_domain" | "role" | "interest" | "state" | "city";
export interface ConsentStatus { has_active_consent: boolean; current_version: string; records: { id: number; purpose: string; version: string; given_at: string; withdrawn_at: string | null }[] }

export interface Profile {
  status: "draft" | "complete"; missing_fields: string[];
  education_level_id: string | null; degree_id: string | null; field_of_study_id: string | null; year_of_completion: number | null;
  skill_ids: string[]; interest_ids: string[]; preferred_role_ids: string[]; preferred_sector_ids: string[];
  home_location_id: string | null; preferred_location_ids: string[];
  willing_to_relocate: boolean; willing_to_travel: boolean; duration_preference: string | null; stipend_expectation: number | null; updated_at: string;
}
export type ProfileUpdate = Partial<Omit<Profile, "status" | "missing_fields" | "updated_at">>;

export interface SkillGap { missing_mandatory: string[]; missing_preferred: string[]; related_skills: { missing: string; you_have: string[] }[]; missing_mandatory_ids: string[]; missing_preferred_ids: string[] }
export interface Recommendation {
  rank: number; internship_id: string; title: string; company_name: string; location: string; location_name: string; sector_name: string; role_name: string;
  duration: string | null; stipend_inr_per_month: number | null; ranking_score: number; match_percentage: number; low_match: boolean; match_tag: string | null;
  why_recommended: string[]; considerations: string[]; skill_gap: SkillGap; apply_url: string; is_demo_data: boolean;
}
export interface Nearest { internship_id: string; title: string; company_name: string; location_name: string; missing_mandatory_ids: string[]; missing_mandatory: string[]; education_gap_levels: number; reason: string }
export interface Recommendations {
  method: string; k: number; count: number; eligible_count: number; total_internships: number; message: string | null; is_demo_data: boolean; demo_notice: string | null; disclaimer: string;
  recommendations: Recommendation[]; skill_gap_summary: { skill_id: string; skill: string; count: number }[]; nearest: Nearest[];
}
export interface InternshipDetail {
  internship_id: string; title: string; company_name: string; description: string; location: string; location_name: string; sector_name: string; role_name: string;
  duration: string | null; stipend_inr_per_month: number | null; facilities: string[]; education_required: string | null;
  mandatory_skills: { id: string; name: string }[]; preferred_skills: { id: string; name: string }[]; apply_url: string; is_demo_data: boolean;
  eligible: boolean; match_percentage: number; low_match: boolean; match_tag: string | null; why_recommended: string[]; considerations: string[]; skill_gap: SkillGap; disclaimer: string;
}
export interface SavedItem { internship_id: string; title: string; company_name: string; location_name: string; duration: string | null; stipend_inr_per_month: number | null; is_demo_data: boolean; saved_at: string; eligible: boolean | null; match_percentage: number | null }

/** Every error from the API becomes one of these. Show your OWN translated text for `code`; use `fields` for inline errors. */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields: { field: string; message: string }[] = []) { super(message); }
  fieldMessage(field: string) { return this.fields.find((f) => f.field === field)?.message; }
}

export interface TokenStorage { get(): string | null | Promise<string | null>; set(token: string | null): void | Promise<void> }
export interface ApiOptions { baseUrl: string; storage: TokenStorage; onUnauthorized?: () => void }

// ----------------------------------------------------------------------------- client
export function createApi({ baseUrl, storage, onUnauthorized }: ApiOptions) {
  const root = baseUrl.replace(/\/$/, "");

  async function request<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = auth ? await storage.get() : null;
    if (token) headers.Authorization = `Bearer ${token}`;
    let res: Response;
    try {
      res = await fetch(`${root}/api/v1${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new ApiError(0, "network_error", "Cannot reach the server. Check your internet connection.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = data?.error ?? {};
      if (res.status === 401 && auth && ["token_expired", "invalid_token", "not_authenticated"].includes(e.code)) {
        await storage.set(null);
        onUnauthorized?.();
      }
      throw new ApiError(res.status, e.code ?? `http_${res.status}`, e.message ?? "Something went wrong.", e.fields ?? []);
    }
    return data as T;
  }
  const qs = (o: Record<string, string | number | undefined>) => {
    const p = Object.entries(o).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
    return p.length ? `?${p.join("&")}` : "";
  };
  const saveToken = async (t: TokenResponse) => { await storage.set(t.access_token); return t; };

  return {
    auth: {
      register: async (b: { full_name: string; email?: string; mobile?: string; password: string; consent: boolean; preferred_language?: string }) =>
        saveToken(await request<TokenResponse>("POST", "/auth/register", b, false)),
      login: async (identifier: string, password: string) => saveToken(await request<TokenResponse>("POST", "/auth/login", { identifier, password }, false)),
      logout: () => storage.set(null),
      me: () => request<User>("GET", "/auth/me"),
      changePassword: (current_password: string, new_password: string) => request<{ message: string }>("POST", "/auth/change-password", { current_password, new_password }),
      setLanguage: (preferred_language: "en" | "hi" | "mr") => request<User>("PATCH", "/me/settings", { preferred_language }),
    },
    taxonomy: {
      list: (type: TaxonomyType, o: { q?: string; parent?: string; limit?: number } = {}) => request<TaxonomyItem[]>("GET", `/taxonomy/${type}${qs(o)}`, undefined, false),
      durations: () => request<{ durations: string[] }>("GET", "/taxonomy/durations", undefined, false),
      /** "Other skill" box: maps typed text to the taxonomy or flags it for admin review. */
      normalize: (entry_type: "skill" | "interest" | "role" | "sector" | "field_of_study" | "degree", text: string) =>
        request<{ mapped: boolean; method: string; entry: TaxonomyItem | null; suggestion: TaxonomyItem | null; flagged: boolean }>("POST", "/taxonomy/normalize", { entry_type, text }),
    },
    consent: {
      status: () => request<ConsentStatus>("GET", "/me/consent"),
      give: () => request<ConsentStatus>("POST", "/me/consent"),
      withdraw: () => request<ConsentStatus>("DELETE", "/me/consent"),
    },
    profile: {
      get: () => request<Profile>("GET", "/me/profile"),
      /** Save one onboarding step: send only that step's fields. */
      save: (b: ProfileUpdate) => request<Profile>("PATCH", "/me/profile", b),
      confirm: () => request<Profile>("POST", "/me/profile/confirm"),
    },
    recommendations: {
      list: (o: { k?: number; method?: string } = {}) => request<Recommendations>("GET", `/me/recommendations${qs(o)}`),
      detail: (id: string) => request<InternshipDetail>("GET", `/me/recommendations/${id}`),
      skillGap: () => request<{ skills: { skill_id: string; skill: string; count: number }[] }>("GET", "/me/skill-gap"),
    },
    saved: {
      list: () => request<SavedItem[]>("GET", "/me/saved"),
      save: (id: string) => request<{ saved: boolean }>("PUT", `/me/saved/${id}`),
      remove: (id: string) => request<{ saved: boolean }>("DELETE", `/me/saved/${id}`),
    },
    account: {
      export: () => request<Record<string, unknown>>("GET", "/me/export"),
      delete: async (password: string) => { const r = await request<{ message: string }>("DELETE", "/me", { password }); await storage.set(null); return r; },
    },
  };
}
