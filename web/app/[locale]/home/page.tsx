"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useRouter } from "../../../i18n/navigation";
import Header from "../../components/Header";
import MatchModal from "../../components/MatchModal";
import ApplyHelp from "../../components/ApplyHelp";
import { useToast } from "../../components/Toast";
import { api, ApiError, BrowseItem } from "../../lib/api";
import MultiSelect from "../../components/MultiSelect";
import { useTax } from "../../lib/taxo";
import { useT } from "../../../i18n/useT";

const PAGE = 12;
type Scope = "all" | "suitable";

export default function HomePage() {
  const tr = useT();
  const router = useRouter();
  const { toast, show } = useToast();
  const sectors = useTax("sector").items;
  const cities = useTax("city").items;
  const skillOpts = useTax("skill").items;
  const [scope, setScope] = useState<Scope>("all");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [sectorIds, setSectorIds] = useState<string[]>([]);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [facs, setFacs] = useState<string[]>([]);
  const [items, setItems] = useState<BrowseItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [complete, setComplete] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const [more, setMore] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => { const t = setTimeout(() => setQuery(q), 300); return () => clearTimeout(t); }, [q]);

  const load = useCallback(async (offset: number) => {
    const my = ++seq.current;
    if (offset === 0) { setItems(null); setFailed(false); } else setMore(true);
    try {
      const r = await api.browse({ scope, q: query, sectors: sectorIds, skills: skillIds, city, facilities: facs, limit: PAGE, offset });
      if (my !== seq.current) return;
      setComplete(r.profile_complete); setTotal(r.total);
      setItems((c) => (offset === 0 ? r.items : [...(c ?? []), ...r.items]));
    } catch (e) {
      if (my !== seq.current) return;
      if (e instanceof ApiError && e.code === "profile_incomplete") { router.replace("/profile"); return; }
      if (e instanceof ApiError && e.code === "consent_required") { router.replace("/consent"); return; }
      setFailed(true); setItems([]);
      show(e instanceof ApiError ? e.message : tr("Could not load internships."));
    } finally { if (my === seq.current) setMore(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, query, sectorIds, skillIds, city, facs]);
  useEffect(() => { load(0); }, [load]);

  const toggleSave = async (it: BrowseItem) => {
    try {
      await (it.saved ? api.unsave(it.internship_id) : api.save(it.internship_id));
      setItems((c) => (c ?? []).map((x) => (x.internship_id === it.internship_id ? { ...x, saved: !it.saved } : x)));
      show(it.saved ? tr("Removed from saved.") : tr("Saved for later."), "success");
    } catch (e) { show(e instanceof ApiError ? e.message : tr("Could not update saved list.")); }
  };

  const clear = () => { setQ(""); setQuery(""); setSectorIds([]); setSkillIds([]); setCity(""); setFacs([]); };
  const filtered = !!(query || sectorIds.length || skillIds.length || city || facs.length);

  return (
    <main className="profile-page">
      {toast}
      <Header label={tr("Discover internships")} />
      <section className="reco-wrap">
        <div className="reco-hero card-rise">
          <div>
            <p className="profile-eyebrow">{tr("DISCOVER")}</p>
            <h1>{tr("Find your internship")}</h1>
            <p className="reco-sub">{tr("Browse every listing, see where you are eligible, and check your match before you apply.")}</p>
            <div className="reco-actions">
              <Link href="/recommendations" className="apply-btn linklike">★ {tr("My top matches")}</Link>
              <Link href="/saved" className="reco-edit">♥ {tr("Saved")}</Link>
              <Link href="/pmis-check" className="reco-edit">✓ {tr("Can I apply to PMIS?")}</Link>
              <Link href="/profile/edit" className="reco-edit">{tr("Edit profile")}</Link>
            </div>
          </div>
        </div>
        <p className="notice">ⓘ {tr("These are demo listings (sample data), not official PMIS vacancies. Apply only on the official PMIS portal.")}</p>

        <div className="tabs" role="tablist" aria-label={tr("Internship views")}>
          {([["all", tr("All internships")], ["suitable", tr("Suitable for me")]] as [Scope, string][]).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={scope === id} className={scope === id ? "on" : ""} onClick={() => setScope(id)}>{label}</button>
          ))}
        </div>

        <div className="toolbar">
          <input type="search" className="pick-search toolbar-search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={tr("Search title, company or keyword")} aria-label={tr("Search internships")} />
          <MultiSelect label={tr("Sector")} options={sectors} value={sectorIds} onChange={setSectorIds} hint={tr("Shows internships in any selected sector.")} />
          <MultiSelect label={tr("Skills")} options={skillOpts} value={skillIds} onChange={setSkillIds} hint={tr("Shows internships that list at least one selected skill. Skills here are filters only; they do not change your eligibility.")} />
          <select value={city} onChange={(e) => setCity(e.target.value)} aria-label={tr("Location")}>
            <option value="">{tr("All locations")}</option>
            {cities.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {filtered && <button type="button" className="ghost-btn" onClick={clear}>{tr("Clear")}</button>}
        </div>
        <div className="chip-row" role="group" aria-label={tr("Facilities")}>
          <span className="chip-label">{tr("Must offer")}:</span>
          {([["food", tr("Food")], ["stay", tr("Stay")], ["transport", tr("Transport")], ["travel_allowance", tr("Travel allowance")]] as [string, string][]).map(([k, label]) => (
            <button key={k} type="button" className="fac-chip" aria-pressed={facs.includes(k)} onClick={() => setFacs((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]))}>{label}</button>
          ))}
        </div>
        {complete === false && <p className="notice">{tr("Complete your profile to see eligibility and match scores.")} <Link href="/profile">{tr("Complete profile")}</Link></p>}
        {items && !failed && <p className="result-count" aria-live="polite">{total} {tr("internships")}</p>}

        {items === null && <div className="job-grid" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="job-card skeleton" />)}</div>}
        {failed && (
          <div className="empty-state" role="alert"><div className="empty-icon">!</div>
            <h2>{tr("Could not load internships.")}</h2>
            <button type="button" className="apply-btn" onClick={() => load(0)}>{tr("Try again")}</button></div>
        )}
        {items?.length === 0 && !failed && (
          <div className="empty-state"><div className="empty-icon">⌕</div>
            <h2>{tr("No internships found")}</h2>
            <p>{scope === "suitable" ? tr("No eligible internships for these filters. Add skills to your profile or widen the filters.") : tr("Try a different search or clear the filters.")}</p>
            {filtered && <button type="button" className="apply-btn" onClick={clear}>{tr("Clear filters")}</button>}</div>
        )}

        <div className="job-grid stagger">
          {items?.map((j) => (
            <article className="job-card" key={j.internship_id}>
              <div className="job-top">
                <div className="job-avatar" aria-hidden="true">{j.company_name.charAt(0)}</div>
                <div className="job-title"><h3>{j.title}</h3><p>{j.company_name}</p></div>
                {j.eligible === true && j.match_percentage != null && <div className="match-pill">{Math.round(j.match_percentage)}%<small>{tr("match")}</small></div>}
              </div>
              <div className="job-tags">
                <span className="tag">📍 {j.location_name}</span>
                {j.distance_km != null && j.distance_km > 0 && <span className="tag">{j.distance_km} km {tr("away")}</span>}
                <span className="tag tag-domain">{j.sector_name}</span>
                {j.duration && <span className="tag">🕒 {j.duration}</span>}
                {j.stipend_inr_per_month != null && <span className="tag">₹{j.stipend_inr_per_month.toLocaleString("en-IN")}/{tr("mo")}</span>}
                {j.is_demo_data && <span className="tag tag-demo">{tr("Demo data")}</span>}
              </div>
              {j.eligible === true && <p className={`status ${j.low_match ? "warn" : "ok"}`}>{j.low_match ? tr("Eligible · low match") : tr("Eligible")}</p>}
              {j.eligible === false && (
                <p className={`status ${j.education_ok !== false && j.missing_mandatory.length > 0 && j.missing_mandatory.length <= 2 ? "warn" : "bad"}`}>{j.education_ok !== false && j.missing_mandatory.length > 0 && j.missing_mandatory.length <= 2 ? `${tr("Close match")} · ` : ""}{tr("Not eligible")}: {j.missing_mandatory.length ? `${tr("needs")} ${j.missing_mandatory.slice(0, 3).join(", ")}${j.missing_mandatory.length > 3 ? ` +${j.missing_mandatory.length - 3}` : ""}` : tr("education level below requirement")}</p>
              )}
              <div className="job-bottom">
                <button type="button" className="ghost-btn" onClick={() => setOpen(j.internship_id)}>{tr("Check match")}</button>
                <div>
                  <button type="button" className={`save-btn ${j.saved ? "on" : ""}`} aria-pressed={j.saved} aria-label={tr("Save internship")} onClick={() => toggleSave(j)}>{j.saved ? "♥" : "♡"}</button>
                  <a className="apply-btn linklike" href={j.apply_url} target="_blank" rel="noopener noreferrer">{tr("Apply on PMIS")}</a>
                </div>
              </div>
              <ApplyHelp />
            </article>
          ))}
        </div>
        {items && items.length < total && (
          <div className="load-more"><button type="button" className="ghost-btn" disabled={more} onClick={() => load(items.length)}>{more ? "…" : `${tr("Show more")} (${total - items.length})`}</button></div>
        )}
      </section>
      {open && <MatchModal id={open} onClose={() => setOpen(null)} />}
    </main>
  );
}
