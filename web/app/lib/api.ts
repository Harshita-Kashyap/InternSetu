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
  home_location_id: string | null; degree_other?: string | null; field_of_study_other?: string | null; home_location_other?: string | null; preferred_location_ids: string[];
  willing_to_relocate: boolean; willing_to_travel: boolean; duration_preference: string | null; stipend_expectation: number | null;
};
export type ProfileUpdate = Partial<Omit<ApiProfile, "status" | "missing_fields">>;
export type RecommendationItem = {
  rank: number; internship_id: string; title: string; company_name: string; location_name: string; sector_name: string; role_name: string;
  duration: string | null; stipend_inr_per_month: number | null; match_percentage: number; low_match: boolean; match_tag: string | null;
  why_recommended: string[]; considerations: string[]; apply_url: string; is_demo_data: boolean;
  skill_gap: { missing_mandatory: string[]; missing_preferred: string[] };
};
export type RecommendationsResponse = { skill_gap_summary?: { skill_id: string; skill: string; count: number }[]; nearest?: { internship_id: string; title: string; company_name: string; location_name: string; missing_mandatory: string[]; reason: string }[]; count: number; eligible_count: number; message: string | null; demo_notice: string | null; disclaimer: string; recommendations: RecommendationItem[] };

export type BrowseItem = {
  internship_id: string; title: string; company_name: string; location: string; location_name: string; sector_name: string; role_name: string;
  duration: string | null; stipend_inr_per_month: number | null; is_demo_data: boolean; apply_url: string; saved: boolean;
  eligible: boolean | null; match_percentage: number | null; low_match: boolean | null; missing_mandatory: string[]; education_ok: boolean | null;
};
export type BrowseResponse = { total: number; limit: number; offset: number; profile_complete: boolean; items: BrowseItem[] };
export type InternshipDetail = {
  internship_id: string; title: string; company_name: string; description: string; location_name: string; sector_name: string; role_name: string;
  duration: string | null; stipend_inr_per_month: number | null; facilities: string[]; education_required: string | null;
  mandatory_skills: { id: string; name: string }[]; preferred_skills: { id: string; name: string }[]; apply_url: string; is_demo_data: boolean;
  eligible: boolean; match_percentage: number; low_match: boolean; match_tag: string | null; why_recommended: string[]; considerations: string[];
  skill_gap: { missing_mandatory: string[]; missing_preferred: string[]; missing_mandatory_ids: string[] }; disclaimer: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AdminJson = Record<string, any>;
export type AdminTaxEntry = { id: string; type: string; name: string; is_active: boolean; synonyms: string[] };

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
  forgotPassword: (identifier: string) => req<{ message: string }>("/auth/forgot-password", { method: "POST", ...json({ identifier }) }, false),
  // ---- admin (role = admin) ----
  adminPing: () => req<{ status: string; admin: string }>("/admin/ping"),
  adminStats: () => req<AdminJson>("/admin/stats"),
  adminWeights: () => req<{ weights: Record<string, number>; defaults: Record<string, number> }>("/admin/weights"),
  adminSetWeights: (w: Record<string, number>) => req<{ weights: Record<string, number> }>("/admin/weights", { method: "PUT", ...json(w) }),
  adminResetWeights: () => req<{ weights: Record<string, number> }>("/admin/weights/reset", { method: "POST" }),
  adminTaxonomy: (type: string, q = "") => req<AdminTaxEntry[]>(`/admin/taxonomy/${type}?limit=100&q=${encodeURIComponent(q)}`),
  adminCreateTax: (type: string, name: string, synonyms: string[]) => req<AdminTaxEntry>(`/admin/taxonomy/${type}`, { method: "POST", ...json({ name, synonyms }) }),
  adminUpdateTax: (id: string, patch: { is_active?: boolean; add_synonyms?: string[]; remove_synonyms?: string[] }) => req<AdminTaxEntry>(`/admin/taxonomy/entries/${id}`, { method: "PATCH", ...json(patch) }),
  adminFlagged: () => req<{ id: number; entry_type: string; raw_text: string; suggested_entry_id: string | null }[]>("/admin/flagged"),
  adminResolveFlag: (id: number, entry_id?: string) => req<AdminJson>(`/admin/flagged/${id}/resolve`, { method: "POST", ...json({ entry_id: entry_id ?? null }) }),
  adminInternships: (q = "") => req<{ total: number; items: { internship_id: string; title: string; company_name: string; is_active: boolean; is_synthetic: boolean }[] }>(`/admin/internships?limit=20&q=${encodeURIComponent(q)}`),
  adminSetActive: (id: string, is_active: boolean) => req<AdminJson>(`/admin/internships/${id}`, { method: "PATCH", ...json({ is_active }) }),
  adminImportCsv: (csv_text: string, dry_run: boolean, skip_invalid: boolean, is_synthetic: boolean) => req<AdminJson>("/admin/internships/import", { method: "POST", ...json({ csv_text, dry_run, skip_invalid, is_synthetic }) }),
  adminEvaluation: (n: number) => req<AdminJson>(`/admin/evaluation?n=${n}`),
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
  recommendations: (k?: number, lang?: string) => req<RecommendationsResponse>(`/me/recommendations?${new URLSearchParams({ ...(k ? { k: String(k) } : {}), ...(lang ? { lang } : {}) })}`),
  internship: (id: string, lang?: string) => req<InternshipDetail>(`/me/recommendations/${id}${lang ? `?lang=${lang}` : ""}`),
  browse: (o: { scope: "all" | "suitable"; q?: string; sectors?: string[]; skills?: string[]; city?: string; limit?: number; offset?: number }) => {
    const p = new URLSearchParams({ scope: o.scope, limit: String(o.limit ?? 12), offset: String(o.offset ?? 0) });
    if (o.q) p.set("q", o.q); if (o.sectors?.length) p.set("sectors", o.sectors.join(","));
    if (o.skills?.length) p.set("skills", o.skills.join(",")); if (o.city) p.set("city", o.city);
    return req<BrowseResponse>(`/me/internships?${p}`);
  },
  saved: () => req<unknown[]>("/me/saved"),
  savedFull: () => req<{ internship_id: string; title: string; company_name: string; location_name: string; duration: string | null; stipend_inr_per_month: number | null; is_demo_data: boolean; match_percentage: number | null; eligible?: boolean | null }[]>("/me/saved"),
  save: (id: string) => req<unknown>(`/me/saved/${id}`, { method: "PUT" }),
  unsave: (id: string) => req<unknown>(`/me/saved/${id}`, { method: "DELETE" }),
};
