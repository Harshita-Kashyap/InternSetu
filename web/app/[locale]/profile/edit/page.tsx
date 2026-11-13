"use client";

import { useEffect, useState } from "react";
import { useT } from "../../../../i18n/useT";
import { useRouter } from "../../../../i18n/navigation";
import Header from "../../../components/Header";
import ChipPicker from "../../../components/ChipPicker";
import GroupedSkillPicker from "../../../components/GroupedSkillPicker";
import SelectOther from "../../../components/SelectOther";
import { useToast } from "../../../components/Toast";
import { api } from "../../../lib/api";
import { loadProfileRemote, saveProfileRemote, Profile } from "../../../lib/store";
import { useTax } from "../../../lib/taxo";

type Mode = NonNullable<Profile["relocate"]>;

/** Edit Profile: one prefilled, sectioned page that updates the existing profile (PATCH), not the onboarding steps. */
export default function EditProfilePage() {
  const tr = useT();
  const router = useRouter();
  const { toast, show } = useToast();
  const levels = useTax("education_level").names;
  const degrees = useTax("degree").names;
  const fields = useTax("field_of_study").names;
  const skillItems = useTax("skill").items;
  const skillCats = useTax("skill_category").items;
  const cities = useTax("city").names;
  const sectors = useTax("sector").names;
  const [orig, setOrig] = useState<Profile | null>(null);
  const [p, setP] = useState<Profile>({});
  const [wasComplete, setWasComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([loadProfileRemote(), api.getProfile().catch(() => null)]).then(([lp, ap]) => {
      setOrig(lp); setP(lp); setWasComplete(ap?.status === "complete");
    }).catch(() => { setOrig({}); setErr(tr("Could not load your profile. Please try again.")); });
  }, []);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => { setSaved(false); setP((c) => ({ ...c, [k]: v })); };
  const flip = (k: "skills" | "domains" | "preferredLocations") => (v: string) =>
    set(k, ((p[k] as string[] | undefined) ?? []).includes(v) ? (p[k] as string[]).filter((x) => x !== v) : [...((p[k] as string[] | undefined) ?? []), v]);

  const save = async () => {
    setErr("");
    if (!p.degree?.trim() || !p.field?.trim() || !p.college?.trim()) return setErr(tr("Please fill in your degree, field of study and college."));
    if (!p.location?.trim()) return setErr(tr("Please select the city where you live."));
    if (!(p.skills?.length)) return setErr(tr("Please select at least one skill."));
    setSaving(true);
    try {
      await saveProfileRemote({ ...p, degree: p.degree.trim(), field: p.field.trim(), college: p.college.trim(), location: p.location.trim(), relocate: p.relocate ?? "nearby" });
      if (wasComplete) await api.confirmProfile();
      setSaved(true); setOrig(p); show(tr("Profile updated."), "success");
    } catch (e) { setErr(e instanceof Error ? e.message : tr("Could not save. Please try again.")); }
    setSaving(false);
  };

  const modes: { id: Mode; title: string }[] = [
    { id: "nearby", title: tr("Nearby only") }, { id: "selected", title: tr("Selected cities") }, { id: "anywhere", title: tr("Anywhere in India") },
  ];
  const dirty = JSON.stringify(orig) !== JSON.stringify(p);

  if (orig === null) {
    return (
      <main className="profile-page">
        <Header label={tr("Edit profile")} />
        <section className="profile-container"><p className="muted" role="status">{tr("Loading…")}</p></section>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <Header label={tr("Edit profile")} />
      <section className="profile-container">
        <div className="profile-card edit-card card-rise">
          <div className="profile-intro">
            <p className="profile-eyebrow">{tr("YOUR PROFILE")}</p>
            <h1>{tr("Update your profile")}</h1>
            <p>{tr("Change anything below, then press Save changes. Your saved details are already filled in.")}</p>
          </div>
          {err && <p className="notice" role="alert">{err}</p>}
          {saved && <p className="notice ok" role="status">✓ {tr("Profile updated.")}</p>}

          <fieldset className="edit-section"><legend>{tr("Education")}</legend>
            <div className="profile-field">
              <label htmlFor="education">{tr("Education level")}</label>
              <select id="education" value={p.education ?? ""} onChange={(e) => set("education", e.target.value)}>
                {levels.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <SelectOther id="degree" label={tr("Degree / Course")} options={degrees} value={p.degree ?? ""} onChange={(v) => set("degree", v)} />
            <SelectOther id="field" label={tr("Field of study")} options={fields} value={p.field ?? ""} onChange={(v) => set("field", v)} />
            <div className="profile-field">
              <label htmlFor="college">{tr("College / Institution")}</label>
              <input id="college" value={p.college ?? ""} onChange={(e) => set("college", e.target.value)} />
            </div>
          </fieldset>

          <fieldset className="edit-section"><legend>{tr("Skills")}</legend>
            <GroupedSkillPicker title={tr("Skills")} hint={tr("Select all that apply.")} skills={skillItems} categories={skillCats} selected={p.skills ?? []} onToggle={flip("skills")} onClear={() => set("skills", [])} />
          </fieldset>

          <fieldset className="edit-section"><legend>{tr("Location and preferences")}</legend>
            <SelectOther id="home" label={tr("Where do you live?")} options={cities} value={p.location ?? ""} onChange={(v) => set("location", v)} placeholder={tr("Type your city or town")} />
            <div className="choice-grid three" role="radiogroup" aria-label={tr("Location preference")}>
              {modes.map((m) => (
                <button key={m.id} type="button" role="radio" aria-checked={p.relocate === m.id} className={`choice-card ${p.relocate === m.id ? "selected" : ""}`} onClick={() => set("relocate", m.id)}>
                  <span className="choice-radio">{p.relocate === m.id ? "✓" : ""}</span><span><strong>{m.title}</strong></span>
                </button>
              ))}
            </div>
            {p.relocate === "selected" && (
              <ChipPicker kind="skill" title={tr("Other cities you would consider")} hint={tr("Select all that apply.")} options={cities.filter((c) => c !== p.location)} selected={p.preferredLocations ?? []} onToggle={flip("preferredLocations")} />
            )}
            <ChipPicker kind="skill" title={tr("Preferred domains")} hint={tr("Select the areas you would like to explore.")} options={sectors} selected={p.domains ?? []} onToggle={flip("domains")} />
          </fieldset>

          <div className="skills-actions sticky-actions">
            <button type="button" className="back-button" onClick={() => router.push("/home")}>{tr("Cancel")}</button>
            <button type="button" className="profile-continue" disabled={saving || !dirty} onClick={save}>
              {saving ? <span className="spinner" /> : tr("Save changes")}
            </button>
          </div>
        </div>
      </section>
      {toast}
    </main>
  );
}
