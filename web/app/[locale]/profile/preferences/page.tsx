"use client";

import { useEffect, useState } from "react";
import { useT } from "../../../../i18n/useT";
import { useRouter } from "../../../../i18n/navigation";
import Header from "../../../components/Header";
import SelectOther from "../../../components/SelectOther";
import Stepper from "../../../components/Stepper";
import ChipPicker from "../../../components/ChipPicker";
import { useToast } from "../../../components/Toast";
import { loadProfileRemote, saveProfileRemote, Profile } from "../../../lib/store";
import { useTax } from "../../../lib/taxo";

type Mode = NonNullable<Profile["relocate"]>;

export default function PreferencesPage() {
  const tr = useT();
  const router = useRouter();
  const cities = useTax("city").names;
  const domains = useTax("sector").names;
  const { toast, show } = useToast();
  const [home, setHome] = useState("");
  const [mode, setMode] = useState<Mode | "">("");
  const [extra, setExtra] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfileRemote().then((p) => {
      if (p.location) setHome(p.location);
      if (p.relocate) setMode(p.relocate);
      if (p.preferredLocations) setExtra(p.preferredLocations);
      if (p.domains) setPicked(p.domains);
    });
  }, []);

  const flip = (set: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    set((c) => (c.includes(v) ? c.filter((x) => x !== v) : [...c, v]));

  const submit = async () => {
    if (!home.trim()) return show(tr("Please select the city where you live."));
    if (!mode) return show(tr("Please choose how far you are willing to go."));
    if (mode === "selected" && extra.length === 0) return show(tr("Please pick at least one other city."));
    if (picked.length === 0) return show(tr("Please select at least one preferred domain."));
    setSaving(true);
    try {
      await saveProfileRemote({ location: home.trim(), relocate: mode, preferredLocations: extra, domains: picked });
      router.push("/profile-summary");
    } catch (e) {
      show(e instanceof Error ? e.message : tr("Could not save. Please try again."));
      setSaving(false);
    }
  };

  const modes: { id: Mode; title: string; hint: string }[] = [
    { id: "nearby", title: tr("Nearby only"), hint: tr("Opportunities in or close to my city") },
    { id: "selected", title: tr("Selected cities"), hint: tr("My city plus cities I choose") },
    { id: "anywhere", title: tr("Anywhere in India"), hint: tr("I am willing to relocate") },
  ];

  return (
    <main className="profile-page">
      <Header />
      <section className="profile-container">
        <div className="profile-card preferences-card card-rise">
          <div className="profile-intro">
            <p className="profile-eyebrow">{tr("STEP 3 OF 3")}</p>
            <h1>{tr("Where would you like to work?")}</h1>
            <p>{tr("Location is a preference, not a rule: internships elsewhere can still match, they just score a little lower.")}</p>
          </div>
          <Stepper current={3} />

          <div className="preferences-form">
            <SelectOther id="home" label={tr("Where do you live?")} options={cities} value={home} onChange={setHome} placeholder={tr("Type your city or town")} />

            <div className="preference-group">
              <div className="preference-heading">
                <h2>{tr("How far are you willing to go?")}</h2>
                <p>{tr("This decides how much location affects your matches.")}</p>
              </div>
              <div className="choice-grid three" role="radiogroup" aria-label={tr("Location preference")}>
                {modes.map((m) => (
                  <button key={m.id} type="button" role="radio" aria-checked={mode === m.id}
                    className={`choice-card ${mode === m.id ? "selected" : ""}`} onClick={() => setMode(m.id)}>
                    <span className="choice-radio">{mode === m.id ? "✓" : ""}</span>
                    <span><strong>{m.title}</strong><small>{m.hint}</small></span>
                  </button>
                ))}
              </div>
            </div>

            {mode === "selected" && (
              <ChipPicker kind="skill" title={tr("Other cities you would consider")} hint={tr("Select all that apply.")}
                options={cities.filter((c) => c !== home)} selected={extra} onToggle={flip(setExtra)} />
            )}

            <ChipPicker kind="skill" title={tr("Preferred domains")} hint={tr("Select the areas you would like to explore.")}
              options={domains} selected={picked} onToggle={flip(setPicked)} />
          </div>

          <div className="skills-actions sticky-actions">
            <button type="button" className="back-button" onClick={() => router.push("/profile/skills")}>← {tr("Back")}</button>
            <button type="button" className="profile-continue" disabled={saving} onClick={submit}>
              {saving ? <span className="spinner" /> : <>{tr("Review my profile")}<span>→</span></>}
            </button>
          </div>
        </div>
      </section>
      {toast}
    </main>
  );
}
