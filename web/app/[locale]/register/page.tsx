"use client";

import { useState } from "react";
import { useT } from "../../../i18n/useT";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "../../components/AuthShell";
import { useToast } from "../../components/Toast";
import { api, ApiError } from "../../lib/api";

export default function RegisterPage() {
  const tr = useT();
  const router = useRouter();
  const { toast, show } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);

  const strength = Math.min(
    4,
    (password.length >= 8 ? 1 : 0) +
      (/[A-Z]/.test(password) ? 1 : 0) +
      (/[0-9]/.test(password) ? 1 : 0) +
      (/[^A-Za-z0-9]/.test(password) ? 1 : 0)
  );
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return show(tr("Please enter your full name."));
    if (!/^\S+@\S+\.\S+$/.test(email)) return show(tr("Please enter a valid email."));
    if (password.length < 8) return show(tr("Password must be at least 8 characters."));
    if (!agree) return show(tr("Please accept the privacy notice to continue."));
    setLoading(true);
    try {
      await api.register({ full_name: name.trim(), email: email.trim(), password, consent: true });
      router.push("/profile");
    } catch (err) {
      if (err instanceof ApiError) show(err.fieldMessage("password") || err.fieldMessage("email") || err.fieldMessage("full_name") || err.message);
      else show(tr("Could not create your account. Please try again."));
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <section className="login-card card-rise">
        <div className="login-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="InternSetu" className="login-logo" />
          <p className="welcome-text">{tr("Join InternSetu")}</p>
          <h1>{tr("Create your account")}</h1>
          <p className="subtitle">
            {tr("It takes under a minute. Then we'll set up your profile.")}
          </p>
        </div>

        <form className="login-form" onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="name">{tr("Full name")}</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("Your full name")} />
          </div>
          <div className="form-field">
            <label htmlFor="email">{tr("Email")}</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="form-field">
            <label htmlFor="pw">{tr("Password")}</label>
            <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={tr("Create a password")} />
            <div className="strength">
              {[1, 2, 3, 4].map((n) => (
                <span key={n} className={strength >= n ? `on s${strength}` : ""} />
              ))}
              <small>{password ? labels[strength] : tr("Use 8+ characters, a number & a symbol")}</small>
            </div>
          </div>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 5 }} />
            <span>{tr("I have read the ")}<Link href="/privacy" className="register-button">{tr("Privacy Policy")}</Link>{tr(" and consent to my information being used to find internships.")}</span>
          </label>
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? <span className="spinner" /> : tr("Create account")}
          </button>
        </form>

        <div className="register-section">
          <span>{tr("Already have an account?")}</span>
          <Link href="/" className="register-button">{tr("Login")}</Link>
        </div>
      </section>
      {toast}
    </AuthShell>
  );
}
