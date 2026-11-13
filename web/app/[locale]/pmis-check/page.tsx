"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "../../../i18n/navigation";
import { useT } from "../../../i18n/useT";
import AuthShell from "../../components/AuthShell";
import { api, L3_LANG, PmisAnswers, PmisHandoff, PmisPrecheck, PmisRules } from "../../lib/api";

// Fallback so the page works even if the rules endpoint is unreachable (the server re-checks anyway).
const FALLBACK: PmisRules = { age_min: 18, age_max: 25, family_income_limit_lakh: 12, duration_months: [6, 9], stipend_inr_per_month: 9000, official_url: "https://pminternship.mca.gov.in/", version: "local" };
type Yes = "yes" | "no" | "unsure";
type Key = "family_govt_job" | "excluded_qualification" | "govt_apprenticeship" | "employed_full_time" | "income";

export default function PmisCheckPage() {
  const tr = useT();
  const lang = L3_LANG(useLocale());
  const [rules, setRules] = useState<PmisRules>(FALLBACK);
  const [step, setStep] = useState(0);
  const [age, setAge] = useState("");
  const [ans, setAns] = useState<Partial<Record<Key, Yes>>>({});
  const [result, setResult] = useState<PmisPrecheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [handoff, setHandoff] = useState<PmisHandoff | null>(null);

  useEffect(() => { api.pmisRules().then(setRules).catch(() => {}); api.pmisHandoff().then(setHandoff).catch(() => {}); }, []);

  const questions: { key: Key; icon: string; text: string }[] = [
    { key: "income", icon: "₹", text: `${tr("Is your family's total income more than")} ₹${rules.family_income_limit_lakh} ${tr("lakh in a year?")}` },
    { key: "family_govt_job", icon: "🏛", text: tr("Does anyone in your family have a permanent government job?") },
    { key: "excluded_qualification", icon: "🎓", text: tr("Do you have a degree like IIT, IIM, CA, MBA, MBBS or PhD?") },
    { key: "govt_apprenticeship", icon: "🛠", text: tr("Have you done, or are you doing, a government apprenticeship (NATS or NAPS)?") },
    { key: "employed_full_time", icon: "💼", text: tr("Do you have a full-time job right now?") },
  ];
  const total = questions.length + 1; // age + yes/no questions
  const ageNum = parseInt(age, 10);
  const ageOk = Number.isFinite(ageNum) && ageNum >= 10 && ageNum <= 80;

  const submit = async (a: Partial<Record<Key, Yes>>) => {
    setBusy(true); setError("");
    const tri = (v?: Yes) => (v === "yes" ? true : v === "no" ? false : null);
    const body: PmisAnswers = {
      age: ageNum,
      // Only a clear "yes" to the income question is a problem; "no" means within the limit.
      family_income_lakh: a.income === "yes" ? rules.family_income_limit_lakh + 1 : a.income === "no" ? 0 : null,
      family_govt_job: tri(a.family_govt_job), excluded_qualification: tri(a.excluded_qualification),
      govt_apprenticeship: tri(a.govt_apprenticeship), employed_full_time: tri(a.employed_full_time),
    };
    try { setResult(await api.pmisPrecheck(body)); }
    catch (e) { setError(e instanceof Error ? e.message : tr("Something went wrong.")); }
    finally { setBusy(false); }
  };

  const answer = (v: Yes) => {
    const q = questions[step - 1];
    const next = { ...ans, [q.key]: v };
    setAns(next);
    if (step === questions.length) submit(next); else setStep(step + 1);
  };
  const restart = () => { setStep(0); setAns({}); setAge(""); setResult(null); setError(""); };
  const official = result?.official_url || rules.official_url;

  return (
    <AuthShell visual={false}>
      <section className="login-card card-rise legal-card pmis-card">
        <div className="login-header">
          <p className="welcome-text">PMIS</p>
          <h1>{tr("Can I apply to PMIS?")}</h1>
          <p className="subtitle">{tr("Answer a few quick questions. Nothing you answer is saved.")}</p>
        </div>

        {!result && (
          <div className="login-form" aria-live="polite">
            <p className="pmis-progress">{tr("Question")} {step + 1} / {total}
              <span className="pmis-bar"><i style={{ width: `${((step + 1) / total) * 100}%` }} /></span></p>

            {step === 0 && (
              <div className="pmis-q">
                <div className="pmis-icon" aria-hidden="true">🎂</div>
                <label htmlFor="pmis-age" className="pmis-text">{tr("How old are you?")}</label>
                <input id="pmis-age" type="number" inputMode="numeric" min={10} max={80} className="pmis-age" value={age}
                  onChange={(e) => setAge(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && ageOk) setStep(1); }} />
                <button type="button" className="login-button" disabled={!ageOk} onClick={() => setStep(1)}>{tr("Next")}</button>
              </div>
            )}

            {step > 0 && (
              <div className="pmis-q">
                <div className="pmis-icon" aria-hidden="true">{questions[step - 1].icon}</div>
                <p className="pmis-text" id="pmis-q-text">{questions[step - 1].text}</p>
                <div className="pmis-choices" role="group" aria-labelledby="pmis-q-text">
                  <button type="button" className="pmis-choice" disabled={busy} onClick={() => answer("yes")}>{tr("Yes")}</button>
                  <button type="button" className="pmis-choice" disabled={busy} onClick={() => answer("no")}>{tr("No")}</button>
                  <button type="button" className="pmis-choice pmis-unsure" disabled={busy} onClick={() => answer("unsure")}>{tr("Not sure")}</button>
                </div>
                <button type="button" className="ghost-btn" onClick={() => setStep(step - 1)}>{tr("Back")}</button>
              </div>
            )}
            {error && <p className="notice" role="alert">{error}</p>}
          </div>
        )}

        {result && (
          <div className="login-form" aria-live="polite">
            <div className={`pmis-result pmis-${result.status}`}>
              <h2>{result.status === "likely_eligible" ? "✓ " : result.status === "likely_not_eligible" ? "! " : "? "}{(result.summary[lang] || result.summary.en)}</h2>
              {result.blockers.length > 0 && <ul>{result.blockers.map((b) => <li key={b.code}>{(b.text[lang] || b.text.en)}</li>)}</ul>}
              {result.status === "check_details" && <p>{tr("Some answers were \"Not sure\". Check those on the official portal.")}</p>}
            </div>
            <p className="notice">ⓘ {(result.notice[lang] || result.notice.en)}</p>
            {handoff && result.status !== "likely_not_eligible" && (
              <div className="pmis-docs">
                <h3>{tr("Keep these ready before you apply")}</h3>
                <ul>{handoff.documents.map((d) => <li key={d.id}>{(d.label[lang] || d.label.en)}</li>)}</ul>
                <p className="notice">{(handoff.note[lang] || handoff.note.en)}</p>
              </div>
            )}
            <div className="reco-actions">
              <a className="apply-btn linklike" href={official} target="_blank" rel="noopener noreferrer">{tr("Open official PMIS portal")}</a>
              {result.status !== "likely_not_eligible" && <Link href="/register" className="reco-edit">{tr("Find internships")}</Link>}
              <button type="button" className="ghost-btn" onClick={restart}>{tr("Start again")}</button>
            </div>
          </div>
        )}
      </section>
    </AuthShell>
  );
}
