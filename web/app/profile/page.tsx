"use client";

import { useState } from "react";

const educationLevels = [
  "Class 10",
  "Class 12",
  "Diploma",
  "Undergraduate",
  "Postgraduate",
];

export default function ProfilePage() {
  const [education, setEducation] = useState("Undergraduate");
  const [degree, setDegree] = useState("");
  const [field, setField] = useState("");
  const [college, setCollege] = useState("");

  return (
    <main className="profile-page">
      {/* Header */}
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

      {/* Main Content */}
      <section className="profile-container">
        <div className="profile-card">

          {/* Heading */}
          <div className="profile-intro">
            <p className="profile-eyebrow">LET&apos;S GET STARTED</p>

            <h1>Let&apos;s find the right internship for you</h1>

            <p>
              Tell us about your education, skills, and preferences so we can
              personalize your internship recommendations.
            </p>
          </div>

          {/* Progress */}
          <div className="progress-section">

            <div className="progress-step active">
              <div className="step-circle">1</div>
              <span>Education</span>
            </div>

            <div className="progress-line"></div>

            <div className="progress-step">
              <div className="step-circle">2</div>
              <span>Skills &amp; Interests</span>
            </div>

            <div className="progress-line"></div>

            <div className="progress-step">
              <div className="step-circle">3</div>
              <span>Preferences</span>
            </div>

          </div>

          {/* Form */}
          <div className="profile-form">

            {/* Education */}
            <div className="profile-field">
              <label htmlFor="education">
                Education level
              </label>

              <select
                id="education"
                value={education}
                onChange={(event) => setEducation(event.target.value)}
              >
                {educationLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            {/* Degree */}
            <div className="profile-field">
              <label htmlFor="degree">
                Degree / Course
              </label>

              <input
                id="degree"
                type="text"
                value={degree}
                onChange={(event) => setDegree(event.target.value)}
                placeholder="e.g. B.Tech, B.Com, BBA"
              />
            </div>

            {/* Field */}
            <div className="profile-field">
              <label htmlFor="field">
                Field of study
              </label>

              <input
                id="field"
                type="text"
                value={field}
                onChange={(event) => setField(event.target.value)}
                placeholder="e.g. Computer Science"
              />
            </div>

            {/* College */}
            <div className="profile-field">
              <label htmlFor="college">
                College / Institution
              </label>

              <input
                id="college"
                type="text"
                value={college}
                onChange={(event) => setCollege(event.target.value)}
                placeholder="Enter your college or institution"
              />
            </div>

            {/* Continue */}
            <button
              type="button"
              className="profile-continue"
              onClick={() => {
                alert("Step 2 will be added next.");
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