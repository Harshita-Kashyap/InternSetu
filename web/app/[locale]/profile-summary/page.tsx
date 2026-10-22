"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import { loadProfileRemote, type Profile } from "../../lib/store";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../components/Toast";

export default function ProfileSummaryPage() {
  const router = useRouter();
  const { toast, show } = useToast();
  const [profile, setProfile] = useState<Profile>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadProfileRemote().then((p) => { setProfile(p); setReady(true); });
  }, []);

  if (!ready) {
    return <main className="profile-page"><Header /></main>;
  }

  const skills = profile.skills ?? [];
  const interests = profile.interests ?? [];
  const domains = profile.domains ?? [];

  const missingItems = [
    !profile.education && "education level",
    !profile.degree?.trim() && "degree or qualification",
    !profile.field?.trim() && "field of study",
    skills.length === 0 && "at least one skill",
    interests.length === 0 && "at least one interest",
    !profile.relocate && "relocation preference",
    !profile.workMode && "work mode",
    domains.length === 0 && "preferred domain",
  ].filter(Boolean) as string[];

  const editSection = (path: string) => router.push(path);

  const getRecommendations = async () => {
    if (missingItems.length > 0) {
      show("Please complete your missing profile details before continuing.");
      return;
    }
    try {
      await api.confirmProfile();
      router.push("/recommendations");
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not confirm your profile.");
    }
  };

  const value = (item?: string) => item?.trim() || "Not provided";

  return (
    <main className="profile-page">
      <Header />

      <section className="profile-container">
        <div className="profile-card card-rise">
          <div className="profile-intro">
            <p className="profile-eyebrow">PROFILE REVIEW</p>
            <h1>Review your profile</h1>
            <p>
              Check your details before we find internships that match your
              skills, education and preferences.
            </p>
          </div>

          {missingItems.length > 0 && (
            <div
              role="alert"
              style={{
                padding: "14px",
                marginBottom: "20px",
                border: "1px solid #e8bd70",
                borderRadius: "12px",
                background: "#fff8e8",
                color: "#714b0c",
              }}
            >
              <strong>Your profile needs a few more details.</strong>
              <p style={{ marginBottom: 0 }}>
                Please complete: {missingItems.join(", ")}.
              </p>
            </div>
          )}

          <div className="profile-form">
            <section
              style={{
                padding: "18px",
                marginBottom: "16px",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
              }}
            >
              <h2>Education</h2>
              <p><strong>Education level:</strong> {value(profile.education)}</p>
              <p><strong>Degree / qualification:</strong> {value(profile.degree)}</p>
              <p><strong>Field of study:</strong> {value(profile.field)}</p>
              <p><strong>College / institution:</strong> {value(profile.college)}</p>
              <button
                type="button"
                className="register-button"
                onClick={() => editSection("/profile")}
              >
                Edit Education
              </button>
            </section>

            <section
              style={{
                padding: "18px",
                marginBottom: "16px",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
              }}
            >
              <h2>Skills & Interests</h2>
              <p><strong>Skills:</strong> {skills.join(", ") || "Not provided"}</p>
              <p><strong>Interests:</strong> {interests.join(", ") || "Not provided"}</p>
              <button
                type="button"
                className="register-button"
                onClick={() => editSection("/profile/skills")}
              >
                Edit Skills & Interests
              </button>
            </section>

            <section
              style={{
                padding: "18px",
                marginBottom: "20px",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
              }}
            >
              <h2>Internship Preferences</h2>
              <p><strong>Preferred location:</strong> {value(profile.location)}</p>
              <p><strong>Willing to relocate:</strong> {value(profile.relocate)}</p>
              <p><strong>Work mode:</strong> {value(profile.workMode)}</p>
              <p><strong>Preferred domains:</strong> {domains.join(", ") || "Not provided"}</p>
              <button
                type="button"
                className="register-button"
                onClick={() => editSection("/profile/preferences")}
              >
                Edit Preferences
              </button>
            </section>

            <button
              type="button"
              className="primary-button"
              onClick={getRecommendations}
            >
              Get Recommendations
            </button>

            <button
              type="button"
              className="register-button"
              onClick={() => router.push("/profile/preferences")}
              style={{ marginTop: "10px" }}
            >
              Back to Preferences
            </button>
          </div>
        </div>
      </section>

      {toast}
    </main>
  );
}