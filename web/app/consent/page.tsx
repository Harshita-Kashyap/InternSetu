
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "../components/AuthShell";
import { useToast } from "../components/Toast";
import { acceptPrivacyConsent } from "../lib/store";

export default function ConsentPage() {
  const router = useRouter();
  const { toast, show } = useToast();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const continueToProfile = () => {
    if (!checked || loading) return;

    setLoading(true);

    try {
      acceptPrivacyConsent();
      router.push("/profile");
    } catch {
      setLoading(false);
      show("Unable to save your consent. Please try again.");
    }
  };

  return (
    <AuthShell>
      <section className="login-card card-rise">
        <div className="login-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="InternSetu"
            className="login-logo"
          />
          <p className="welcome-text">Your privacy matters</p>
          <h1>Privacy and consent</h1>
          <p className="subtitle">
            Before setting up your internship profile, please review
            how your information will be used.
          </p>
        </div>

        <div className="login-form">
          <div className="form-field">
            <h3>How your information is used</h3>
            <p>
              InternSetu uses the profile information you provide,
              such as education, skills, interests and location
              preferences, to help identify relevant internships.
            </p>
            <p>
              Please review the{" "}
              <Link href="/privacy" className="register-button">
                Privacy Policy
              </Link>{" "}
              before continuing.
            </p>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
              style={{ marginTop: "5px" }}
            />
            <span>
              I have read the Privacy Policy and consent to the
              use of my information as described.
            </span>
          </label>

          <button
            type="button"
            className="login-button"
            disabled={!checked || loading}
            onClick={continueToProfile}
          >
            {loading ? "Please wait..." : "Continue"}
          </button>
        </div>

        {toast}
      </section>
    </AuthShell>
  );
}
