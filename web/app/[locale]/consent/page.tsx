
"use client";

import { useState } from "react";
import { Link, useRouter } from "../../../i18n/navigation";
import { useT } from "../../../i18n/useT";
import AuthShell from "../../components/AuthShell";
import { useToast } from "../../components/Toast";
import { api, ApiError } from "../../lib/api";

export default function ConsentPage() {
  const tr = useT();
  const router = useRouter();
  const { toast, show } = useToast();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const continueToProfile = async () => {
    if (!checked || loading) return;
    setLoading(true);
    try {
      await api.giveConsent();
      router.push("/profile");
    } catch (err) {
      setLoading(false);
      show(err instanceof ApiError ? err.message : tr("Unable to save your consent. Please try again."));
    }
  };

  return (
    <AuthShell visual={false}>
      <section className="login-card card-rise legal-card">
        <div className="login-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="InternSetu"
            className="login-logo"
          />
          <p className="welcome-text">{tr("Your privacy matters")}</p>
          <h1>{tr("Privacy and consent")}</h1>
          <p className="subtitle">{tr("Before setting up your internship profile, please review how your information will be used.")}</p>
        </div>

        <div className="login-form">
          <div className="form-field">
            <h3>{tr("How your information is used")}</h3>
            <p>{tr("InternSetu uses the profile information you provide, such as education, skills, interests and location preferences, to help identify relevant internships.")}</p>
            <p>
              {tr("Please review the")}{" "}
              <Link href="/privacy" className="register-button">
                {tr("Privacy Policy")}
              </Link>{" "}
              {tr("before continuing.")}
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
            <span>{tr("I have read the Privacy Policy and consent to the use of my information as described.")}</span>
          </label>

          <button
            type="button"
            className="login-button"
            disabled={!checked || loading}
            onClick={continueToProfile}
          >
            {loading ? tr("Please wait...") : tr("Continue")}
          </button>
        </div>

        {toast}
      </section>
    </AuthShell>
  );
}
