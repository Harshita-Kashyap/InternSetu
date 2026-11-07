"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "../../i18n/navigation";
import { useLocale } from "next-intl";
import Ring from "./Ring";
import { api, ApiError, InternshipDetail } from "../lib/api";
import { useT } from "../../i18n/useT";

/** "Check match": eligibility (hard rules) and match score (0-100) are shown as two separate things. */
export default function MatchModal({ id, onClose }: { id: string; onClose: () => void }) {
  const tr = useT();
  const locale = useLocale();
  const [d, setD] = useState<InternshipDetail | null>(null);
  const [err, setErr] = useState<{ msg: string; setup: boolean } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    api.internship(id, locale).then(setD).catch((e) =>
      setErr({ msg: e instanceof ApiError ? e.message : tr("Could not load the match."), setup: e instanceof ApiError && e.code === "profile_incomplete" }));
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = ""; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const missing = new Set(d?.skill_gap.missing_mandatory ?? []);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={tr("Check match")}>
        <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label={tr("Close")}>×</button>
        {!d && !err && <div className="skeleton" style={{ minHeight: 220 }} aria-busy="true" />}
        {err && (
          <div className="empty-state" role="alert">
            <h2>{err.msg}</h2>
            {err.setup && <Link href="/profile" className="apply-btn linklike">{tr("Complete my profile")}</Link>}
          </div>
        )}
        {d && (
          <>
            <p className="profile-eyebrow">{tr("CHECK MATCH")}</p>
            <h2 className="modal-title">{d.title}</h2>
            <p className="muted">{d.company_name} · {d.location_name} · {d.sector_name}{d.duration ? ` · ${d.duration}` : ""}</p>

            {d.eligible ? (
              <div className="callout ok">
                <Ring value={d.match_percentage} />
                <div>
                  <strong>{tr("You are eligible")}</strong>
                  <p>{d.low_match ? tr("Low match: you meet the requirements, but your profile fits this role only partly.") : `${Math.round(d.match_percentage)}/100 ${tr("match score")}`}</p>
                </div>
              </div>
            ) : (
              <div className="callout bad">
                <div className="x-mark" aria-hidden="true">!</div>
                <div>
                  <strong>{tr("Not eligible")}</strong>
                  <p>{tr("A required condition is not met. This is an eligibility rule, not a low score.")}</p>
                </div>
              </div>
            )}

            {d.why_recommended.length > 0 && <><h4>{tr("Why this matches")}</h4><ul>{d.why_recommended.map((r) => <li key={r}>{r}</li>)}</ul></>}
            {d.considerations.length > 0 && <><h4>{tr("Things to consider")}</h4><ul>{d.considerations.map((r) => <li key={r}>{r}</li>)}</ul></>}

            <h4>{tr("Required skills")}</h4>
            <div className="job-skills">
              {d.mandatory_skills.length === 0 && <small>{tr("None listed")}</small>}
              {d.mandatory_skills.map((s) => <small key={s.id} className={missing.has(s.name) ? "" : "have"}>{missing.has(s.name) ? "✗" : "✓"} {s.name}</small>)}
            </div>
            {d.education_required && <p className="muted">{tr("Minimum education")}: {d.education_required}</p>}
            {d.skill_gap.missing_preferred.length > 0 && (
              <><h4>{tr("Nice-to-have skills you could add")}</h4>
              <div className="job-skills">{d.skill_gap.missing_preferred.map((s) => <small key={s}>{s}</small>)}</div></>
            )}

            <div className="job-bottom">
              <strong>{d.stipend_inr_per_month ? `₹${d.stipend_inr_per_month.toLocaleString("en-IN")}/${tr("mo")}` : tr("Stipend not listed")}</strong>
              <a className="apply-btn linklike" href={d.apply_url} target="_blank" rel="noopener noreferrer">{tr("Apply on PMIS")}</a>
            </div>
            {d.is_demo_data && <p className="field-hint">{tr("Demo listing: not an official PMIS vacancy. Apply only through the official PMIS portal.")}</p>}
          </>
        )}
      </div>
    </div>
  );
}
