"use client";

import { useEffect, useState } from "react";
import { useT } from "../../../i18n/useT";
import { useRouter } from "../../../i18n/navigation";
import Header from "../../components/Header";
import { loadProfileRemote, type Profile } from "../../lib/store";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../components/Toast";

export default function ProfileSummaryPage() {
  const tr = useT();
  const router = useRouter();
  const { toast, show } = useToast();
  const [profile, setProfile] = useState<Profile>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadProfileRemote().then((p) => { setProfile(p); setReady(true); });
  }, []);

  if (!ready) {
    return (
      <main className="profile-page">
        <Header />
        <section className="profile-container"><p className="muted" role="status">{tr("Loading…")}</p></section>
      </main>
    );
  }

  const skills = profile.skills ?? [];
  const domains = profile.domains ?? [];

  const missingItems = [
    !profile.education && tr("education level"),
    !profile.degree?.trim() && tr("degree or qualification"),
    !profile.field?.trim() && tr("field of study"),
    skills.length === 0 && tr("at least one skill"),
    !profile.relocate && tr("moving preference"),
    domains.length === 0 && tr("preferred domain"),
  ].filter(Boolean) as string[];

  const editSection = (path: string) => router.push(path);

  const getRecommendations = async () => {
    if (missingItems.length > 0) {
      show(tr("Please complete your missing profile details before continuing."));
      return;
    }
    try {
      await api.confirmProfile();
      router.push("/recommendations");
    } catch (e) {
      show(e instanceof ApiError ? e.message : tr("Could not confirm your profile."));
    }
  };

  const value = (item?: string) => item?.trim() || tr("Not provided");

  return (
    <main className="profile-page">
      <Header />

      <section className="profile-container">
        <div className="profile-card card-rise">
          <div className="profile-intro">
            <p className="profile-eyebrow">{tr("PROFILE REVIEW")}</p>
            <h1>{tr("Review your profile")}</h1>
            <p>
              {tr("Check your details before we find internships that match your skills, education and preferences.")}
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
              <strong>{tr("Your profile needs a few more details.")}</strong>
              <p style={{ marginBottom: 0 }}>
                {tr("Please complete")}: {missingItems.join(", ")}.
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
              <h2>{tr("Education")}</h2>
              <p><strong>{tr("Education level:")}</strong> {value(profile.education)}</p>
              <p><strong>{tr("Degree / qualification:")}</strong> {value(profile.degree)}</p>
              <p><strong>{tr("Field of study:")}</strong> {value(profile.field)}</p>
              <p><strong>{tr("College / institution:")}</strong> {value(profile.college)}</p>
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
              <h2>{tr("Skills")}</h2>
              <p><strong>{tr("Skills:")}</strong> {skills.join(", ") || "Not provided"}</p>
              <button
                type="button"
                className="register-button"
                onClick={() => editSection("/profile/skills")}
              >
                {tr("Edit Skills")}
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
              <h2>{tr("Internship Preferences")}</h2>
              <p><strong>{tr("Preferred location:")}</strong> {value(profile.location)}</p>
              <p><strong>{tr("Location preference:")}</strong> {profile.relocate === "nearby" ? tr("Nearby only") : profile.relocate === "selected" ? `${tr("Selected cities")}: ${(profile.preferredLocations ?? []).join(", ")}` : profile.relocate === "anywhere" ? tr("Can move anywhere") : "Not provided"}</p>
              <p><strong>{tr("Preferred domains:")}</strong> {domains.join(", ") || "Not provided"}</p>
              <button
                type="button"
                className="register-button"
                onClick={() => editSection("/profile/preferences")}
              >
                {tr("Edit Preferences")}
              </button>
            </section>

            <button
              type="button"
              className="primary-button"
              onClick={getRecommendations}
            >
              {tr("Get Recommendations")}
            </button>

            <button
              type="button"
              className="register-button"
              onClick={() => router.push("/profile/preferences")}
              style={{ marginTop: "10px" }}
            >
              {tr("Back to Preferences")}
            </button>
          </div>
        </div>
      </section>

      {toast}
    </main>
  );
}