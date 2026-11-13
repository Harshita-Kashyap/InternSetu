// Keeps the last recommendations on this device so they can still be shown on a weak or missing connection.
// Cleared at logout (see clearToken in api.ts) because it holds profile-based results.
const KEY = "internsetu_recs_cache";
export type CachedRecs<T> = { locale: string; onlyMine: boolean; savedAt: number; data: T };

export function saveRecs<T>(data: T, locale: string, onlyMine: boolean) {
  try { localStorage.setItem(KEY, JSON.stringify({ locale, onlyMine, savedAt: Date.now(), data })); } catch { /* storage full or blocked */ }
}
export function loadRecs<T>(locale: string, onlyMine: boolean): CachedRecs<T> | null {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) || "null") as CachedRecs<T> | null;
    return r && r.locale === locale && r.onlyMine === onlyMine ? r : null;
  } catch { return null; }
}
export function clearRecsCache() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
