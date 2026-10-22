// Typed API client for InternSetu (Next.js). Env: NEXT_PUBLIC_API_URL=http://localhost:8000
const BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1";
const TOKEN_KEY = "internsetu_token";

export type User = { id: number; full_name: string; email: string | null; mobile: string | null; role: string; preferred_language: string; created_at: string };
export type TokenResponse = { access_token: string; token_type: string; expires_in: number; user: User };
export type TaxonomyItem = { id: string; name: string; parent_id?: string | null };
export type ApiProfile = {
  status: "draft" | "complete"; missing_fields: string[];
  education_level_id: string | null; degree_id: string | null; field_of_study_id: string | null; year_of_completion: number | null;
  skill_ids: string[]; interest_ids: string[]; preferred_role_ids: string[]; preferred_sector_ids: string[];
  home_location_id: string | null; preferred_location_ids: string[];
  willing_to_relocate: boolean; willing_to_travel: boolean; duration_preference: string | null; stipend_expectation: number | null;
};
export type ProfileUpdate = Partial<Omit<ApiProfile, "status" | "missing_fields">>;
export type RecommendationItem = {
  rank: number; internship_id: string; title: string; company_name: string; location_name: string; sector_name: string; role_name: string;
  duration: string | null; stipend_inr_per_month: number | null; match_percentage: number; low_match: boolean; match_tag: string | null;
  why_recommended: string[]; considerations: string[]; apply_url: string; is_demo_data: boolean;
  skill_gap: { missing_mandatory: string[]; missing_preferred: string[] };
};
export type RecommendationsResponse = { count: number; eligible_count: number; message: string | null; demo_notice: string | null; disclaimer: string; recommendations: RecommendationItem[] };

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields: { field: string; message: string }[] = []) { super(message); }
  fieldMessage(f: string) { return this.fields.find((x) => x.field === f)?.message; }
}

export const getToken = () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY));
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function req<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try { res = await fetch(BASE + path, { ...init, headers: { ...headers, ...(init.headers as object) } }); }
  catch { throw new ApiError(0, "network", "Cannot reach the server. Check your connection."); }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && auth) { clearToken(); if (typeof window !== "undefined") window.location.href = "/"; }
    const e = body?.error;
    throw new ApiError(res.status, e?.code || `http_${res.status}`, e?.message || "Something went wrong.", e?.fields || []);
  }
  return body as T;
}
const json = (b: unknown) => ({ body: JSON.stringify(b) });

export const api = {
  register: async (d: { full_name: string; email?: string; mobile?: string; password: string; consent: boolean; preferred_language?: "en" | "hi" | "mr" }) => {
    const r = await req<TokenResponse>("/auth/register", { method: "POST", ...json(d) }, false); setToken(r.access_token); return r;
  },
  login: async (identifier: string, password: string) => {
    const r = await req<TokenResponse>("/auth/login", { method: "POST", ...json({ identifier, password }) }, false); setToken(r.access_token); return r;
  },
  logout: () => clearToken(),
  me: () => req<User>("/auth/me"),
  consent: () => req<{ has_active_consent: boolean; current_version: string }>("/me/consent"),
  giveConsent: () => req<{ has_active_consent: boolean }>("/me/consent", { method: "POST" }),
  withdrawConsent: () => req<{ has_active_consent: boolean }>("/me/consent", { method: "DELETE" }),
  setLanguage: (l: "en" | "hi" | "mr") => req<User>("/me/settings", { method: "PATCH", ...json({ preferred_language: l }) }),
  taxonomy: (type: string, q?: string, parent?: string, limit = 100) => {
    const p = new URLSearchParams({ limit: String(limit) }); if (q) p.set("q", q); if (parent) p.set("parent", parent);
    return req<TaxonomyItem[]>(`/taxonomy/${type}?${p}`, {}, false);
  },
  durations: () => req<{ durations: string[] }>("/taxonomy/durations", {}, false),
  normalize: (entry_type: string, text: string) => req<{ mapped: boolean; entry: TaxonomyItem | null; suggestion: TaxonomyItem | null }>("/taxonomy/normalize", { method: "POST", ...json({ entry_type, text }) }),
  getProfile: () => req<ApiProfile>("/me/profile"),
  updateProfile: (patch: ProfileUpdate) => req<ApiProfile>("/me/profile", { method: "PATCH", ...json(patch) }),
  confirmProfile: () => req<ApiProfile>("/me/profile/confirm", { method: "POST" }),
  recommendations: (k?: number) => req<RecommendationsResponse>(`/me/recommendations${k ? `?k=${k}` : ""}`),
  internship: (id: string) => req<unknown>(`/me/recommendations/${id}`),
  saved: () => req<unknown[]>("/me/saved"),
  save: (id: string) => req<unknown>(`/me/saved/${id}`, { method: "PUT" }),
  unsave: (id: string) => req<unknown>(`/me/saved/${id}`, { method: "DELETE" }),
};
