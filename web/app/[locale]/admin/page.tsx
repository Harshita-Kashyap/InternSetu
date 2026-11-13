"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "../../../i18n/navigation";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import ThemeToggle from "../../components/ThemeToggle";
import { useToast } from "../../components/Toast";
import { api, ApiError, AdminJson, AdminTaxEntry, AuditItem } from "../../lib/api";
import { endSession } from "../../lib/store";
import { ACTION_TEXT, describeAudit } from "../../lib/audit";
import { useT } from "../../../i18n/useT";

type Tr = (s: string) => string;
type P = { fail: (e: unknown) => void; show?: (m: string, k?: "error" | "success") => void; go?: (t: string) => void };

const WKEYS: [string, string, string, string][] = [
  ["skills", "Skills", "How well the student's skills match what the internship asks for.", "#2b8a90"],
  ["education", "Education", "Whether the student's degree and level fit the internship.", "#6b7fd7"],
  ["location", "Location", "Whether the internship is in a city the student prefers.", "#e9a23b"],
  ["interest_sector", "Industry match", "Whether the internship's industry is one the student chose.", "#d9577a"],
  ["role", "Role", "Not used for now: students are not asked about job roles. Keep at 0.", "#4caf8a"],
  ["preference", "Other preferences", "Extras such as stipend, duration and work mode.", "#9b6bd1"],
];
const TYPES = ["skill", "sector", "role", "city", "degree", "field_of_study", "education_level"];
const TABS: { id: string; icon: string; blurb: string }[] = [
  { id: "Overview", icon: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10", blurb: "A quick health check of the whole platform: how many students, internships and items need your attention." },
  { id: "Scoring weights", icon: "M4 21V14M4 10V3M12 21V12M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6", blurb: "Decide what matters most when the app suggests internships to students. Higher % means that factor counts more in the match score." },
  { id: "Lists", icon: "M4 6h16M4 12h16M4 18h10", blurb: "The master list of skills, cities, sectors and so on that students pick from. Add new entries, add alternate spellings (synonyms) and review unknown values students typed." },
  { id: "Internships", icon: "M3 7h18v13H3zM8 7V4h8v3", blurb: "Add internships in bulk by uploading a CSV file, and switch any listing on or off. Switched-off listings stop appearing in student recommendations." },
  { id: "Audit log", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4", blurb: "A record of every change made in this console: who changed what, and when. Nothing here can be edited." },
  { id: "Evaluation", icon: "M3 3v18h18M7 15l4-4 3 3 5-6", blurb: "A test run that compares the different matching methods on sample students, so you can see which one is faster and gives better matches." },
];

const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg className="ad-ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

function About({ id, tr }: { id: string; tr: Tr }) {
  const t = TABS.find((x) => x.id === id)!;
  return (
    <div className="ad-about">
      <Icon d="M12 8v.01M11 12h1v5h1M12 3a9 9 0 100 18 9 9 0 000-18z" size={20} />
      <div><b>{tr("What does this page do?")}</b><p>{tr(t.blurb)}</p></div>
    </div>
  );
}

export default function AdminPage() {
  const tr = useT();
  const router = useRouter();
  const { toast, show } = useToast();
  const [ok, setOk] = useState<boolean | null>(null);
  const [admin, setAdmin] = useState("");
  const [tab, setTab] = useState(TABS[0].id);
  const fail = useCallback((e: unknown) => show(e instanceof ApiError ? e.message : "Something went wrong."), [show]);
  const logout = () => { endSession(); router.push("/"); };

  useEffect(() => { api.adminPing().then((r) => { setAdmin(r.admin || ""); setOk(true); }).catch(() => setOk(false)); }, []);

  if (ok === null) return <main className="ad-center"><div className="ad-spin" />{tr("Loading…")}</main>;
  if (!ok) return (
    <main className="ad-center">
      <div className="ad-card" style={{ maxWidth: 420, textAlign: "center" }}>
        <h1>{tr("Admin dashboard")}</h1>
        <p className="ad-muted">{tr("Admin access only. Please log in with an admin account.")}</p>
        <button className="ad-btn" onClick={logout}>{tr("Login")}</button>
      </div>
    </main>
  );

  return (
    <div className="ad-shell">
      {toast}
      <aside className="ad-side">
        <div className="ad-brand"><span className="ad-logo">IS</span><div><b>InternSetu</b><small>{tr("Admin console")}</small></div></div>
        <nav aria-label={tr("Admin sections")}>
          {TABS.map((x) => (
            <button key={x.id} type="button" className={"ad-nav" + (x.id === tab ? " on" : "")} aria-current={x.id === tab ? "page" : undefined} onClick={() => setTab(x.id)}>
              <Icon d={x.icon} /><span>{tr(x.id)}</span>
            </button>
          ))}
        </nav>
        <div className="ad-side-foot">
          <div className="ad-user"><span className="ad-avatar">{(admin || "A").slice(0, 1).toUpperCase()}</span><div><b>{admin || "Admin"}</b><small>{tr("Administrator")}</small></div></div>
          <button className="ad-btn ghost" onClick={logout}>{tr("Logout")}</button>
        </div>
      </aside>
      <main className="ad-main">
        <header className="ad-top">
          <div><h1>{tr(tab)}</h1></div>
          <div className="ad-top-r"><ThemeToggle /><LanguageSwitcher /></div>
        </header>
        <About id={tab} tr={tr} />
        {tab === "Overview" && <Overview fail={fail} go={setTab} />}
        {tab === "Scoring weights" && <Weights fail={fail} show={show} />}
        {tab === "Lists" && <Taxonomy fail={fail} show={show} />}
        {tab === "Internships" && <Internships fail={fail} show={show} />}
        {tab === "Audit log" && <AuditLog fail={fail} />}
        {tab === "Evaluation" && <Evaluation fail={fail} />}
      </main>
    </div>
  );
}

function Loading({ tr }: { tr: Tr }) { return <div className="ad-card ad-loading"><div className="ad-spin" />{tr("Loading…")}</div>; }

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color?: string }) {
  return (
    <div className="ad-bar"><span>{label}</span><div className="ad-track"><i style={{ width: `${max ? Math.max(3, (value / max) * 100) : 0}%`, background: color }} /></div><b>{value}</b></div>
  );
}

function Overview({ fail, go }: P) {
  const tr = useT();
  const [s, setS] = useState<AdminJson | null>(null);
  useEffect(() => { api.adminStats().then(setS).catch(fail); }, [fail]);
  if (!s) return <Loading tr={tr} />;
  const kpis: { l: string; n: number; sub: string; d: string; c: string }[] = [
    { l: "Candidates", n: s.users.candidates, sub: `${s.users.admins} ${tr("admin(s)")}`, d: "M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 21a8 8 0 0116 0", c: "#2b8a90" },
    { l: "Complete profiles", n: s.profiles.real_complete, sub: `${s.profiles.real_draft} ${tr("still in draft")}`, d: "M5 13l4 4L19 7", c: "#4caf8a" },
    { l: "Active internships", n: s.internships.active, sub: `${s.internships.inactive} ${tr("switched off")}`, d: "M3 7h18v13H3zM8 7V4h8v3", c: "#6b7fd7" },
    { l: "Flagged for review", n: s.flagged_pending, sub: s.flagged_pending ? tr("needs your attention") : tr("all clear"), d: "M5 21V4M5 4h11l-2 4 2 4H5", c: s.flagged_pending ? "#e0566b" : "#9aa7ab" },
  ];
  const tax = Object.entries(s.taxonomy as Record<string, number>).sort((a, b) => b[1] - a[1]);
  const maxTax = Math.max(1, ...tax.map(([, v]) => v));
  const totalProfiles = s.profiles.real_complete + s.profiles.real_draft;
  const pct = totalProfiles ? Math.round((s.profiles.real_complete / totalProfiles) * 100) : 0;
  const todo: { t: string; tab: string }[] = [];
  if (s.flagged_pending) todo.push({ t: `${s.flagged_pending} ${tr("unknown values from students are waiting for review")}`, tab: "Lists" });
  if (s.internships.inactive) todo.push({ t: `${s.internships.inactive} ${tr("internships are switched off")}`, tab: "Internships" });
  if (s.profiles.real_draft) todo.push({ t: `${s.profiles.real_draft} ${tr("student profiles are not finished yet")}`, tab: "Overview" });
  return (
    <>
      <div className="ad-kpis">
        {kpis.map((k) => (
          <div key={k.l} className="ad-card ad-kpi" style={{ ["--c" as string]: k.c }}>
            <span className="ad-kpi-ico"><Icon d={k.d} size={20} /></span>
            <div className="ad-kpi-n">{k.n}</div><div className="ad-kpi-l">{tr(k.l)}</div><small>{k.sub}</small>
          </div>
        ))}
      </div>
      <div className="ad-grid2">
        <div className="ad-card">
          <h2>{tr("Profile completion")}</h2>
          <div className="ad-donut-row">
            <div className="ad-donut" style={{ ["--p" as string]: pct }}><b>{pct}%</b></div>
            <ul className="ad-legend">
              <li><i style={{ background: "var(--teal)" }} />{s.profiles.real_complete} {tr("complete")}</li>
              <li><i style={{ background: "var(--track)" }} />{s.profiles.real_draft} {tr("draft")}</li>
              <li className="ad-muted">{s.profiles.synthetic} {tr("demo profiles (test data)")}</li>
              <li className="ad-muted">{s.saved_internships} {tr("internships saved by students")}</li>
            </ul>
          </div>
        </div>
        <div className="ad-card">
          <h2>{tr("Needs attention")}</h2>
          {!todo.length && <p className="ad-ok">✓ {tr("Everything looks good.")}</p>}
          {todo.map((x) => <button key={x.t} className="ad-todo" onClick={() => go?.(x.tab)}>{x.t}<span>→</span></button>)}
        </div>
      </div>
      <div className="ad-card">
        <h2>{tr("Data in the system")} <small className="ad-muted">{tr("(active entries per list)")}</small></h2>
        <div className="ad-bars">{tax.map(([k, v]) => <Bar key={k} label={k.replace(/_/g, " ")} value={v} max={maxTax} />)}</div>
      </div>
    </>
  );
}

function Weights({ fail, show }: P) {
  const tr = useT();
  const [w, setW] = useState<Record<string, number> | null>(null);
  const [def, setDef] = useState<Record<string, number> | null>(null);
  useEffect(() => { api.adminWeights().then((r) => { setW(r.weights); setDef(r.defaults); }).catch(fail); }, [fail]);
  if (!w) return <Loading tr={tr} />;
  const total = Math.round(Object.values(w).reduce((a, b) => a + (Number(b) || 0), 0) * 100) / 100;
  const set = (k: string, v: number) => setW({ ...w, [k]: Math.max(0, Math.min(100, v || 0)) });
  const normalise = () => {
    if (!total) return;
    const n: Record<string, number> = {}; let acc = 0; const keys = WKEYS.map((x) => x[0]);
    keys.forEach((k, i) => { n[k] = i === keys.length - 1 ? Math.round((100 - acc) * 10) / 10 : Math.round((w[k] / total) * 1000) / 10; acc += n[k]; });
    setW(n);
  };
  const saved = (r: { weights: Record<string, number> }) => { setW(r.weights); show?.(tr("Changes saved."), "success"); };
  return (
    <div className="ad-card">
      <div className="ad-stack" aria-hidden="true">{WKEYS.map(([k, , , c]) => <i key={k} style={{ width: `${w[k]}%`, background: c }} title={`${k} ${w[k]}%`} />)}</div>
      <div className="ad-weights">
        {WKEYS.map(([k, l, hint, c]) => (
          <div key={k} className="ad-w">
            <div className="ad-w-h"><i style={{ background: c }} /><b>{tr(l)}</b>
              <span className="ad-num"><input type="number" min={0} max={100} step="0.5" value={w[k]} onChange={(e) => set(k, Number(e.target.value))} aria-label={`${tr(l)} %`} />%</span></div>
            <input type="range" min={0} max={100} step="0.5" value={w[k]} onChange={(e) => set(k, Number(e.target.value))} style={{ accentColor: c }} aria-label={tr(l)} />
            <small className="ad-muted">{tr(hint)}{def && def[k] !== w[k] ? ` · ${tr("default")} ${def[k]}%` : ""}</small>
          </div>
        ))}
      </div>
      <div className={"ad-total" + (total === 100 ? " ok" : " bad")}>
        <b>{tr("Total")}: {total}%</b>
        <span>{total === 100 ? tr("Ready to save.") : tr("Must be exactly 100%.")}</span>
        {total !== 100 && <button className="ad-btn ghost sm" onClick={normalise}>{tr("Auto-balance to 100%")}</button>}
      </div>
      <div className="ad-row">
        <button className="ad-btn" disabled={total !== 100} onClick={() => api.adminSetWeights(w).then(saved).catch(fail)}>{tr("Save weights")}</button>
        <button className="ad-btn ghost" onClick={() => api.adminResetWeights().then(saved).catch(fail)}>{tr("Reset to defaults")}</button>
      </div>
    </div>
  );
}

function Taxonomy({ fail, show }: P) {
  const tr = useT();
  const [type, setType] = useState("skill");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<AdminTaxEntry[] | null>(null);
  const [name, setName] = useState("");
  const [syn, setSyn] = useState("");
  const [flags, setFlags] = useState<{ id: number; entry_type: string; raw_text: string; suggested_entry_id: string | null }[]>([]);
  const load = useCallback(() => { api.adminTaxonomy(type, q).then(setRows).catch(fail); api.adminFlagged().then(setFlags).catch(fail); }, [type, q, fail]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);
  const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
  const add = () => api.adminCreateTax(type, name, split(syn)).then(() => { setName(""); setSyn(""); show?.(tr("Changes saved."), "success"); load(); }).catch(fail);
  return (
    <>
      {flags.length > 0 && (
        <div className="ad-card ad-warn">
          <h2>{tr("Pending review items")} <span className="ad-badge bad">{flags.length}</span></h2>
          <p className="ad-muted">{tr("Students typed these values and the system did not recognise them. Map each to an existing entry, or reject it.")}</p>
          {flags.map((f) => (
            <div key={f.id} className="ad-flag">
              <span><b>{f.raw_text}</b> <span className="ad-badge">{f.entry_type}</span></span>
              <span className="ad-row">
                {f.suggested_entry_id && <button className="ad-btn sm" onClick={() => api.adminResolveFlag(f.id, f.suggested_entry_id!).then(load).catch(fail)}>{tr("Map to suggestion")}</button>}
                <button className="ad-btn ghost sm" onClick={() => api.adminResolveFlag(f.id).then(load).catch(fail)}>{tr("Reject")}</button>
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="ad-card">
        <div className="ad-pills" role="tablist">{TYPES.map((x) => <button key={x} className={"ad-pill" + (x === type ? " on" : "")} onClick={() => { setType(x); setRows(null); }}>{x.replace(/_/g, " ")}</button>)}</div>
        <input className="ad-input" style={{ width: "100%" }} placeholder={tr("Search entries")} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="ad-add">
          <input className="ad-input" placeholder={tr("Name")} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && add()} />
          <input className="ad-input" style={{ flex: 1 }} placeholder={tr("Synonyms / translations (comma separated)")} value={syn} onChange={(e) => setSyn(e.target.value)} />
          <button className="ad-btn" disabled={!name.trim()} onClick={add}>+ {tr("Add entry")}</button>
        </div>
        {rows === null && <div className="ad-loading"><div className="ad-spin" />{tr("Loading…")}</div>}
        {rows?.length === 0 && <p className="ad-empty">{tr("No items.")}</p>}
        <div className="ad-list">
          {rows?.map((r) => (
            <div key={r.id} className={"ad-item" + (r.is_active ? "" : " off")}>
              <div className="ad-item-h"><b>{r.name}</b>{!r.is_active && <span className="ad-badge">{tr("Inactive")}</span>}
                <button className="ad-btn ghost sm" onClick={() => api.adminUpdateTax(r.id, { is_active: !r.is_active }).then(load).catch(fail)}>{r.is_active ? tr("Deactivate") : tr("Activate")}</button></div>
              <div className="ad-chips">
                {r.synonyms.map((s) => <span key={s} className="ad-chip">{s}<button aria-label={`${tr("Remove")} ${s}`} onClick={() => api.adminUpdateTax(r.id, { remove_synonyms: [s] }).then(load).catch(fail)}>×</button></span>)}
                <input className="ad-input mini" placeholder={"+ " + tr("Add synonym")} onKeyDown={(e) => { if (e.key === "Enter" && e.currentTarget.value.trim()) { const v = e.currentTarget.value; e.currentTarget.value = ""; api.adminUpdateTax(r.id, { add_synonyms: [v] }).then(load).catch(fail); } }} />
              </div>
            </div>
          ))}
        </div>
        {rows && rows.length >= 100 && <small className="ad-muted">{tr("Showing the first 100 results. Use search to narrow down.")}</small>}
      </div>
    </>
  );
}

function Internships({ fail, show }: P) {
  const tr = useT();
  const [csv, setCsv] = useState("");
  const [fname, setFname] = useState("");
  const [drag, setDrag] = useState(false);
  const [skip, setSkip] = useState(false);
  const [synth, setSynth] = useState(true);
  const [res, setRes] = useState<AdminJson | null>(null);
  const [q, setQ] = useState("");
  const [list, setList] = useState<{ total: number; items: { internship_id: string; title: string; company_name: string; is_active: boolean; is_synthetic: boolean }[] } | null>(null);
  const load = useCallback(() => { api.adminInternships(q).then(setList).catch(fail); }, [q, fail]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);
  const pick = (f?: File | null) => { if (f) { setFname(f.name); setRes(null); f.text().then(setCsv); } };
  const run = (dry: boolean) => api.adminImportCsv(csv, dry, skip, synth).then((r) => { setRes(r); if (!dry && r.imported + r.updated > 0) { show?.(tr("Changes saved."), "success"); load(); } }).catch(fail);
  return (
    <>
      <div className="ad-card">
        <h2>{tr("Import internships from CSV")}</h2>
        <ol className="ad-steps"><li>{tr("Choose your CSV file")}</li><li>{tr("Click “Check file only” to find mistakes (nothing is saved)")}</li><li>{tr("Click “Import” to add the internships")}</li></ol>
        <label className={"ad-drop" + (drag ? " drag" : "") + (fname ? " has" : "")} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}>
          <Icon d="M12 16V4M7 9l5-5 5 5M4 20h16" size={26} />
          <b>{fname || tr("Drop a CSV file here, or click to browse")}</b>
          <input type="file" accept=".csv,text/csv" hidden onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        <details className="ad-details"><summary>{tr("Advanced: expected CSV columns")}</summary><code>company_name, title, description, sector, role, location, min_education, degree, field_of_study, duration, stipend_inr_per_month, mandatory_skills, preferred_skills (;), application_url, facilities (;)</code></details>
        <div className="ad-row wrap">
          <label className="ad-check"><input type="checkbox" checked={synth} onChange={(e) => setSynth(e.target.checked)} /> {tr("Mark as sample data")}</label>
          <label className="ad-check"><input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} /> {tr("Skip invalid rows")}</label>
        </div>
        <div className="ad-row">
          <button className="ad-btn ghost" disabled={!csv} onClick={() => run(true)}>{tr("Check file only")}</button>
          <button className="ad-btn" disabled={!csv} onClick={() => run(false)}>{tr("Import")}</button>
        </div>
        {res && (
          <div className="ad-result">
            <span className="ad-badge ok">{tr("Rows valid")}: {res.rows_valid}</span>
            <span className={"ad-badge" + (res.rows_invalid ? " bad" : "")}>{tr("Rows invalid")}: {res.rows_invalid}</span>
            {!res.dry_run && <><span className="ad-badge ok">{tr("Imported")}: {res.imported}</span><span className="ad-badge">{tr("Updated")}: {res.updated}</span></>}
            {res.message && <p className="ad-err">{res.message}</p>}
            {(res.errors as { row: number; errors: string[] }[]).map((e) => <p key={e.row} className="ad-err">{tr("Row")} {e.row}: {e.errors.join("; ")}</p>)}
          </div>
        )}
      </div>
      <div className="ad-card">
        <h2>{tr("All internships")} {list && <span className="ad-badge">{list.total}</span>}</h2>
        <input className="ad-input" style={{ width: "100%", marginBottom: 10 }} placeholder={tr("Search internships")} value={q} onChange={(e) => setQ(e.target.value)} />
        {list === null && <div className="ad-loading"><div className="ad-spin" />{tr("Loading…")}</div>}
        {list?.items.length === 0 && <p className="ad-empty">{tr("No items.")}</p>}
        <div className="ad-list">
          {list?.items.map((i) => (
            <div key={i.internship_id} className={"ad-item row" + (i.is_active ? "" : " off")}>
              <div><b>{i.title}</b><div className="ad-muted" title={i.internship_id}>{i.company_name}</div></div>
              <div className="ad-row">
                {i.is_synthetic && <span className="ad-badge">{tr("Demo data")}</span>}
                <span className={"ad-badge " + (i.is_active ? "ok" : "")}>{i.is_active ? tr("Active") : tr("Inactive")}</span>
                <button className="ad-btn ghost sm" onClick={() => api.adminSetActive(i.internship_id, !i.is_active).then(load).catch(fail)}>{i.is_active ? tr("Deactivate") : tr("Activate")}</button>
              </div>
            </div>
          ))}
        </div>
        {list && list.total > list.items.length && <small className="ad-muted">{tr("Showing the first 20. Use search to find others.")}</small>}
      </div>
    </>
  );
}

function AuditLog({ fail }: P) {
  const tr = useT();
  const [items, setItems] = useState<AuditItem[] | null>(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback((offset: number) => {
    setBusy(true);
    api.adminAudit(50, offset).then((r) => { setItems((cur) => (offset ? [...(cur || []), ...r.items] : r.items)); setMore(r.items.length === 50); }).catch(fail).finally(() => setBusy(false));
  }, [fail]);
  useEffect(() => { load(0); }, [load]);
  if (!items) return <div className="ad-card"><p className="ad-muted">{tr("Loading…")}</p></div>;
  return (
    <div className="ad-card">
      {items.length === 0 ? <p className="ad-muted">{tr("No changes have been recorded yet.")}</p> : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead><tr><th>{tr("When")}</th><th>{tr("Admin")}</th><th>{tr("What changed")}</th><th>{tr("Target")}</th><th>{tr("Details")}</th></tr></thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.created_at).toLocaleString()}</td>
                  <td>{a.admin_email || "–"}</td>
                  <td>{ACTION_TEXT[a.action] ? tr(ACTION_TEXT[a.action]) : a.action}</td>
                  <td>{a.target || "–"}</td>
                  <td>{describeAudit(a, tr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {more && <button className="ad-btn ghost" disabled={busy} onClick={() => load(items.length)}>{tr("Load more")}</button>}
    </div>
  );
}

function Evaluation({ fail }: P) {
  const tr = useT();
  const [n, setN] = useState(100);
  const [r, setR] = useState<AdminJson | null>(null);
  const [busy, setBusy] = useState(false);
  const pct = (v: number | null | undefined) => (v == null ? "–" : `${Math.round(v * 100)}%`);
  const methods = useMemo(() => (r ? Object.entries(r.methods as Record<string, AdminJson>) : []), [r]);
  const fastest = useMemo(() => methods.filter(([, v]) => v.available).sort((a, b) => a[1].avg_latency_ms - b[1].avg_latency_ms)[0]?.[0], [methods]);
  const cols: [string, string, string][] = [
    ["Coverage (≥3 results)", "coverage_at_least_3", "Share of students who got at least 3 suggestions."],
    ["Skill overlap", "avg_preferred_skill_overlap", "How much suggested internships match the student's skills."],
    ["Sector match", "sector_match_rate", "Suggestions in the student's preferred industry."],
    ["Location match", "location_match_rate", "Suggestions in the student's preferred city."],
    ["Agreement with baseline", "agreement_with_baseline_jaccard", "How similar the picks are to the basic method."],
  ];
  return (
    <div className="ad-card">
      <div className="ad-row wrap">
        <label className="ad-check">{tr("Candidates to test")} <input className="ad-input" type="number" min={10} max={750} style={{ width: 90 }} value={n} onChange={(e) => setN(Number(e.target.value))} /></label>
        <button className="ad-btn" disabled={busy} onClick={() => { setBusy(true); api.adminEvaluation(n).then(setR).catch(fail).finally(() => setBusy(false)); }}>{busy ? tr("Please wait...") : tr("Run evaluation")}</button>
        {busy && <small className="ad-muted">{tr("The first run loads the AI model and can take a minute.")}</small>}
      </div>
      {r && (
        <div className="ad-evals">
          {methods.map(([m, v]) => (
            <div key={m} className="ad-eval">
              <div className="ad-item-h"><b>{m}</b>{m === fastest && <span className="ad-badge ok">{tr("Fastest")}</span>}{v.available && <span className="ad-badge">{v.avg_latency_ms} ms</span>}</div>
              {v.available ? cols.map(([l, k, hint]) => (
                <div key={k} className="ad-meter" title={tr(hint)}><span>{tr(l)}</span><div className="ad-track"><i style={{ width: `${Math.round((v[k] || 0) * 100)}%` }} /></div><b>{pct(v[k])}</b></div>
              )) : <p className="ad-muted">{tr("Not available")}</p>}
            </div>
          ))}
          <p className="ad-muted" style={{ fontSize: 12 }}>{tr("Results use synthetic data without ground-truth labels; they are indicators only.")}</p>
        </div>
      )}
    </div>
  );
}
