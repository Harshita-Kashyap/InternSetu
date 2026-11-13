"use client";

import { useMemo, useState } from "react";
import MicButton from "./MicButton";
import { useT } from "../../i18n/useT";
import type { TaxonomyItem } from "../lib/api";
import { iconForCategory, orderCategories } from "../lib/skillIcons";

export type GroupedSkillPickerProps = {
  title: string; hint: string;
  skills: TaxonomyItem[];            // skill items; parent_id = category id
  categories: TaxonomyItem[];        // skill_category items
  selected: string[];                // selected skill NAMES (the same value the rest of the app saves)
  onToggle: (name: string) => void;
  onClear: () => void;
};

const PREVIEW = 8;   // skills shown before "Show all"

/** Skills as "umbrella" cards: each category is a rectangle holding its related skills, so people tap what they know without opening anything. */
export default function GroupedSkillPicker({ title, hint, skills, categories, selected, onToggle, onClear }: GroupedSkillPickerProps) {
  const tr = useT();
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const query = q.trim().toLowerCase();

  const groups = useMemo(() => {
    const known = new Set(categories.map((c) => c.id));
    const list = orderCategories(categories).map((c) => ({ id: c.id, name: c.name, items: [] as TaxonomyItem[] }));
    const other = { id: "__other", name: tr("Other skills"), items: [] as TaxonomyItem[] };
    for (const s of skills) {
      const g = list.find((x) => x.id === s.parent_id);
      (g && s.parent_id && known.has(s.parent_id) ? g : other).items.push(s);
    }
    if (other.items.length) list.push(other);
    return list.filter((g) => g.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills, categories]);

  const shownGroups = groups
    .map((g) => ({ ...g, shown: query ? g.items.filter((s) => s.name.toLowerCase().includes(query) || g.name.toLowerCase().includes(query)) : g.items }))
    .filter((g) => g.shown.length > 0);

  return (
    <section className="pick-section umb" aria-labelledby="h-skill-groups">
      <div className="section-heading">
        <div><h2 id="h-skill-groups">{title}</h2><p>{hint}</p></div>
        <span className="selection-count" key={selected.length}>{selected.length} {tr("selected")}</span>
      </div>
      <div className="pick-tools">
        <div className="voice-row">
          <input className="pick-search" type="search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={tr("Search") + "…"} aria-label={`${tr("Search")} ${title}`} />
          <MicButton onText={setQ} />
        </div>
        <button type="button" className="ghost-btn clear-all" disabled={selected.length === 0} onClick={onClear}>{tr("Clear all")}</button>
      </div>
      {selected.length > 0 && (
        <div className="picked-tray umb-tray" aria-label={tr("Selected")}>
          {selected.map((s) => (
            <button key={s} type="button" className="picked" onClick={() => onToggle(s)} aria-label={`${tr("Remove")} ${s}`}>{s} <i>×</i></button>
          ))}
        </div>
      )}
      <div className="umb-grid">
        {shownGroups.map((g) => {
          const count = g.items.filter((s) => selected.includes(s.name)).length;
          const open = !!query || !!expanded[g.id] || g.shown.length <= PREVIEW + 2;
          // keep a chosen skill visible even when the card is folded
          const items = open ? g.shown : [...g.shown.slice(0, PREVIEW), ...g.shown.slice(PREVIEW).filter((s) => selected.includes(s.name))];
          const hidden = g.shown.length - items.length;
          return (
            <article key={g.id} className={`umb-card ${count > 0 ? "has-picks" : ""}`} aria-label={g.name}>
              <header className="umb-head">
                <span className="umb-icon" aria-hidden="true">{iconForCategory(g.id)}</span>
                <div className="umb-title">
                  <h3>{g.name}</h3>
                  <small>{g.items.length} {tr("skills")}</small>
                </div>
                {count > 0 && <span className="umb-badge" aria-label={`${count} ${tr("selected")}`}>{count}/{g.items.length}</span>}
              </header>
              <div className="umb-chips">
                {items.map((s) => {
                  const on = selected.includes(s.name);
                  return (
                    <button key={s.id} type="button" aria-pressed={on} className={`umb-chip ${on ? "selected" : ""}`} onClick={() => onToggle(s.name)}>
                      <span aria-hidden="true">{on ? "✓" : "+"}</span>{s.name}
                    </button>
                  );
                })}
              </div>
              {!query && g.shown.length > PREVIEW + 2 && (
                <button type="button" className="umb-more" aria-expanded={open} onClick={() => setExpanded((e) => ({ ...e, [g.id]: !open }))}>
                  {open ? tr("Show fewer") : `${tr("Show all")} (+${hidden})`}
                </button>
              )}
            </article>
          );
        })}
      </div>
      {query && shownGroups.length === 0 && <p className="field-hint">{tr("No matches found.")}</p>}
    </section>
  );
}
