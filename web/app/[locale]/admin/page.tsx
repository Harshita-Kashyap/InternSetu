"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { useToast } from "../../components/Toast";
import { api, ApiError, AdminJson, AdminTaxEntry } from "../../lib/api";
import { endSession } from "../../lib/store";
import { useT } from "../../../i18n/useT";

const TEAL = "var(--teal)";
const card: React.CSSProperties = { background: "var(--white)", borderRadius: 14, padding: 18, boxShadow: "0 2px 10px rgba(37,107,115,.08)", marginBottom: 16 };
const input: React.CSSProperties = { padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", font: "inherit", minWidth: 0 };
const btn: React.CSSProperties = { padding: "9px 16px", borderRadius: 8, border: "none", background: TEAL, color: "#fff", font: "inherit", fontWeight: 600, cursor: "pointer" };
const btn2: React.CSSProperties = { ...btn, background: "var(--white)", color: TEAL, border: `1px solid ${TEAL}` };
const th: React.CSSProperties = { textAlign: "left", padding: "6px 8px", fontSize: 12, color: "var(--muted)", borderBottom: "1px solid var(--divider)" };
const td: React.CSSProperties = { padding: "6px 8px", fontSize: 13, borderBottom: "1px solid var(--divider)" };
const WKEYS: [string, string][] = [["skills", "Skills"], ["education", "Education"], ["location", "Location"], ["interest_sector", "Interest / Sector"], ["role", "Role"], ["preference", "Other preferences"]];
const TYPES = ["skill", "interest", "sector", "role", "city", "degree", "field_of_study", "education_level"];
const TABS = ["Overview", "Scoring weights", "Taxonomy", "Internships", "Evaluation"];

export default function AdminPage() {
  const tr = useT();
  const router = useRouter();
  const { toast, show } = useToast();
  const [ok, setOk] = useState<boolean | null>(null);
  const [tab, setTab] = useState(TABS[0]);
  const fail = useCallback((e: unknown) => show(e instanceof ApiError ? e.message : "Something went wrong."), [show]);

  useEffect(() => { api.adminPing().then(() => setOk(true)).catch(() => setOk(false)); }, []);

  if (ok === null) return <main style={{ padding: 40 }}>{tr("Loading…")}</main>;
  if (!ok) return (
    <main style={{ padding: 40, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ color: TEAL }}>{tr("Admin dashboard")}</h1>
      <p>{tr("Admin access only. Please log in with an admin account.")}</p>
      <button style={btn} onClick={() => { endSession(); router.push("/"); }}>{tr("Login")}</button>
    </main>
  );

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "20px 16px 60px" }}>
      {toast}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <h1 style={{ color: TEAL, margin: 0 }}>{tr("Admin dashboard")}</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <LanguageSwitcher />
          <button style={btn2} onClick={() => { endSession(); router.push("/"); }}>{tr("Logout")}</button>
        </div>
      </header>
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {TABS.map((x) => <button key={x} onClick={() => setTab(x)} style={x === tab ? btn : btn2}>{tr(x)}</button>)}
      </nav>
      {tab === "Overview" && <Overview fail={fail} />}
      {tab === "Scoring weights" && <Weights fail={fail} show={show} />}
      {tab === "Taxonomy" && <Taxonomy fail={fail} show={show} />}
      {tab === "Internships" && <Internships fail={fail} show={show} />}
      {tab === "Evaluation" && <Evaluation fail={fail} />}
    </main>
  );
}

type P = { fail: (e: unknown) => void; show?: (m: string) => void };

function Overview({ fail }: P) {
  const tr = useT();
  const [s, setS] = useState<AdminJson | null>(null);
  useEffect(() => { api.adminStats().then(setS).catch(fail); }, [fail]);
  if (!s) return <div style={card}>{tr("Loading…")}</div>;
  const items: [string, number][] = [["Candidates", s.users.candidates], ["Complete profiles", s.profiles.real_complete], ["Active internships", s.internships.active], ["Flagged for review", s.flagged_pending]];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
      {items.map(([l, n]) => <div key={l} style={card}><div style={{ fontSize: 30, fontWeight: 800, color: TEAL }}>{n}</div><div style={{ color: "var(--muted)" }}>{tr(l)}</div></div>)}
    </div>
  );
}

function Weights({ fail, show }: P) {
  const tr = useT();
  const [w, setW] = useState<Record<string, number> | null>(null);
  useEffect(() => { api.adminWeights().then((r) => setW(r.weights)).catch(fail); }, [fail]);
  if (!w) return <div style={card}>{tr("Loading…")}</div>;
  const total = Math.round(Object.values(w).reduce((a, b) => a + (Number(b) || 0), 0) * 100) / 100;
  return (
    <div style={card}>
      <p style={{ marginTop: 0 }}>{tr("Weights must total 100%.")}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
        {WKEYS.map(([k, l]) => (
          <label key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>{tr(l)} (%)
            <input type="number" min={0} max={100} step="0.5" style={input} value={w[k]} onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} />
          </label>
        ))}
      </div>
      <p style={{ fontWeight: 700, color: total === 100 ? TEAL : "#c0392b" }}>{tr("Total")}: {total}%</p>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={btn} disabled={total !== 100} onClick={() => api.adminSetWeights(w).then((r) => { setW(r.weights); show?.(tr("Changes saved.")); }).catch(fail)}>{tr("Save weights")}</button>
        <button style={btn2} onClick={() => api.adminResetWeights().then((r) => { setW(r.weights); show?.(tr("Changes saved.")); }).catch(fail)}>{tr("Reset to defaults")}</button>
      </div>
    </div>
  );
}

function Taxonomy({ fail, show }: P) {
  const tr = useT();
  const [type, setType] = useState("skill");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<AdminTaxEntry[]>([]);
  const [name, setName] = useState("");
  const [syn, setSyn] = useState("");
  const [flags, setFlags] = useState<{ id: number; entry_type: string; raw_text: string; suggested_entry_id: string | null }[]>([]);
  const load = useCallback(() => { api.adminTaxonomy(type, q).then(setRows).catch(fail); api.adminFlagged().then(setFlags).catch(fail); }, [type, q, fail]);
  useEffect(() => { load(); }, [load]);
  const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
  return (
    <>
      <div style={card}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <select style={input} value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((x) => <option key={x}>{x}</option>)}</select>
          <input style={{ ...input, flex: 1 }} placeholder={tr("Search entries")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <input style={input} placeholder={tr("Name")} value={name} onChange={(e) => setName(e.target.value)} />
          <input style={{ ...input, flex: 1 }} placeholder={tr("Synonyms / translations (comma separated)")} value={syn} onChange={(e) => setSyn(e.target.value)} />
          <button style={btn} disabled={!name.trim()} onClick={() => api.adminCreateTax(type, name, split(syn)).then(() => { setName(""); setSyn(""); show?.(tr("Changes saved.")); load(); }).catch(fail)}>{tr("Add entry")}</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>{tr("Name")}</th><th style={th}>{tr("Synonyms / translations (comma separated)")}</th><th style={th} /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ opacity: r.is_active ? 1 : 0.5 }}>
                  <td style={td}>{r.name}<div style={{ fontSize: 11, color: "#8a969b" }}>{r.id}</div></td>
                  <td style={td}>
                    {r.synonyms.map((s) => <span key={s} style={{ display: "inline-block", background: "#eaf3f2", borderRadius: 10, padding: "2px 8px", margin: 2 }}>{s} <b style={{ cursor: "pointer" }} onClick={() => api.adminUpdateTax(r.id, { remove_synonyms: [s] }).then(load).catch(fail)}>×</b></span>)}
                    <input style={{ ...input, padding: "3px 8px", width: 130 }} placeholder={tr("Add synonym")} onKeyDown={(e) => { if (e.key === "Enter" && e.currentTarget.value.trim()) { const v = e.currentTarget.value; e.currentTarget.value = ""; api.adminUpdateTax(r.id, { add_synonyms: [v] }).then(load).catch(fail); } }} />
                  </td>
                  <td style={td}><button style={btn2} onClick={() => api.adminUpdateTax(r.id, { is_active: !r.is_active }).then(load).catch(fail)}>{r.is_active ? tr("Deactivate") : tr("Activate")}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>{tr("Pending review items")}</h3>
        {!flags.length && <p>{tr("No items.")}</p>}
        {flags.map((f) => (
          <div key={f.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "6px 0" }}>
            <span style={{ flex: 1 }}><b>{f.raw_text}</b> <small>({f.entry_type})</small></span>
            {f.suggested_entry_id && <button style={btn} onClick={() => api.adminResolveFlag(f.id, f.suggested_entry_id!).then(load).catch(fail)}>{tr("Map to suggestion")}</button>}
            <button style={btn2} onClick={() => api.adminResolveFlag(f.id).then(load).catch(fail)}>{tr("Reject")}</button>
          </div>
        ))}
      </div>
    </>
  );
}

function Internships({ fail, show }: P) {
  const tr = useT();
  const [csv, setCsv] = useState("");
  const [skip, setSkip] = useState(false);
  const [synth, setSynth] = useState(true);
  const [res, setRes] = useState<AdminJson | null>(null);
  const [q, setQ] = useState("");
  const [list, setList] = useState<{ total: number; items: { internship_id: string; title: string; company_name: string; is_active: boolean; is_synthetic: boolean }[] } | null>(null);
  const load = useCallback(() => { api.adminInternships(q).then(setList).catch(fail); }, [q, fail]);
  useEffect(() => { load(); }, [load]);
  const run = (dry: boolean) => api.adminImportCsv(csv, dry, skip, synth).then((r) => { setRes(r); if (!dry && r.imported + r.updated > 0) { show?.(tr("Changes saved.")); load(); } }).catch(fail);
  return (
    <>
      <div style={card}>
        <input type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) f.text().then(setCsv); }} />
        <p style={{ fontSize: 12, color: "var(--muted)" }}>company_name, title, description, sector, role, location, min_education, degree, field_of_study, duration, stipend_inr_per_month, mandatory_skills, preferred_skills (;), application_url, facilities (;)</p>
        <label style={{ marginRight: 16 }}><input type="checkbox" checked={synth} onChange={(e) => setSynth(e.target.checked)} /> {tr("Mark as synthetic data")}</label>
        <label><input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} /> {tr("Skip invalid rows")}</label>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button style={btn2} disabled={!csv} onClick={() => run(true)}>{tr("Check file only")}</button>
          <button style={btn} disabled={!csv} onClick={() => run(false)}>{tr("Import")}</button>
        </div>
        {res && (
          <div style={{ marginTop: 12, fontSize: 13 }}>
            <b>{tr("Rows valid")}: {res.rows_valid} · {tr("Rows invalid")}: {res.rows_invalid}</b>{!res.dry_run && <> · {tr("Imported")}: {res.imported} · {tr("Updated")}: {res.updated}</>}
            {res.message && <div style={{ color: "#c0392b" }}>{res.message}</div>}
            {(res.errors as { row: number; errors: string[] }[]).map((e) => <div key={e.row} style={{ color: "#c0392b" }}>Row {e.row}: {e.errors.join("; ")}</div>)}
          </div>
        )}
      </div>
      <div style={card}>
        <input style={{ ...input, width: "100%", marginBottom: 10 }} placeholder={tr("Search internships")} value={q} onChange={(e) => setQ(e.target.value)} />
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {list?.items.map((i) => (
              <tr key={i.internship_id} style={{ opacity: i.is_active ? 1 : 0.5 }}>
                <td style={td}><b>{i.title}</b><div style={{ fontSize: 12, color: "var(--muted)" }}>{i.company_name} · {i.internship_id}{i.is_synthetic ? " · demo" : ""}</div></td>
                <td style={td}><button style={btn2} onClick={() => api.adminSetActive(i.internship_id, !i.is_active).then(load).catch(fail)}>{i.is_active ? tr("Deactivate") : tr("Activate")}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Evaluation({ fail }: P) {
  const tr = useT();
  const [n, setN] = useState(100);
  const [r, setR] = useState<AdminJson | null>(null);
  const [busy, setBusy] = useState(false);
  const pct = (v: number | null) => (v == null ? "–" : `${Math.round(v * 100)}%`);
  return (
    <div style={card}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label>{tr("Candidates to test")} <input type="number" min={10} max={750} style={{ ...input, width: 90 }} value={n} onChange={(e) => setN(Number(e.target.value))} /></label>
        <button style={btn} disabled={busy} onClick={() => { setBusy(true); api.adminEvaluation(n).then(setR).catch(fail).finally(() => setBusy(false)); }}>{busy ? tr("Please wait...") : tr("Run evaluation")}</button>
      </div>
      {r && (
        <div style={{ overflowX: "auto", marginTop: 14 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Method", "Coverage (≥3 results)", "Avg time (ms)", "Skill overlap", "Sector match", "Location match", "Agreement with baseline"].map((h) => <th key={h} style={th}>{tr(h)}</th>)}</tr></thead>
            <tbody>
              {Object.entries(r.methods as Record<string, AdminJson>).map(([m, v]) => (
                <tr key={m}>
                  <td style={td}><b>{m}</b></td>
                  {v.available ? <>
                    <td style={td}>{pct(v.coverage_at_least_3)}</td><td style={td}>{v.avg_latency_ms}</td><td style={td}>{pct(v.avg_preferred_skill_overlap)}</td>
                    <td style={td}>{pct(v.sector_match_rate)}</td><td style={td}>{pct(v.location_match_rate)}</td><td style={td}>{pct(v.agreement_with_baseline_jaccard)}</td>
                  </> : <td style={td} colSpan={6}>{tr("Not available")}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: "var(--muted)" }}>{tr("Results use synthetic data without ground-truth labels; they are indicators only.")}</p>
        </div>
      )}
    </div>
  );
}
