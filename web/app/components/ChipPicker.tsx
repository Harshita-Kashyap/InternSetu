"use client";

import { useMemo, useState } from "react";
import { useT } from "../../i18n/useT";

const COLLAPSED = 12;

export type PickerProps = {
  title: string; hint: string; options: string[]; selected: string[];
  onToggle: (v: string) => void; kind: "skill" | "interest";
};

export default function ChipPicker({ title, hint, options, selected, onToggle, kind }: PickerProps) {
  const tr = useT();
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const filtered = useMemo(() => options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase())), [options, q]);
  const shown = q || all ? filtered : filtered.slice(0, COLLAPSED);
  const hidden = filtered.length - shown.length;
  return (
    <section className="pick-section" aria-labelledby={`h-${kind}`}>
      <div className="section-heading">
        <div><h2 id={`h-${kind}`}>{title}</h2><p>{hint}</p></div>
        <span className="selection-count" key={selected.length}>{selected.length} {tr("selected")}</span>
      </div>
      {options.length > COLLAPSED && (
        <input className="pick-search" type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={tr("Search") + "…"} aria-label={`${tr("Search")} ${title}`} />
      )}
      {selected.length > 0 && (
        <div className="picked-tray" aria-label={tr("Selected")}>
          {selected.map((s) => (
            <button key={s} type="button" className="picked" onClick={() => onToggle(s)} aria-label={`${tr("Remove")} ${s}`}>{s} <i>×</i></button>
          ))}
        </div>
      )}
      <div className={kind === "skill" ? "skill-grid" : "interest-grid"}>
        {shown.map((o) => {
          const on = selected.includes(o);
          return kind === "skill" ? (
            <button key={o} type="button" aria-pressed={on} className={`skill-chip ${on ? "selected" : ""}`} onClick={() => onToggle(o)}>
              <span>{on ? "✓" : "+"}</span>{o}
            </button>
          ) : (
            <button key={o} type="button" aria-pressed={on} className={`interest-card ${on ? "selected" : ""}`} onClick={() => onToggle(o)}>
              <span className="interest-icon">{on ? "✓" : "○"}</span><span>{o}</span>
            </button>
          );
        })}
        {shown.length === 0 && <p className="field-hint">{tr("No matches found.")}</p>}
      </div>
      {!q && filtered.length > COLLAPSED && (
        <button type="button" className="show-more" onClick={() => setAll(!all)} aria-expanded={all}>
          {all ? tr("Show less") : `${tr("Show all")} (+${hidden})`}
        </button>
      )}
    </section>
  );
}

