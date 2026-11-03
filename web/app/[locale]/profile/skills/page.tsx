"use client";

import { useEffect, useState } from "react";
import { useT } from "../../../../i18n/useT";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import Stepper from "../../../components/Stepper";
import Picker from "../../../components/ChipPicker";
import { useToast } from "../../../components/Toast";
import { loadProfileRemote, saveProfileRemote } from "../../../lib/store";
import { useTax } from "../../../lib/taxo";

export default function SkillsPage() {
  const tr = useT();
  const router = useRouter();
  const skills = useTax("skill").names;
  const interests = useTax("interest").names;
  const { toast, show } = useToast();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfileRemote().then((p) => {
      if (p.skills) setSelectedSkills(p.skills);
      if (p.interests) setSelectedInterests(p.interests);
    });
  }, []);

  const flip = (set: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    set((c) => (c.includes(v) ? c.filter((x) => x !== v) : [...c, v]));

  const next = async () => {
    if (selectedSkills.length === 0) return show(tr("Please select at least one skill."));
    if (selectedInterests.length === 0) return show(tr("Please select at least one interest."));
    setSaving(true);
    try {
      await saveProfileRemote({ skills: selectedSkills, interests: selectedInterests });
      router.push("/profile/preferences");
    } catch (e) {
      show(e instanceof Error ? e.message : tr("Could not save. Please try again."));
      setSaving(false);
    }
  };

  return (
    <main className="profile-page">
      <Header />
      <section className="profile-container">
        <div className="profile-card skills-card card-rise">
          <div className="profile-intro">
            <p className="profile-eyebrow">{tr("STEP 2 OF 3")}</p>
            <h1>{tr("Tell us what you're good at")}</h1>
            <p>{tr("Select the skills you already have and the areas you're interested in exploring.")}</p>
          </div>
          <Stepper current={2} />
          <Picker kind="skill" title={tr("Your skills")} hint={tr("Select all that apply.")} options={skills}
            selected={selectedSkills} onToggle={flip(setSelectedSkills)} />
          <Picker kind="interest" title={tr("Your interests")} hint={tr("What kind of work would you enjoy exploring?")}
            options={interests} selected={selectedInterests} onToggle={flip(setSelectedInterests)} />
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
