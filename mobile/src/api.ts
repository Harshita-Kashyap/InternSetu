// Typed API client for InternSetu mobile. Same contract as web/api.ts.
// Set EXPO_PUBLIC_API_URL in .env (see .env.example). Defaults: Android emulator -> 10.0.2.2, iOS sim -> localhost.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const HOST = (process.env.EXPO_PUBLIC_API_URL || (Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000")).replace(/\/$/, "");
const BASE = HOST + "/api/v1";
const TOKEN_KEY = "internsetu_token";
const TIMEOUT_MS = 20000;

export type ReasonCode = { code: string; params: Record<string, string | number> };

export type User = { id: number; full_name: string; email: string | null; mobile: string | null; role: string; preferred_language: string; created_at: string };
export type TokenResponse = { access_token: string; token_type: string; expires_in: number; user: User };
export type TaxonomyItem = { id: string; name: string; parent_id?: string | null };
export type ApiProfile = {
  status: "draft" | "complete"; missing_fields: string[];
  education_level_id: string | null; degree_id: string | null; field_of_study_id: string | null; year_of_completion: number | null;
  skill_ids: string[]; preferred_role_ids: string[]; preferred_sector_ids: string[];
  home_location_id: string | null; preferred_location_ids: string[];
  willing_to_relocate: boolean; willing_to_travel: boolean; duration_preference: string | null; stipend_expectation: number | null;
};
export type ProfileUpdate = Partial<Omit<ApiProfile, "status" | "missing_fields">>;
export type RecommendationItem = {
  rank: number; internship_id: string; title: string; company_name: string; location_name: string; sector_name: string; role_name: string;
  duration: string | null; stipend_inr_per_month: number | null; match_percentage: number; low_match: boolean; match_tag: string | null;
  why_recommended: string[]; considerations: string[]; why_codes?: ReasonCode[]; consider_codes?: ReasonCode[]; apply_url: string; is_demo_data: boolean;
  skill_gap: { missing_mandatory: string[]; missing_preferred: string[] }; distance_km?: number | null;
  tier?: "eligible" | "near"; tier_label?: string; starter?: boolean;
};
export type NearestItem = { internship_id: string; title: string; company_name: string; location_name: string; missing_mandatory: string[]; reason: string };
export type RecommendationsResponse = {
  count: number; eligible_count: number; total_internships: number; message: string | null; demo_notice: string | null; disclaimer: string;
  recommendations: RecommendationItem[]; skill_gap_summary: { skill_id: string; skill: string; count: number }[]; nearest: NearestItem[];
  skill_unlocks?: { skill_id: string; skill: string; unlocks: number; course_links?: { provider: string; url: string }[] }[];
  nearby_count?: number; location_message?: string | null;
};

export type L3 = { en: string; hi: string; mr: string; bn?: string };
/** Text in the chosen language; falls back to English when the server has no translation. */
export const pick = (o: L3, lang: string): string => (o as Record<string, string | undefined>)[lang] || o.en;
export type PmisRules = { age_min: number; age_max: number; family_income_limit_lakh: number; official_url: string };
export type PmisHandoff = { official_url: string; documents: { id: string; label: L3 }[]; note: L3 };
export type PmisAnswers = { age: number; family_income_lakh?: number | null; family_govt_job?: boolean | null; excluded_qualification?: boolean | null; govt_apprenticeship?: boolean | null; employed_full_time?: boolean | null };
export type PmisPrecheck = { status: "likely_eligible" | "check_details" | "likely_not_eligible"; summary: L3; blockers: { code: string; text: L3 }[]; official_url: string; notice: L3 };

export type SavedItem = { internship_id: string; title: string; company_name: string; location_name: string; duration: string | null; stipend_inr_per_month: number | null; is_demo_data: boolean; saved_at: string; eligible: boolean | null; match_percentage: number | null };

export type Activity = { id: string; icon: string; label: { en: string; hi: string; mr: string; bn?: string }; skill_ids: string[] };

export type BrowseItem = {
  internship_id: string; title: string; company_name: string; location: string; location_name: string; sector_name: string; role_name: string;
  duration: string | null; stipend_inr_per_month: number | null; is_demo_data: boolean; apply_url: string; saved: boolean;
  eligible: boolean | null; match_percentage: number | null; low_match: boolean | null; missing_mandatory: string[]; education_ok: boolean | null; distance_km?: number | null;
};
export type BrowseResponse = { total: number; limit: number; offset: number; profile_complete: boolean; items: BrowseItem[] };
export type InternshipDetail = {
  internship_id: string; title: string; company_name: string; description: string; location_name: string; sector_name: string; role_name: string;
  duration: string | null; stipend_inr_per_month: number | null; education_required: string | null;
  mandatory_skills: { id: string; name: string }[]; preferred_skills: { id: string; name: string }[]; apply_url: string; is_demo_data: boolean;
  eligible: boolean; match_percentage: number; low_match: boolean; why_recommended: string[]; considerations: string[]; why_codes?: ReasonCode[]; consider_codes?: ReasonCode[];
  skill_gap: { missing_mandatory: string[]; missing_preferred: string[] }; distance_km?: number | null;
};

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields: { field: string; message: string }[] = []) { super(message); }
  fieldMessage(f: string) { return this.fields.find((x) => x.field === f)?.message; }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };
export async function getToken() { if (token === null) token = (await AsyncStorage.getItem(TOKEN_KEY)) || ""; return token || null; }
export async function setToken(t: string) { token = t; await AsyncStorage.setItem(TOKEN_KEY, t); }
export async function clearToken() { token = ""; await AsyncStorage.removeItem(TOKEN_KEY); await AsyncStorage.removeItem(RECS_CACHE_KEY).catch(() => {}); }
/** Last recommendations kept on the phone for weak connections; removed at logout. */
export const RECS_CACHE_KEY = "internsetu_recs_cache";

/** Seconds until a login token expires (0 if it cannot be read). */
export function tokenSecondsLeft(tok: string | null, now = Date.now()): number {
  try {
    const exp = JSON.parse(atob((tok || "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp;
    return typeof exp === "number" ? exp - Math.floor(now / 1000) : 0;
  } catch { return 0; }
}

// Sliding session: while the person keeps using the app, swap the token for a fresh one once less than 20 minutes remain.
// The server refuses this once the login session is older than 14 days. Failures are ignored: the real request then reports them.
const REFRESH_WHEN_LEFT = 20 * 60;
let refreshing: Promise<void> | null = null;
async function maybeRefresh(): Promise<void> {
  const tok = await getToken();
  const left = tokenSecondsLeft(tok);
  if (!tok || left <= 0 || left > REFRESH_WHEN_LEFT) return;
  refreshing ??= (async () => {
    try {
      const res = await fetch(BASE + "/auth/refresh", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${tok}` } });
      if (res.ok) { const body = await res.json(); if (body?.access_token) await setToken(body.access_token); }
    } catch { /* offline: try again on the next call */ }
    finally { refreshing = null; }
  })();
  await refreshing;
}

async function req<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  if (auth) await maybeRefresh();
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  const t = await getToken();
  if (auth && t) headers.Authorization = `Bearer ${t}`;
  let res: Response | undefined;
  // Reads (GET) are retried twice on a network failure or timeout (weak signal); writes are never retried.
  const tries = (init.method ?? "GET").toUpperCase() === "GET" ? 3 : 1;
  for (let i = 0; i < tries && !res; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, i * 1200));
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try { res = await fetch(BASE + path, { ...init, headers: { ...headers, ...(init.headers as object) }, signal: ctl.signal }); }
    catch { /* try again */ }
    finally { clearTimeout(timer); }
  }
  if (!res) throw new ApiError(0, "network", "Cannot reach the server. Check your connection.");
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && auth) { await clearToken(); onUnauthorized?.(); }
    const e = body?.error;
    throw new ApiError(res.status, e?.code || `http_${res.status}`, e?.message || "Something went wrong.", e?.fields || []);
  }
  return body as T;
}
const json = (b: unknown) => ({ body: JSON.stringify(b) });

export const api = {
  requestRegisterCode: (email: string) => req<{ message: string }>("/auth/register-code", { method: "POST", ...json({ email }) }, false),
  register: async (d: { full_name: string; email: string; password: string; code: string; consent: boolean; preferred_language?: "en" | "hi" | "mr" | "bn" }) => {
    const r = await req<TokenResponse>("/auth/register", { method: "POST", ...json(d) }, false); await setToken(r.access_token); return r;
  },
  login: async (identifier: string, password: string) => {
    const r = await req<TokenResponse>("/auth/login", { method: "POST", ...json({ identifier, password }) }, false); await setToken(r.access_token); return r;
  },
  logout: () => clearToken(),
  forgotPassword: (identifier: string) => req<{ message: string }>("/auth/forgot-password", { method: "POST", ...json({ identifier }) }, false),
  resetPassword: (identifier: string, code: string, new_password: string) => req<{ message: string }>("/auth/reset-password", { method: "POST", ...json({ identifier, code, new_password }) }, false),
  // PMIS pre-check: public and stateless, nothing is stored.
  pmisHandoff: () => req<PmisHandoff>("/pmis/handoff", {}, false),
  pmisRules: () => req<PmisRules>("/pmis/rules", {}, false),
  pmisPrecheck: (a: PmisAnswers) => req<PmisPrecheck>("/pmis/precheck", { method: "POST", ...json(a) }, false),
  activities: () => req<{ activities: Activity[] }>("/taxonomy/activities", {}, false).then((r) => r.activities),
  me: () => req<User>("/auth/me"),
  consent: () => req<{ has_active_consent: boolean; current_version: string }>("/me/consent"),
  exportData: () => req<Record<string, unknown>>("/me/export"),
  deleteAccount: (proof: { password?: string; code?: string }) => req<{ message: string }>("/me", { method: "DELETE", ...json(proof) }),
  requestDeleteCode: () => req<{ message: string }>("/me/delete-code", { method: "POST" }),
  withdrawConsent: () => req<{ has_active_consent: boolean }>("/me/consent", { method: "DELETE" }),
  giveConsent: () => req<{ has_active_consent: boolean }>("/me/consent", { method: "POST" }),
  taxonomy: (type: string, q?: string, parent?: string, limit = 500) => {
    const p = new URLSearchParams({ limit: String(limit) }); if (q) p.set("q", q); if (parent) p.set("parent", parent);
    return req<TaxonomyItem[]>(`/taxonomy/${type}?${p}`, {}, false);
  },
  normalize: (entry_type: string, text: string) => req<{ mapped: boolean; entry: TaxonomyItem | null; suggestion: TaxonomyItem | null }>("/taxonomy/normalize", { method: "POST", ...json({ entry_type, text }) }),
  getProfile: () => req<ApiProfile>("/me/profile"),
  updateProfile: (patch: ProfileUpdate) => req<ApiProfile>("/me/profile", { method: "PATCH", ...json(patch) }),
  confirmProfile: () => req<ApiProfile>("/me/profile/confirm", { method: "POST" }),
  recommendations: (k?: number, lang?: string, onlyMySectors?: boolean) => req<RecommendationsResponse>(`/me/recommendations?${new URLSearchParams({ ...(k ? { k: String(k) } : {}), ...(lang ? { lang } : {}), ...(onlyMySectors ? { only_my_sectors: "true" } : {}) })}`),
  internship: (id: string, lang?: string) => req<InternshipDetail>(`/me/recommendations/${id}${lang ? `?lang=${lang}` : ""}`),
  browse: (o: { scope: "all" | "suitable"; q?: string; sector?: string; city?: string; facilities?: string[]; limit?: number; offset?: number }) => {
    const p = new URLSearchParams({ scope: o.scope, limit: String(o.limit ?? 12), offset: String(o.offset ?? 0) });
    if (o.q) p.set("q", o.q); if (o.sector) p.set("sector", o.sector); if (o.city) p.set("city", o.city);
    if (o.facilities?.length) p.set("facilities", o.facilities.join(","));
    return req<BrowseResponse>(`/me/internships?${p}`);
  },
  saved: () => req<{ internship_id: string }[]>("/me/saved"),
  savedFull: () => req<SavedItem[]>("/me/saved"),
  updateSettings: (preferred_language: "en" | "hi" | "mr" | "bn") => req<User>("/me/settings", { method: "PATCH", ...json({ preferred_language }) }),
  save: (id: string) => req<unknown>(`/me/saved/${id}`, { method: "PUT" }),
  unsave: (id: string) => req<unknown>(`/me/saved/${id}`, { method: "DELETE" }),
};
