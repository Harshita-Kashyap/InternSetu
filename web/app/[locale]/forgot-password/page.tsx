"use client";

import { useState } from "react";
import { useT } from "../../../i18n/useT";
import Link from "next/link";
import AuthShell from "../../components/AuthShell";
import { api } from "../../lib/api";
import { useToast } from "../../components/Toast";

export default function ForgotPasswordPage() {
  const tr = useT();
  const { toast, show } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return show(tr("Please enter a valid email."));
    await api.forgotPassword(email.trim()).catch(() => {});
    setSent(true);
  };

  return (
    <AuthShell>
      <section className="login-card card-rise">
        <div className="login-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="InternSetu" className="login-logo" />
          <h1>{tr("Reset your password")}</h1>
          <p className="subtitle">
            {tr("Enter your email and we'll send you a reset link.")}
          </p>
        </div>

        {sent ? (
          <div className="sent-box">
            <div className="check-draw">
              <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M14 27l8 8 16-17" /></svg>
            </div>
            <p>If an account exists for <b>{email}</b>, a reset link is on its way.</p>
          </div>
        ) : (
          <form className="login-form" onSubmit={submit}>
            <div className="form-field">
              <label htmlFor="fe">{tr("Email")}</label>
              <input id="fe" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <button type="submit" className="login-button">{tr("Send reset link")}</button>
          </form>
        )}

        <div className="register-section">
          <Link href="/" className="register-button">{tr("← Back to login")}</Link>
        </div>
      </section>
      {toast}
    </AuthShell>
  );
}
