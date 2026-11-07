"use client";

import { useT } from "../../i18n/useT";

const OTHER = "__other__";

/** Dropdown of canonical options plus "Other" with a free-text box. An existing value that is not listed is kept (shown under Other). */
export default function SelectOther({ id, label, options, value, onChange, placeholder }: {
  id: string; label: string; options: string[]; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const tr = useT();
  const listed = options.includes(value);
  const other = !!value && !listed && options.length > 0;
  return (
    <div className="profile-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={other ? OTHER : value} onChange={(e) => onChange(e.target.value === OTHER ? " " : e.target.value)}>
        <option value="" disabled>{tr("Select")}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value={OTHER}>{tr("Other")}</option>
      </select>
      {(other || value === " ") && (
        <input id={`${id}-other`} type="text" value={value.trim() === "" ? "" : value} autoFocus={value === " "}
          onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? tr("Type here")}
          aria-label={`${label} (${tr("Other")})`} />
      )}
    </div>
  );
}
