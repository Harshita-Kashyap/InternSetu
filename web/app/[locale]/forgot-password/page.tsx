"use client";

import { useState } from "react";
import Illustration from "../../components/Illustration";
import { useT } from "../../../i18n/useT";
import { Link } from "../../../i18n/navigation";
import AuthShell from "../../components/AuthShell";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../components/Toast";

export default function ForgotPasswordPage() {
  const tr = useT();
  const { toast, show } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return show(tr("Please enter a valid email."));
    setSending(true);
    await api.forgotPassword(email.trim()).catch(() => {});
    setSending(false);
    setSent(true);
  };

  const resend = async () => {
    setSending(true);
    await api.forgotPassword(email.trim()).catch(() => {});
    setSending(false);
    show(tr("If an account exists for that email, a code has been sent."));
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) return show(tr("Please enter the 6-digit code."));
    setSending(true);
    try {
      await api.resetPassword(email.trim(), code.trim(), pw);
      setDone(true);
    } catch (err) {
      show(err instanceof ApiError ? err.message : tr("Something went wrong."));
    }
    setSending(false);
  };

  return (
    <AuthShell>
      <section className="login-card card-rise">
        <div className="login-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="InternSetu" className="login-logo" />
          <Illustration name="lock" className="login-hero" />
          <h1>{tr("Reset your password")}</h1>
          <p className="subtitle">
            {sent && !done ? tr("Enter the 6-digit code from your email and choose a new password.") : tr("Enter your email and we'll send you a 6-digit code.")}
          </p>
        </div>

        {done ? (
          <div className="sent-box">
            <div className="check-draw">
              <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M14 27l8 8 16-17" /></svg>
            </div>
            <p>{tr("Password changed. You can log in now.")}</p>
          </div>
        ) : sent ? (
          <form className="login-form" onSubmit={reset}>
            <div className="form-field">
              <label htmlFor="fc">{tr("6-digit code")}</label>
              <input id="fc" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" />
            </div>
            <div className="form-field">
              <label htmlFor="fp">{tr("New password")}</label>
              <input id="fp" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <button type="submit" className="login-button" disabled={sending}>{sending ? tr("Loading…") : tr("Change password")}</button>
            <button type="button" className="ghost-btn" disabled={sending} onClick={resend}>{tr("Send a new code")}</button>
          </form>
        ) : (
          <form className="login-form" onSubmit={submit}>
            <div className="form-field">
              <label htmlFor="fe">{tr("Email")}</label>
              <input id="fe" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <button type="submit" className="login-button" disabled={sending}>{sending ? tr("Sending…") : tr("Send code")}</button>
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
