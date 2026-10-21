"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import { useToast } from "../components/Toast";
import { loadProfile, Profile } from "../lib/store";

type Internship = {
  id: number;
  title: string;
  company: string;
  domain: string;
  skills: string[];
  mode: "On-site" | "Hybrid" | "Remote";
  city: string;
  stipend: string;
  duration: string;
};

const internships: Internship[] = [
  { id: 1, title: "Frontend Developer Intern", company: "PixelForge Labs", domain: "Technology", skills: ["JavaScript", "HTML/CSS"], mode: "Remote", city: "Bengaluru", stipend: "₹15,000/mo", duration: "3 months" },
  { id: 2, title: "Data Analyst Intern", company: "InsightLoop", domain: "Technology", skills: ["Python", "SQL", "Data Analysis", "Excel"], mode: "Hybrid", city: "Pune", stipend: "₹12,000/mo", duration: "6 months" },
  { id: 3, title: "Backend Engineering Intern", company: "CloudNest", domain: "Technology", skills: ["Java", "SQL", "Problem Solving"], mode: "On-site", city: "Hyderabad", stipend: "₹20,000/mo", duration: "6 months" },
  { id: 4, title: "Financial Research Intern", company: "Arthaveda Capital", domain: "Finance", skills: ["Excel", "Data Analysis", "Communication"], mode: "On-site", city: "Mumbai", stipend: "₹18,000/mo", duration: "2 months" },
  { id: 5, title: "Digital Marketing Intern", company: "BrandBridge", domain: "Marketing", skills: ["Digital Marketing", "Communication", "Graphic Design"], mode: "Remote", city: "Delhi NCR", stipend: "₹8,000/mo", duration: "3 months" },
  { id: 6, title: "Business Development Intern", company: "ScaleUp India", domain: "Business", skills: ["Communication", "Problem Solving", "Excel"], mode: "Hybrid", city: "Delhi NCR", stipend: "₹10,000/mo", duration: "3 months" },
  { id: 7, title: "Health Data Intern", company: "CareLink Health", domain: "Healthcare", skills: ["Data Analysis", "Python", "Communication"], mode: "Hybrid", city: "Chennai", stipend: "₹10,000/mo", duration: "4 months" },
  { id: 8, title: "Curriculum Content Intern", company: "LearnLeaf", domain: "Education", skills: ["Communication", "Problem Solving"], mode: "Remote", city: "Kolkata", stipend: "₹7,000/mo", duration: "3 months" },
  { id: 9, title: "UI/UX Design Intern", company: "Studio Sutra", domain: "Design", skills: ["Graphic Design", "HTML/CSS", "Communication"], mode: "Hybrid", city: "Bengaluru", stipend: "₹14,000/mo", duration: "4 months" },
  { id: 10, title: "Community Outreach Intern", company: "Pragati Foundation", domain: "Social Impact", skills: ["Communication", "Problem Solving"], mode: "On-site", city: "Pune", stipend: "₹6,000/mo", duration: "2 months" },
  { id: 11, title: "C++ Systems Intern", company: "KernelWorks", domain: "Technology", skills: ["C++", "Problem Solving"], mode: "On-site", city: "Bengaluru", stipend: "₹22,000/mo", duration: "6 months" },
  { id: 12, title: "Growth Analytics Intern", company: "FunnelFox", domain: "Marketing", skills: ["Data Analysis", "SQL", "Digital Marketing"], mode: "Remote", city: "Mumbai", stipend: "₹12,000/mo", duration: "3 months" },
];


function score(job: Internship, p: Profile) {
  const skills = p.skills ?? [];
  const interests = p.interests ?? [];
  const domains = p.domains ?? [];

  // Skills: 30 points
  const skillPts = Math.round(
    (job.skills.filter((skill) => skills.includes(skill)).length /
      job.skills.length) *
      30
  );

  // Education: 25 points
  // Demo listings have no education requirements yet.
  // Keep this score neutral until requirements are available.
  const educationPts = 25;

  // Location: 20 points
  const anyLocation = !p.location || p.location === "Any location";
  const locationPts =
    anyLocation ||
    p.location === job.city ||
    p.relocate === "Yes"
      ? 20
      : 0;

  // Interest: 15 points
  const interestPts =
    domains.includes(job.domain)
      ? 15
      : interests.includes(job.domain)
        ? 10
        : 0;

  // Role: 5 points
  // Role preferences are not stored separately yet.
  const rolePts = 0;

  // Preferences: 5 points
  const modeMatches = !p.workMode || p.workMode === job.mode;
  const preferencesPts = modeMatches ? 5 : 0;

  return Math.min(
    100,
    skillPts +
      educationPts +
      locationPts +
      interestPts +
      rolePts +
      preferencesPts
  );
}


function getMatchDetails(job: Internship, p: Profile) {
  const skills = p.skills ?? [];
  const interests = p.interests ?? [];
  const domains = p.domains ?? [];

  const matchedSkills = job.skills.filter((skill) =>
    skills.includes(skill)
  );

  const missingSkills = job.skills.filter(
    (skill) => !skills.includes(skill)
  );

  const reasons: string[] = [];

  if (matchedSkills.length > 0) {
    reasons.push(
      `You have ${matchedSkills.join(", ")}`
    );
  }

  if (domains.includes(job.domain)) {
    reasons.push(`Matches your preferred ${job.domain} domain`);
  } else if (interests.includes(job.domain)) {
    reasons.push(`Matches your ${job.domain} interest`);
  }

  if (!p.location || p.location === "Any location" ||
      p.location === job.city || p.relocate === "Yes") {
    reasons.push("Location preference is compatible");
  }

  if (!p.workMode || p.workMode === job.mode) {
    reasons.push(`Matches your ${job.mode} work preference`);
  }

  return { matchedSkills, missingSkills, reasons };
}

function Ring({ value }: { value: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 150);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="ring" aria-label={`${value}% match`}>
      <svg viewBox="0 0 56 56">
        <circle className="ring-bg" cx="28" cy="28" r={r} />
        <circle
          className="ring-fg"
          cx="28"
          cy="28"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={on ? c * (1 - value / 100) : c}
        />
      </svg>
      <b>{value}%</b>
    </div>
  );
}

export default function RecommendationsPage() {
  const { toast, show } = useToast();
  const [profile, setProfile] = useState<Profile>({});
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState("All");
  const [saved, setSaved] = useState<number[]>([]);
const [savedReady, setSavedReady] = useState(false);
  

  useEffect(() => {
  setProfile(loadProfile());
  setReady(true);

  try {
    const stored = localStorage.getItem("internsetu_saved_internships");
    if (stored) {
      const parsed: unknown = JSON.parse(stored);

      if (
        Array.isArray(parsed) &&
        parsed.every(
          (id) => typeof id === "number" && Number.isFinite(id)
        )
      ) {
        setSaved(parsed);
      }
    }
  } catch {
    // Continue with an empty saved list if stored data is invalid.
  } finally {
    setSavedReady(true);
  }
}, []);
useEffect(() => {
  if (!savedReady) return;

  try {
    localStorage.setItem(
      "internsetu_saved_internships",
      JSON.stringify(saved)
    );
  } catch {
    // Saving may fail if browser storage is unavailable.
  }
}, [saved, savedReady]);

  const ranked = useMemo(
    () =>
      internships
        .map((j) => ({ ...j, match: score(j, profile) }))
        .sort((a, b) => b.match - a.match),
    [profile]
  );

  const list = ranked.filter((j) => mode === "All" || j.mode === mode);
  const best = ranked.filter((j) => j.match >= 70).length;

  const domainStats = (profile.domains ?? []).map((d) => {
    const items = ranked.filter((j) => j.domain === d);
    const avg = items.length
      ? Math.round(items.reduce((s, j) => s + j.match, 0) / items.length)
      : 0;
    return { d, avg };
  });

  const toggle = (arr: number[], id: number) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  return (
    <main className="profile-page">
      <Header label="Your Recommendations" />
      <section className="reco-wrap">
        <div className="reco-hero card-rise">
          <div>
            <p className="profile-eyebrow">PERSONALISED FOR YOU</p>
            <h1>Your internship matches</h1>
            <p className="reco-sub">
              {ready && profile.degree
                ? `Based on your ${profile.degree}${profile.field ? ` in ${profile.field}` : ""}, your skills and your preferences.`
                : "Complete your profile for sharper, more personal matches."}
            </p>
            <div className="reco-actions">
              <Link href="/profile" className="reco-edit">Edit profile</Link>
              <Link href="/profile/preferences" className="reco-edit">Change preferences</Link>
            </div>
          </div>
          <div className="reco-stats">
            <div><b>{ranked.length}</b><span>Internships</span></div>
            <div><b>{best}</b><span>Strong matches</span></div>
            <div><b>{(profile.skills ?? []).length}</b><span>Your skills</span></div>
          </div>
        </div>

        {domainStats.length > 0 && (
          <div className="reco-panel card-rise" style={{ "--d": "0.1s" } as React.CSSProperties}>
            <h2>Match by domain</h2>
            {domainStats.map((s) => (
              <div className="bar-row" key={s.d}>
                <span>{s.d}</span>
                <div className="bar"><i style={{ width: ready ? `${s.avg}%` : 0 }} /></div>
                <b>{s.avg}%</b>
              </div>
            ))}
          </div>
        )}

        <div className="reco-filters">
          {["All", "Remote", "Hybrid", "On-site"].map((m) => (
            <button key={m} type="button" className={mode === m ? "on" : ""} onClick={() => setMode(m)}>
              {m}
            </button>
          ))}
        </div>

        <div className="job-grid stagger">
          {list.map((j) => {
  const details = getMatchDetails(j, profile);

  return (
            <article className="job-card" key={j.id}>
              <div className="job-top">
                <div className="job-avatar">{j.company.charAt(0)}</div>
                <div className="job-title">
                  <h3>{j.title}</h3>
                  <p>{j.company} · {j.city}</p>
                </div>
                <Ring value={j.match} />
              </div>
              <div className="job-tags">
                <span className="tag tag-domain">{j.domain}</span>
                <span className="tag">{j.mode}</span>
                <span className="tag">{j.duration}</span>
              </div>
              
<div className="job-skills">
  {j.skills.map((s) => (
    <small
      key={s}
      className={(profile.skills ?? []).includes(s) ? "have" : ""}
    >
      {(profile.skills ?? []).includes(s) ? "✓ " : ""}
      {s}
    </small>
  ))}
</div>

              
<div style={{ marginTop: "16px" }}>
  <h4>Why this matches</h4>
  {details.reasons.length > 0 ? (
    <ul>
      {details.reasons.map((reason) => (
        <li key={reason}>{reason}</li>
      ))}
    </ul>
  ) : (
    <p>Build relevant skills to improve this match.</p>
  )}

  <h4>Skills to improve</h4>
  {details.missingSkills.length > 0 ? (
    <div className="job-skills">
      {details.missingSkills.map((skill) => (
        <small key={skill}>{skill}</small>
      ))}
    </div>
  ) : (
    <p>You have all the listed skills for this demo internship.</p>
  )}
</div>

              <div className="job-bottom">
                <strong>{j.stipend}</strong>
                <div>
                  <button
                    type="button"
                    className={`save-btn ${saved.includes(j.id) ? "on" : ""}`}
                    aria-label="Save internship"
                    onClick={() => {
                      setSaved(toggle(saved, j.id));
                      show(saved.includes(j.id) ? "Removed from saved." : "Saved for later.", "success");
                    }}
                  >
                    {saved.includes(j.id) ? "♥" : "♡"}
                  </button>
                  <span
  className="apply-btn"
  aria-label="Application link unavailable in demo"
  title="Official application link is not available for this demo listing"
>
  Demo listing
</span>
                </div>
              </div>
            
            </article>
          );
        })}
        </div>
      </section>
      {toast}
    </main>
  );
}

