"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import MatchModal from "../../components/MatchModal";
import { useToast } from "../../components/Toast";
import { api, ApiError } from "../../lib/api";
import { useT } from "../../../i18n/useT";

type Item = Awaited<ReturnType<typeof api.savedFull>>[number];

export default function SavedPage() {
  const tr = useT();
  const { toast, show } = useToast();
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    setItems(null); setFailed(false);
    api.savedFull()
      .then((r) => { const seen = new Set<string>(); setItems(r.filter((i) => !seen.has(i.internship_id) && !!seen.add(i.internship_id))); })
      .catch((e) => { setFailed(true); setItems([]); show(e instanceof ApiError ? e.message : tr("Could not load saved internships.")); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(load, [load]);

  const remove = async (id: string) => {
    setBusy(id);
    try { await api.unsave(id); setItems((c) => (c ?? []).filter((i) => i.internship_id !== id)); show(tr("Removed from saved."), "success"); }
    catch (e) { show(e instanceof ApiError ? e.message : tr("Could not update saved list.")); }
    finally { setBusy(null); }
  };

  return (
    <main className="profile-page">
      {toast}
      <Header label={tr("Saved internships")} />
      <section className="reco-wrap">
        <div className="page-head card-rise">
          <div>
            <p className="profile-eyebrow">{tr("YOUR SHORTLIST")}</p>
            <h1>{tr("Saved internships")}</h1>
            <p className="reco-sub muted">{tr("Internships you bookmarked. Tap the heart on a recommendation to save it.")}</p>
          </div>
          {items && items.length > 0 && <span className="selection-count">{items.length} {tr("saved")}</span>}
        </div>

        {items === null && (
          <div className="job-grid" aria-busy="true">
            {[0, 1, 2, 3].map((i) => <div key={i} className="job-card skeleton" />)}
          </div>
        )}

        {failed && (
          <div className="empty-state" role="alert">
            <div className="empty-icon">!</div>
            <h2>{tr("Could not load saved internships.")}</h2>
            <button type="button" className="apply-btn" onClick={load}>{tr("Try again")}</button>
          </div>
        )}

        {items?.length === 0 && !failed && (
          <div className="empty-state">
            <div className="empty-icon">♡</div>
            <h2>{tr("No saved internships yet.")}</h2>
            <p>{tr("Tap the heart on a recommendation to keep it here.")}</p>
            <Link href="/recommendations" className="apply-btn linklike">{tr("Browse recommendations")}</Link>
          </div>
        )}

        <div className="job-grid stagger">
          {items?.map((j) => (
            <article className="job-card saved-card" key={j.internship_id}>
              <div className="job-top">
                <div className="job-avatar" aria-hidden="true">{(j.company_name || "?").charAt(0)}</div>
                <div className="job-title"><h3>{j.title}</h3><p>{j.company_name}</p></div>
                {j.eligible === false && <div className="match-pill bad">{tr("Not eligible")}</div>}
                {j.eligible !== false && j.match_percentage != null && (
                  <div className="match-pill" title={tr("match")}>{Math.round(j.match_percentage)}%<small>{tr("match")}</small></div>
                )}
              </div>
              <div className="job-tags">
                {j.location_name && <span className="tag">📍 {j.location_name}</span>}
                {j.duration && <span className="tag">🕒 {j.duration}</span>}
                {j.stipend_inr_per_month != null && <span className="tag tag-domain">₹{j.stipend_inr_per_month.toLocaleString("en-IN")}/{tr("mo")}</span>}
                {j.is_demo_data && <span className="tag tag-demo">{tr("Demo data")}</span>}
              </div>
              <div className="job-bottom">
                <button type="button" className="ghost-btn" onClick={() => setOpen(j.internship_id)}>{tr("Check match")}</button>
                <button type="button" className="ghost-btn danger" disabled={busy === j.internship_id} onClick={() => remove(j.internship_id)}>
                  {busy === j.internship_id ? "…" : tr("Remove")}
                </button>
              </div>
            </article>
          ))}
        </div>
        <p className="back-link"><Link href="/recommendations">{tr("← Back to recommendations")}</Link></p>
      </section>
      {open && <MatchModal id={open} onClose={() => setOpen(null)} />}
    </main>
  );
}
