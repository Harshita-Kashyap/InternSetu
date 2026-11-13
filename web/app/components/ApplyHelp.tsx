"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { api, L3_LANG, PmisHandoff } from "../lib/api";
import { useT } from "../../i18n/useT";

let cache: Promise<PmisHandoff> | null = null;
const load = () => (cache ??= api.pmisHandoff().catch((e) => { cache = null; throw e; }));

/** Small "Documents to keep ready" list shown next to every Apply button. Nothing is stored; Aadhaar is never asked for. */
export default function ApplyHelp() {
  const tr = useT();
  const lang = L3_LANG(useLocale());
  const [h, setH] = useState<PmisHandoff | null>(null);
  useEffect(() => { let on = true; load().then((x) => on && setH(x)).catch(() => {}); return () => { on = false; }; }, []);
  if (!h) return null;
  return (
    <details className="apply-help">
      <summary>{tr("Documents to keep ready")}</summary>
      <ul>{h.documents.map((d) => <li key={d.id}>{d.label[lang] || d.label.en}</li>)}</ul>
      <p className="field-hint">{h.note[lang] || h.note.en}</p>
    </details>
  );
}
