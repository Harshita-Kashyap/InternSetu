"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Header from "../components/Header";
import Stepper from "../components/Stepper";
import { useToast } from "../components/Toast";
import { loadProfile, saveProfile } from "../lib/store";

const educationLevels = ["Class 10", "Class 12", "Diploma", "Undergraduate", "Postgraduate"];

export default function ProfilePage() {
  const t = useTranslations("Profile");
  const router = useRouter();
  const { toast, show } = useToast();
  const [education, setEducation] = useState("Undergraduate");
  const [degree, setDegree] = useState("");
  const [field, setField] = useState("");
  const [college, setCollege] = useState("");

  useEffect(() => {
    const p = loadProfile();
    if (p.education) setEducation(p.education);
    if (p.degree) setDegree(p.degree);
    if (p.field) setField(p.field);
    if (p.college) setCollege(p.college);
  }, []);

  const filled = [degree, field, college].filter((v) => v.trim()).length;

  const next = () => {
    if (!degree.trim() || !field.trim() || !college.trim()) {
      show("Please fill in your degree, field of study and college.");
      return;
    }
    saveProfile({ education, degree, field, college });
    router.push("/profile/skills");
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
                {educationLevels.map((level) => (
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
  />
</div>
            <div className="profile-field">
              <label htmlFor="field">Field of study</label>
              <input id="field" type="text" value={field} onChange={(e) => setField(e.target.value)} placeholder="e.g. Computer Science" />
            </div>

            <div className="profile-field">
              <label htmlFor="college">College / Institution</label>
              <input id="college" type="text" value={college} onChange={(e) => setCollege(e.target.value)} placeholder="Enter your college or institution" />
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
