"use client";

import { useEffect, useState } from "react";
import { useT } from "../../../i18n/useT";
import { useRouter } from "../../../i18n/navigation";
import { useTranslations } from "next-intl";
import Header from "../../components/Header";
import SelectOther from "../../components/SelectOther";
import Stepper from "../../components/Stepper";
import StepHero from "../../components/StepHero";
import { iconFor } from "../../lib/illustrations";
import { useToast } from "../../components/Toast";
import { loadProfileRemote, saveProfileRemote } from "../../lib/store";
import { useTax } from "../../lib/taxo";


export default function ProfilePage() {
  const tr = useT();
  const t = useTranslations("Profile");
  const levels = useTax("education_level").names;
  const degrees = useTax("degree").names;
  const fields = useTax("field_of_study").names;
  const router = useRouter();
  const { toast, show } = useToast();
  const [education, setEducation] = useState("Undergraduate");
  const [degree, setDegree] = useState("");
  const [field, setField] = useState("");
  const [college, setCollege] = useState("");

  useEffect(() => {
    loadProfileRemote().then((p) => {
      if (p.education) setEducation(p.education);
      if (p.degree) setDegree(p.degree);
      if (p.field) setField(p.field);
      if (p.college) setCollege(p.college);
    });
  }, []);
  useEffect(() => {
    if (levels.length && !levels.includes(education)) setEducation(levels[0]);
  }, [levels, education]);

  const filled = [degree, field, college].filter((v) => v.trim()).length;

  const next = async () => {
    if (!degree.trim() || !field.trim() || !college.trim()) {
      show(tr("Please fill in your degree, field of study and college."));
      return;
    }
    try {
      await saveProfileRemote({ education, degree: degree.trim(), field: field.trim(), college: college.trim() });
      router.push("/profile/skills");
    } catch (e) {
      show(e instanceof Error ? e.message : tr("Could not save. Please try again."));
    }
  };

  return (
    <main className="profile-page">
      <Header />
      <section className="profile-container">
        <div className="profile-card card-rise">
          <StepHero art="education" eyebrow={t("eyebrow")} title={t("heading")} text={t("description")} />

          <Stepper current={1} />

          <div className="completion">
            <div className="completion-bar"><span style={{ width: `${(filled / 3) * 100}%` }} /></div>
            <small>{filled}/3 {tr("details added")}</small>
          </div>

          <div className="profile-form stagger">
            <div className="profile-field">
              <span id="edu-label" className="field-label">{t("educationLevel")}</span>
              <div className="icon-grid" role="radiogroup" aria-labelledby="edu-label">
                {levels.map((level) => (
                  <button key={level} type="button" role="radio" aria-checked={education === level} className={`icon-tile ${education === level ? "selected" : ""}`} onClick={() => setEducation(level)}>
                    <span className="icon-emoji" aria-hidden="true">{iconFor(level)}</span>
                    <strong>{level}</strong>
                  </button>
                ))}
              </div>
            </div>

            <SelectOther id="degree" label={t("degree")} options={degrees} value={degree} onChange={setDegree} placeholder={t("degreePlaceholder")} />
            <SelectOther id="field" label={tr("Field of study")} options={fields} value={field} onChange={setField} placeholder={tr("e.g. Computer Science")} />

            <div className="profile-field">
              <label htmlFor="college">{tr("College / Institution")}</label>
              <input id="college" type="text" value={college} onChange={(e) => setCollege(e.target.value)} placeholder={tr("Enter your college or institution")} />
            </div>

            <button type="button" className="profile-continue" onClick={next}>
              {tr("Continue")} <span>→</span>
            </button>
          </div>
        </div>
      </section>
      {toast}
    </main>
  );
}
