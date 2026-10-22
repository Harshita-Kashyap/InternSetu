
"use client";

import Link from "next/link";
import AuthShell from "../components/AuthShell";

export default function PrivacyPage() {
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
          <p className="welcome-text">InternSetu</p>
          <h1>Privacy Policy</h1>
          <p className="subtitle">
            How information is used in the internship recommendation demo.
          </p>
        </div>

        <div className="login-form">
          <h3>1. Information you provide</h3>
          <p>
            You may enter your name, email, education, skills,
            interests and internship preferences.
          </p>

          <h3>2. How information is used</h3>
          <p>
            This demo uses profile information to support internship
            recommendations and display relevant opportunities.
          </p>

          <h3>3. Local storage</h3>
          <p>
            The current demo may store session, profile and consent
            information in your browser&apos;s local storage.
            This information may remain on the device until cleared.
          </p>

          <h3>4. Limitations</h3>
          <p>
            Do not enter passwords or other sensitive information
            that is not required for this demo. Recommendations
            should be verified against official internship requirements.
          </p>

          <h3>5. Your choices</h3>
          <p>
            You can stop using the demo and clear its browser-stored
            data. Consent withdrawal controls will be added to account
            settings as the project develops.
          </p>

          <p>
            <strong>Project note:</strong> This is a development
            draft. Confirm the actual data collection, retention,
            security and deletion practices before publishing it.
          </p>

          <Link href="/consent" className="register-button">
            Back to consent
          </Link>
        </div>
      </section>
    </AuthShell>
  );
}
