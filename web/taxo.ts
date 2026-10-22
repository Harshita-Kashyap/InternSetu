"use client";
import { useEffect, useMemo, useState } from "react";
import { api, TaxonomyItem } from "./api";

const cache: Record<string, Promise<TaxonomyItem[]>> = {};
export function loadTax(type: string): Promise<TaxonomyItem[]> {
  if (!cache[type]) cache[type] = api.taxonomy(type, undefined, undefined, 500).catch((e) => { delete cache[type]; throw e; });
  return cache[type];
}
/** Options for dropdowns/chips: real names from the backend, ids kept for saving. */
export function useTax(type: string) {
  const [items, setItems] = useState<TaxonomyItem[]>([]);
  useEffect(() => { loadTax(type).then(setItems).catch(() => {}); }, [type]);
  const names = useMemo(() => items.map((i) => i.name), [items]);
  return { items, names };
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
