"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import { useToast } from "../components/Toast";
import { api, ApiError, RecommendationsResponse } from "../lib/api";

function Ring({ value }: { value: number }) {
  const r = 22, c = 2 * Math.PI * r;
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 150); return () => clearTimeout(t); }, []);
  return (
    <div className="ring" aria-label={`${value}% match`}>
      <svg viewBox="0 0 56 56">
        <circle className="ring-bg" cx="28" cy="28" r={r} />
        <circle className="ring-fg" cx="28" cy="28" r={r} strokeDasharray={c} strokeDashoffset={on ? c * (1 - value / 100) : c} />
      </svg>
      <b>{Math.round(value)}%</b>
    </div>
  );
}

export default function RecommendationsPage() {
  const router = useRouter();
  const { toast, show } = useToast();
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setData(await api.recommendations());
        setSaved(((await api.saved()) as { internship_id: string }[]).map((s) => s.internship_id));
      } catch (e) {
        if (e instanceof ApiError && e.code === "profile_incomplete") return router.replace("/profile");
        if (e instanceof ApiError && e.code === "consent_required") return router.replace("/consent");
        show(e instanceof ApiError ? e.message : "Could not load recommendations.");
      } finally { setLoading(false); }
    })();
  }, [router, show]);

  const toggleSave = async (id: string) => {
    const on = saved.includes(id);
    try {
      await (on ? api.unsave(id) : api.save(id));
      setSaved(on ? saved.filter((x) => x !== id) : [...saved, id]);
      show(on ? "Removed from saved." : "Saved for later.", "success");
    } catch (e) { show(e instanceof ApiError ? e.message : "Could not update saved list."); }
  };

  const recs = data?.recommendations ?? [];
  return (
    <main className="profile-page">
      <Header label="Your Recommendations" />
      <section className="reco-wrap">
        <div className="reco-hero card-rise">
          <div>
            <p className="profile-eyebrow">PERSONALISED FOR YOU</p>
            <h1>Your internship matches</h1>
            <p className="reco-sub">{data?.message || "Based on your education, skills and preferences."}</p>
            <div className="reco-actions">
              <Link href="/profile" className="reco-edit">Edit profile</Link>
              <Link href="/profile/preferences" className="reco-edit">Change preferences</Link>
            </div>
          </div>
          <div className="reco-stats">
            <div><b>{data?.eligible_count ?? 0}</b><span>Eligible</span></div>
            <div><b>{recs.length}</b><span>Top matches</span></div>
          </div>
        </div>
        {data?.demo_notice && <p className="field-hint">{data.demo_notice}</p>}
        {loading && <p>Loading…</p>}
        {!loading && recs.length === 0 && <p>No eligible internships yet. Try adding more skills or another city.</p>}
        <div className="job-grid stagger">
          {recs.map((j) => (
            <article className="job-card" key={j.internship_id}>
              <div className="job-top">
                <div className="job-avatar">{j.company_name.charAt(0)}</div>
                <div className="job-title"><h3>{j.title}</h3><p>{j.company_name} · {j.location_name}</p></div>
                <Ring value={j.match_percentage} />
              </div>
              <div className="job-tags">
                <span className="tag tag-domain">{j.sector_name}</span>
                {j.duration && <span className="tag">{j.duration}</span>}
                {j.match_tag && <span className="tag">{j.match_tag}</span>}
                {j.is_demo_data && <span className="tag">Demo data</span>}
              </div>
              <div style={{ marginTop: 16 }}>
                <h4>Why this matches</h4>
                {j.why_recommended.length ? <ul>{j.why_recommended.map((r) => <li key={r}>{r}</li>)}</ul> : <p>Build relevant skills to improve this match.</p>}
                {j.considerations.length > 0 && <ul>{j.considerations.map((r) => <li key={r}>{r}</li>)}</ul>}
                <h4>Skills to improve</h4>
                {[...j.skill_gap.missing_mandatory, ...j.skill_gap.missing_preferred].length ? (
                  <div className="job-skills">{[...j.skill_gap.missing_mandatory, ...j.skill_gap.missing_preferred].map((s) => <small key={s}>{s}</small>)}</div>
                ) : <p>You have all the listed skills.</p>}
              </div>
              <div className="job-bottom">
                <strong>{j.stipend_inr_per_month ? `₹${j.stipend_inr_per_month.toLocaleString("en-IN")}/mo` : "Stipend not listed"}</strong>
                <div>
                  <button type="button" className={`save-btn ${saved.includes(j.internship_id) ? "on" : ""}`} aria-label="Save internship" onClick={() => toggleSave(j.internship_id)}>
                    {saved.includes(j.internship_id) ? "♥" : "♡"}
                  </button>
                  <a className="apply-btn" href={j.apply_url} target="_blank" rel="noopener noreferrer">Apply on PMIS</a>
                </div>
              </div>
            </article>
          ))}
        </div>
        {data?.disclaimer && <p className="field-hint">{data.disclaimer}</p>}
      </section>
      {toast}
    </main>
  );
}
