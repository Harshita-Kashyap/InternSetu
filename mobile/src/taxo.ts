import { useEffect, useMemo, useState } from "react";
import { api, TaxonomyItem } from "./api";

const cache: Record<string, Promise<TaxonomyItem[]>> = {};
export function loadTax(type: string): Promise<TaxonomyItem[]> {
  if (!cache[type]) cache[type] = api.taxonomy(type).catch((e) => { delete cache[type]; throw e; });
  return cache[type];
}
/** Taxonomy items from the backend (names for UI, ids kept for saving). */
export function useTax(type: string) {
  const [items, setItems] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let on = true; loadTax(type).then((r) => on && setItems(r)).catch(() => {}).finally(() => on && setLoading(false)); return () => { on = false; }; }, [type]);
  const names = useMemo(() => items.map((i) => i.name), [items]);
  return { items, names, loading };
}
/** Free text -> taxonomy id (exact name, else backend normalize). null = not recognised. */
export async function resolveId(type: string, text: string): Promise<string | null> {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  const hit = (await loadTax(type)).find((i) => i.name.toLowerCase() === t);
  if (hit) return hit.id;
  const r = await api.normalize(type, text.trim());
  return (r.entry ?? r.suggestion)?.id ?? null;
}
