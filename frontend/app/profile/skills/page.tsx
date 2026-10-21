"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import Stepper from "../../components/Stepper";
import { useToast } from "../../components/Toast";
import { loadProfile, saveProfile } from "../../lib/store";

const skills = [
  "Python",
  "JavaScript",
  "Java",
  "C++",
  "HTML/CSS",
  "SQL",
  "Excel",
  "Data Analysis",
  "Communication",
  "Problem Solving",
  "Digital Marketing",
  "Graphic Design",
];

const interests = [
  "Technology",
  "Finance",
  "Marketing",
  "Business",
  "Healthcare",
  "Education",
  "Design",
  "Social Impact",
];

export default function SkillsPage() {
  const router = useRouter();
  const { toast, show } = useToast();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  useEffect(() => {
    const p = loadProfile();
    if (p.skills) setSelectedSkills(p.skills);
    if (p.interests) setSelectedInterests(p.interests);
  }, []);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((current) =>
      current.includes(skill)
        ? current.filter((item) => item !== skill)
        : [...current, skill]
    );
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest]
    );
  };

  return (
    <main className="profile-page">
      <Header />

      <section className="profile-container">
        <div className="profile-card skills-card card-rise">
          <div className="profile-intro">
            <p className="profile-eyebrow">STEP 2 OF 3</p>

            <h1>Tell us what you&apos;re good at</h1>

            <p>
              Select the skills you already have and the areas you&apos;re
              interested in exploring.
            </p>
          </div>

          <Stepper current={2} />

          <div className="skills-section">
            <div className="section-heading">
              <div>
                <h2>Your skills</h2>
                <p>Select all that apply.</p>
              </div>

              <span className="selection-count" key={selectedSkills.length}>
                {selectedSkills.length} selected
              </span>
            </div>

            <div className="skill-grid">
              {skills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  className={`skill-chip ${
                    selectedSkills.includes(skill) ? "selected" : ""
                  }`}
                  onClick={() => toggleSkill(skill)}
                >
                  <span>
                    {selectedSkills.includes(skill) ? "✓" : "+"}
                  </span>
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <div className="skills-section interests-section">
            <div className="section-heading">
              <div>
                <h2>Your interests</h2>
                <p>What kind of work would you enjoy exploring?</p>
              </div>

              <span className="selection-count">
                {selectedInterests.length} selected
              </span>
            </div>

            <div className="interest-grid">
              {interests.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  className={`interest-card ${
                    selectedInterests.includes(interest) ? "selected" : ""
                  }`}
                  onClick={() => toggleInterest(interest)}
                >
                  <span className="interest-icon">
                    {selectedInterests.includes(interest) ? "✓" : "○"}
                  </span>

                  <span>{interest}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="skills-actions">
            <button
              type="button"
              className="back-button"
              onClick={() => router.push("/profile")}
            >
              ← Back
            </button>

            <button
              type="button"
              className="profile-continue"
              onClick={() => {
                if (selectedSkills.length === 0) return show("Please select at least one skill.");
                if (selectedInterests.length === 0) return show("Please select at least one interest.");
                saveProfile({ skills: selectedSkills, interests: selectedInterests });
                router.push("/profile/preferences");
              }}
            >
              Continue
              <span>→</span>
            </button>
          </div>
        </div>
      </section>
      {toast}
    </main>
  );
}