"use client";

import { useEffect, useState } from "react";
import { useT } from "../../../i18n/useT";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Header from "../../components/Header";
import Stepper from "../../components/Stepper";
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
      await saveProfileRemote({ education, degree, field, college });
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
          <div className="profile-intro">
            <p className="profile-eyebrow">{t("eyebrow")}</p>
            <h1>{t("heading")}</h1>
            <p>{t("description")}</p>
          </div>

          <Stepper current={1} />

          <div className="completion">
            <div className="completion-bar"><span style={{ width: `${(filled / 3) * 100}%` }} /></div>
            <small>{filled}/3 details added</small>
          </div>

          <div className="profile-form stagger">
            <div className="profile-field">
              <label htmlFor="education">{t("educationLevel")}</label>
              <select id="education" value={education} onChange={(e) => setEducation(e.target.value)}>
                {levels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div className="profile-field">
  <label htmlFor="degree">{t("degree")}</label>
  <input
    id="degree"
    type="text"
    value={degree}
    onChange={(e) => setDegree(e.target.value)}
    placeholder={t("degreePlaceholder")}
    list="degree-list"
  />
  <datalist id="degree-list">{degrees.map((d) => <option key={d} value={d} />)}</datalist>
</div>
            <div className="profile-field">
              <label htmlFor="field">{tr("Field of study")}</label>
              <input id="field" type="text" value={field} onChange={(e) => setField(e.target.value)} placeholder={tr("e.g. Computer Science")} list="field-list" />
              <datalist id="field-list">{fields.map((d) => <option key={d} value={d} />)}</datalist>
            </div>

            <div className="profile-field">
              <label htmlFor="college">{tr("College / Institution")}</label>
              <input id="college" type="text" value={college} onChange={(e) => setCollege(e.target.value)} placeholder={tr("Enter your college or institution")} />
            </div>

            <button type="button" className="profile-continue" onClick={next}>
              Continue <span>→</span>
            </button>
          </div>
        </div>
      </section>
      {toast}
    </main>
  );
}
