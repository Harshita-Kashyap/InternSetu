// Icons and display order for the skill "umbrella" categories (ids come from the taxonomy).
// Practical, everyday categories are shown first because many candidates are not in technical fields.
export const CATEGORY_ICON: Record<string, string> = {
  "SKC-EVERY": "🛠️", "SKC-OFFICE": "🗂️", "SKC-COMM": "💬", "SKC-CUST": "🎧", "SKC-SOFT": "🤝", "SKC-LANG": "🗣️",
  "SKC-AGRI": "🌾", "SKC-HOSP": "🏨", "SKC-LOGI": "🚚", "SKC-SALES": "🛒", "SKC-MKT": "📣", "SKC-FIN": "💰",
  "SKC-HR": "👥", "SKC-PM": "📋", "SKC-ENGG": "⚙️", "SKC-ELEC": "⚡", "SKC-CIVIL": "🏗️", "SKC-OILGAS": "⛽",
  "SKC-HEALTH": "🩺", "SKC-EDU": "🎓", "SKC-LEGAL": "⚖️", "SKC-GOV": "🏛️", "SKC-ENV": "🌱", "SKC-CONTENT": "✍️",
  "SKC-DESIGN": "🎨", "SKC-RESEARCH": "🔬", "SKC-PROG": "👨‍💻", "SKC-WEB": "🌐", "SKC-DATA": "📊", "SKC-AIML": "🤖",
  "SKC-CLOUD": "☁️", "SKC-SEC": "🔒",
};
export const CATEGORY_ORDER = Object.keys(CATEGORY_ICON);
export const iconForCategory = (id: string): string => CATEGORY_ICON[id] ?? "📦";
/** Categories in display order: known ones in the order above, then any new ones as the taxonomy gave them. */
export function orderCategories<T extends { id: string }>(cats: T[]): T[] {
  const rank = (id: string) => { const i = CATEGORY_ORDER.indexOf(id); return i === -1 ? CATEGORY_ORDER.length : i; };
  return [...cats].sort((a, b) => rank(a.id) - rank(b.id));
}
