"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import Stepper from "../../components/Stepper";
import { useToast } from "../../components/Toast";
import { loadProfile, saveProfile } from "../../lib/store";

const locations = [
  "Any location",
  "Delhi NCR",
  "Mumbai",
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Kolkata",
];

const workModes = [
  "On-site",
  "Hybrid",
  "Remote",
];

const domains = [
  "Technology",
  "Finance",
  "Marketing",
  "Business",
  "Healthcare",
  "Education",
  "Design",
  "Social Impact",
];

export default function PreferencesPage() {
  const router = useRouter();
  const { toast, show } = useToast();
  const [location, setLocation] = useState("Any location");
  const [relocate, setRelocate] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);

  useEffect(() => {
    const pr = loadProfile();
    if (pr.location) setLocation(pr.location);
    if (pr.relocate) setRelocate(pr.relocate);
    if (pr.workMode) setWorkMode(pr.workMode);
    if (pr.domains) setSelectedDomains(pr.domains);
    else if (pr.interests) setSelectedDomains(pr.interests.filter((i) => domains.includes(i)));
  }, []);

  const toggleDomain = (domain: string) => {
    setSelectedDomains((current) =>
      current.includes(domain)
        ? current.filter((item) => item !== domain)
        : [...current, domain]
    );
  };

  const handleContinue = () => {
    if (!relocate) return show("Please tell us whether you are willing to relocate.");
    if (!workMode) return show("Please select your preferred work mode.");
    if (selectedDomains.length === 0) return show("Please select at least one preferred domain.");
    saveProfile({ location, relocate, workMode, domains: selectedDomains });
    router.push("/profile-summary");
  };

  return (
    <main className="profile-page">
      <Header />

      <section className="profile-container">
        <div className="profile-card preferences-card card-rise">
          <div className="profile-intro">
            <p className="profile-eyebrow">STEP 3 OF 3</p>

            <h1>Where would you like to work?</h1>

            <p>
              Tell us about your location and work preferences so we can find
              opportunities that fit your situation.
            </p>
          </div>

          <Stepper current={3} />

          <div className="preferences-form">
            <div className="profile-field">
              <label htmlFor="location">Preferred location</label>

              <select
                id="location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              >
                {locations.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <p className="field-hint">
                Choose &quot;Any location&quot; if you are open to opportunities
                anywhere in India.
              </p>
            </div>

            <div className="preference-group">
              <div className="preference-heading">
                <h2>Are you willing to relocate?</h2>
                <p>This helps us include opportunities outside your preferred location.</p>
              </div>

              <div className="choice-grid">
                <button
                  type="button"
                  className={`choice-card ${relocate === "Yes" ? "selected" : ""}`}
                  onClick={() => setRelocate("Yes")}
                >
                  <span className="choice-radio">
                    {relocate === "Yes" ? "✓" : ""}
                  </span>

                  <span>
                    <strong>Yes</strong>
                    <small>I&apos;m open to relocating</small>
                  </span>
                </button>

                <button
                  type="button"
                  className={`choice-card ${relocate === "No" ? "selected" : ""}`}
                  onClick={() => setRelocate("No")}
                >
                  <span className="choice-radio">
                    {relocate === "No" ? "✓" : ""}
                  </span>

                  <span>
                    <strong>No</strong>
                    <small>I prefer to stay nearby</small>
                  </span>
                </button>
              </div>
            </div>

            <div className="preference-group">
              <div className="preference-heading">
                <h2>Preferred work mode</h2>
                <p>Choose the type of workplace you prefer.</p>
              </div>

              <div className="work-mode-grid">
                {workModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`work-mode-card ${
                      workMode === mode ? "selected" : ""
                    }`}
                    onClick={() => setWorkMode(mode)}
                  >
                    <span className="mode-icon">
                      {workMode === mode ? "✓" : "○"}
                    </span>

                    <span>{mode}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="preference-group">
              <div className="preference-heading">
                <h2>Preferred domains</h2>
                <p>Select the areas you would like to explore.</p>
              </div>

              <div className="domain-grid">
                {domains.map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    className={`domain-chip ${
                      selectedDomains.includes(domain) ? "selected" : ""
                    }`}
                    onClick={() => toggleDomain(domain)}
                  >
                    <span>
                      {selectedDomains.includes(domain) ? "✓" : "+"}
                    </span>

                    {domain}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="skills-actions">
            <button
              type="button"
              className="back-button"
              onClick={() => router.push("/profile/skills")}
            >
              ← Back
            </button>

            <button
              type="button"
              className="profile-continue"
              onClick={handleContinue}
            >
              Find my internships
              <span>→</span>
            </button>
          </div>
        </div>
      </section>
      {toast}
    </main>
  );
}