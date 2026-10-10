"use client";

import { useState } from "react";

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
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

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
      <header className="profile-header">
        <div className="profile-brand">
          <span>InternSetu</span>
        </div>

        <div className="profile-header-right">
          <span>Profile Setup</span>

          <button
            type="button"
            className="logout-button"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <section className="profile-container">
        <div className="profile-card skills-card">
          <div className="profile-intro">
            <p className="profile-eyebrow">STEP 2 OF 3</p>

            <h1>Tell us what you&apos;re good at</h1>

            <p>
              Select the skills you already have and the areas you&apos;re
              interested in exploring.
            </p>
          </div>

          <div className="progress-section">
            <div className="progress-step completed">
              <div className="step-circle">✓</div>
              <span>Education</span>
            </div>

            <div className="progress-line active"></div>

            <div className="progress-step active">
              <div className="step-circle">2</div>
              <span>Skills &amp; Interests</span>
            </div>

            <div className="progress-line"></div>

            <div className="progress-step">
              <div className="step-circle">3</div>
              <span>Preferences</span>
            </div>
          </div>

          <div className="skills-section">
            <div className="section-heading">
              <div>
                <h2>Your skills</h2>
                <p>Select all that apply.</p>
              </div>

              <span className="selection-count">
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
              onClick={() => {
                window.location.href = "/profile";
              }}
            >
              ← Back
            </button>

            <button
              type="button"
              className="profile-continue"
              onClick={() => {
                if (selectedSkills.length === 0) {
                  alert("Please select at least one skill.");
                  return;
                }

                if (selectedInterests.length === 0) {
                  alert("Please select at least one interest.");
                  return;
                }

                window.location.href = "/profile/preferences";
              }}
            >
              Continue
              <span>→</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}