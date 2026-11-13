"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { api, Activity, L3_LANG } from "../../../lib/api";
import { useT } from "../../../../i18n/useT";
import { useRouter } from "../../../../i18n/navigation";
import Header from "../../../components/Header";
import Stepper from "../../../components/Stepper";
import StepHero from "../../../components/StepHero";
import GroupedSkillPicker from "../../../components/GroupedSkillPicker";
import { useToast } from "../../../components/Toast";
import { loadProfileRemote, saveProfileRemote } from "../../../lib/store";
import { useTax } from "../../../lib/taxo";

export default function SkillsPage() {
  const tr = useT();
  const router = useRouter();
  const { items: skillItems } = useTax("skill");
  const { items: categories } = useTax("skill_category");
  const lang = L3_LANG(useLocale());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [moreActs, setMoreActs] = useState(false);
  const { toast, show } = useToast();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => { api.activities().then(setActivities).catch(() => {}); }, []);

  const idToName = new Map(skillItems.map((i) => [i.id, i.name]));
  const namesOf = (a: Activity) => a.skill_ids.map((i) => idToName.get(i)).filter(Boolean) as string[];
  const isOn = (a: Activity) => namesOf(a).length > 0 && namesOf(a).every((n) => selectedSkills.includes(n));
  const toggleActivity = (a: Activity) => {
    const ns = namesOf(a);
    setSelectedSkills((c) => (isOn(a) ? c.filter((x) => !ns.includes(x)) : [...new Set([...c, ...ns])]));
  };

  useEffect(() => {
    loadProfileRemote().then((p) => {
      if (p.skills) setSelectedSkills(p.skills);
    }).finally(() => setReady(true));
  }, []);

  const flip = (set: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    set((c) => (c.includes(v) ? c.filter((x) => x !== v) : [...c, v]));

  const next = async () => {
    if (selectedSkills.length === 0) return show(tr("Please select at least one skill."));
    setSaving(true);
    try {
      await saveProfileRemote({ skills: selectedSkills });
      router.push("/profile/preferences");
    } catch (e) {
      show(e instanceof Error ? e.message : tr("Could not save. Please try again."));
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <main className="profile-page">
        <Header />
        <section className="profile-container"><p className="muted" role="status">{tr("Loading…")}</p></section>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <Header />
      <section className="profile-container">
        <div className="profile-card skills-card card-rise">
          <StepHero art="skills" eyebrow={tr("STEP 2 OF 3")} title={tr("Tell us what you're good at")} text={tr("Select the skills you already have.")} />
          <Stepper current={2} />
          {activities.length > 0 && (
            <div className="activity-block">
              <h2>{tr("What have you done?")}</h2>
              <p className="activity-hint">{tr("Tap everything you have done. We add the matching skills for you.")}</p>
              <div className="activity-grid">
                {activities.filter((a, i) => moreActs || i < 16 || isOn(a)).map((a) => (
                  <button key={a.id} type="button" aria-pressed={isOn(a)} className={`activity-tile ${isOn(a) ? "selected" : ""}`} onClick={() => toggleActivity(a)}>
                    <span className="activity-icon" aria-hidden="true">{a.icon}</span>
                    <span>{(a.label[lang] || a.label.en)}</span>
                  </button>
                ))}
              </div>
              {activities.length > 16 && <button type="button" className="ghost-btn" onClick={() => setMoreActs(!moreActs)}>{moreActs ? tr("Show fewer activities") : tr("Show more activities")}</button>}
            </div>
          )}
          <GroupedSkillPicker title={tr("Your skills")} hint={tr("Select all that apply.")} skills={skillItems} categories={categories}
            selected={selectedSkills} onToggle={flip(setSelectedSkills)} onClear={() => setSelectedSkills([])} />
          <div className="skills-actions sticky-actions">
            <button type="button" className="back-button" onClick={() => router.push("/profile")}>← {tr("Back")}</button>
            <button type="button" className="profile-continue" disabled={saving} onClick={next}>
              {saving ? <span className="spinner" /> : <>{tr("Continue")}<span>→</span></>}
            </button>
          </div>
        </div>
      </section>
      {toast}
    </main>
  );
}
