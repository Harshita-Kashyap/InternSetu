import type { AuditItem } from "./api";

export const ACTION_TEXT: Record<string, string> = {
  "weights.update": "Scoring weights changed", "weights.reset": "Scoring weights reset to defaults", "taxonomy.create": "List entry added", "taxonomy.update": "List entry edited",
  "flagged.resolve": "Unknown value resolved", "internships.import": "Internships imported", "internship.active": "Internship switched on or off",
};

/** One short line that says what changed (for weights: only the numbers that moved). */
export function describeAudit(a: Pick<AuditItem, "action" | "details">, tr: (s: string) => string): string {
  const d = a.details as Record<string, unknown>;
  if (a.action.startsWith("weights.")) {
    const o = (d.old || {}) as Record<string, number>; const n = (d.new || {}) as Record<string, number>;
    const moved = Object.keys(n).filter((k) => o[k] !== n[k]).map((k) => `${k} ${o[k] ?? "?"} → ${n[k]}`);
    return moved.length ? moved.join(", ") : "–";
  }
  if (a.action === "internship.active") return tr(d.is_active ? "Switched on" : "Switched off");
  const parts = Object.entries(d).filter(([, v]) => v !== null && v !== "" && typeof v !== "object").map(([k, v]) => `${k}: ${v}`);
  return parts.join(", ") || "–";
}
