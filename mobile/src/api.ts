// Typed API client for InternSetu mobile. Same contract as web/api.ts.
// Set EXPO_PUBLIC_API_URL in .env (see .env.example). Defaults: Android emulator -> 10.0.2.2, iOS sim -> localhost.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const HOST = (process.env.EXPO_PUBLIC_API_URL || (Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000")).replace(/\/$/, "");
const BASE = HOST + "/api/v1";
const TOKEN_KEY = "internsetu_token";
const TIMEOUT_MS = 20000;

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
export type NearestItem = { internship_id: string; title: string; company_name: string; location_name: string; missing_mandatory: string[]; reason: string };
export type RecommendationsResponse = {
  count: number; eligible_count: number; total_internships: number; message: string | null; demo_notice: string | null; disclaimer: string;
  recommendations: RecommendationItem[]; skill_gap_summary: { skill_id: string; skill: string; count: number }[]; nearest: NearestItem[];
};

export type SavedItem = { internship_id: string; title: string; company_name: string; location_name: string; duration: string | null; stipend_inr_per_month: number | null; is_demo_data: boolean; saved_at: string; eligible: boolean | null; match_percentage: number | null };

export type BrowseItem = {
  internship_id: string; title: string; company_name: string; location: string; location_name: string; sector_name: string; role_name: string;
  duration: string | null; stipend_inr_per_month: number | null; is_demo_data: boolean; apply_url: string; saved: boolean;
  eligible: boolean | null; match_percentage: number | null; low_match: boolean | null; missing_mandatory: string[]; education_ok: boolean | null;
};
export type BrowseResponse = { total: number; limit: number; offset: number; profile_complete: boolean; items: BrowseItem[] };
export type InternshipDetail = {
  internship_id: string; title: string; company_name: string; description: string; location_name: string; sector_name: string; role_name: string;
  duration: string | null; stipend_inr_per_month: number | null; education_required: string | null;
  mandatory_skills: { id: string; name: string }[]; preferred_skills: { id: string; name: string }[]; apply_url: string; is_demo_data: boolean;
  eligible: boolean; match_percentage: number; low_match: boolean; why_recommended: string[]; considerations: string[];
  skill_gap: { missing_mandatory: string[]; missing_preferred: string[] };
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
export async function clearToken() { token = ""; await AsyncStorage.removeItem(TOKEN_KEY); }

async function req<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  const t = await getToken();
  if (auth && t) headers.Authorization = `Bearer ${t}`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let res: Response;
  try { res = await fetch(BASE + path, { ...init, headers: { ...headers, ...(init.headers as object) }, signal: ctl.signal }); }
  catch { throw new ApiError(0, "network", "Cannot reach the server. Check your connection."); }
  finally { clearTimeout(timer); }
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
  register: async (d: { full_name: string; email?: string; mobile?: string; password: string; consent: boolean; preferred_language?: "en" | "hi" | "mr" }) => {
    const r = await req<TokenResponse>("/auth/register", { method: "POST", ...json(d) }, false); await setToken(r.access_token); return r;
  },
  login: async (identifier: string, password: string) => {
    const r = await req<TokenResponse>("/auth/login", { method: "POST", ...json({ identifier, password }) }, false); await setToken(r.access_token); return r;
  },
  logout: () => clearToken(),
  forgotPassword: (identifier: string) => req<{ message: string }>("/auth/forgot-password", { method: "POST", ...json({ identifier }) }, false),
  me: () => req<User>("/auth/me"),
  consent: () => req<{ has_active_consent: boolean; current_version: string }>("/me/consent"),
  giveConsent: () => req<{ has_active_consent: boolean }>("/me/consent", { method: "POST" }),
  taxonomy: (type: string, q?: string, parent?: string, limit = 500) => {
    const p = new URLSearchParams({ limit: String(limit) }); if (q) p.set("q", q); if (parent) p.set("parent", parent);
    return req<TaxonomyItem[]>(`/taxonomy/${type}?${p}`, {}, false);
  },
  normalize: (entry_type: string, text: string) => req<{ mapped: boolean; entry: TaxonomyItem | null; suggestion: TaxonomyItem | null }>("/taxonomy/normalize", { method: "POST", ...json({ entry_type, text }) }),
  getProfile: () => req<ApiProfile>("/me/profile"),
  updateProfile: (patch: ProfileUpdate) => req<ApiProfile>("/me/profile", { method: "PATCH", ...json(patch) }),
  confirmProfile: () => req<ApiProfile>("/me/profile/confirm", { method: "POST" }),
  recommendations: (k?: number, lang?: string) => req<RecommendationsResponse>(`/me/recommendations?${new URLSearchParams({ ...(k ? { k: String(k) } : {}), ...(lang ? { lang } : {}) })}`),
  internship: (id: string, lang?: string) => req<InternshipDetail>(`/me/recommendations/${id}${lang ? `?lang=${lang}` : ""}`),
  browse: (o: { scope: "all" | "suitable"; q?: string; sector?: string; city?: string; limit?: number; offset?: number }) => {
    const p = new URLSearchParams({ scope: o.scope, limit: String(o.limit ?? 12), offset: String(o.offset ?? 0) });
    if (o.q) p.set("q", o.q); if (o.sector) p.set("sector", o.sector); if (o.city) p.set("city", o.city);
    return req<BrowseResponse>(`/me/internships?${p}`);
  },
  saved: () => req<{ internship_id: string }[]>("/me/saved"),
  savedFull: () => req<SavedItem[]>("/me/saved"),
  updateSettings: (preferred_language: "en" | "hi" | "mr") => req<User>("/me/settings", { method: "PATCH", ...json({ preferred_language }) }),
  save: (id: string) => req<unknown>(`/me/saved/${id}`, { method: "PUT" }),
  unsave: (id: string) => req<unknown>(`/me/saved/${id}`, { method: "DELETE" }),
};
