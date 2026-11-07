"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useT } from "../../i18n/useT";

export type Opt = { id: string; name: string };

/** Searchable checkbox dropdown with removable chips. Values are option ids. */
export default function MultiSelect({ label, options, value, onChange, hint }: {
  label: string; options: Opt[]; value: string[]; onChange: (v: string[]) => void; hint?: string;
}) {
  const tr = useT();
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const shown = useMemo(() => options.filter((o) => o.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 80), [options, q]);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const name = (id: string) => options.find((o) => o.id === id)?.name ?? id;
  return (
    <div className="ms" ref={box} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
      <button type="button" className="ms-btn" aria-haspopup="listbox" aria-expanded={open} aria-controls={uid} onClick={() => setOpen(!open)}>
        {label}{value.length > 0 && <b className="ms-count">{value.length}</b>}<span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="ms-pop" id={uid} role="group" aria-label={label}>
          <input type="search" className="pick-search" value={q} autoFocus onChange={(e) => setQ(e.target.value)}
            placeholder={tr("Search") + "…"} aria-label={`${tr("Search")} ${label}`} />
          {hint && <p className="field-hint">{hint}</p>}
          <ul>
            {shown.map((o) => (
              <li key={o.id}><label><input type="checkbox" checked={value.includes(o.id)} onChange={() => toggle(o.id)} /> {o.name}</label></li>
            ))}
            {shown.length === 0 && <li className="field-hint">{tr("No matches found.")}</li>}
          </ul>
        </div>
      )}
      {value.length > 0 && (
        <div className="picked-tray ms-chips">
          {value.map((id) => (
            <button key={id} type="button" className="picked" onClick={() => toggle(id)} aria-label={`${tr("Remove")} ${name(id)}`}>{name(id)} <i>×</i></button>
          ))}
        </div>
      )}
    </div>
  );
}
