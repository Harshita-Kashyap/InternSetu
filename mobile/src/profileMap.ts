export type Item = { id: string; name: string };

/** Case-insensitive exact match of typed text against taxonomy names. No fuzzy guessing: a wrong silent match is worse than "Other". */
export function findId(items: Item[], text?: string | null): string | undefined {
  const t = (text ?? "").trim().toLowerCase();
  return t ? items.find((i) => i.name.toLowerCase() === t)?.id : undefined;
}

/** A listed value is stored as an id; anything else as cleaned free text (id cleared). */
export function idOrOther(items: Item[], text: string | undefined, idKey: string, otherKey: string): Record<string, string | null> {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return {};
  const id = findId(items, clean);
  return id ? { [idKey]: id, [otherKey]: null } : { [idKey]: null, [otherKey]: clean };
}

export const nameOf = (items: Item[], id?: string | null) => items.find((i) => i.id === id)?.name;
