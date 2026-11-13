
"use client";

import { useRouter } from "../../../i18n/navigation";
import { useT } from "../../../i18n/useT";
import AuthShell from "../../components/AuthShell";

export default function PrivacyPage() {
  const tr = useT();
  const router = useRouter();
  // Return to wherever the user came from (register, consent...); safe fallback for direct visits.
  const goBack = () => {
    let internal = false;
    try { internal = !!document.referrer && new URL(document.referrer).origin === window.location.origin; } catch {}
    if (internal && window.history.length > 1) router.back();
    else router.push("/register");
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
          <p className="welcome-text">InternSetu</p>
          <h1>{tr("Privacy Policy")}</h1>
          <p className="subtitle">
            {tr("How information is used in the internship recommendation demo.")}
          </p>
        </div>

        <div className="login-form">
          <h3>{tr("1. Information you provide")}</h3>
          <p>
            {tr("You may enter your name, email, education, skills and internship preferences.")}
          </p>

          <h3>{tr("2. How information is used")}</h3>
          <p>
            {tr("This demo uses profile information to support internship recommendations and display relevant opportunities.")}
          </p>

          <h3>{tr("3. Local storage")}</h3>
          <p>
            {tr("The current demo may store session, profile and consent information in your browser's local storage. This information may remain on the device until cleared.")}
          </p>

          <h3>{tr("4. Limitations")}</h3>
          <p>
            {tr("Do not enter passwords or other sensitive information that is not required for this demo. Recommendations should be verified against official internship requirements.")}
          </p>

          <h3>{tr("5. Your choices")}</h3>
          <p>
            {tr("You can download your data, withdraw consent or delete your account any time from the Account page.")}
          </p>

          <p>
            <strong>{tr("Project note:")}</strong> {tr("This is a development draft. Confirm the actual data collection, retention, security and deletion practices before publishing it.")}
          </p>

          <button type="button" className="login-button" onClick={goBack}>
            ← {tr("Back")}
          </button>
        </div>
      </section>
    </AuthShell>
  );
}
