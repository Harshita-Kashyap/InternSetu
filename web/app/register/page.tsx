"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "../components/AuthShell";
import { useToast } from "../components/Toast";
import { startSession } from "../lib/store";

export default function RegisterPage() {
  const router = useRouter();
  const { toast, show } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = Math.min(
    4,
    (password.length >= 8 ? 1 : 0) +
      (/[A-Z]/.test(password) ? 1 : 0) +
      (/[0-9]/.test(password) ? 1 : 0) +
      (/[^A-Za-z0-9]/.test(password) ? 1 : 0)
  );
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return show("Please enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return show("Please enter a valid email.");
    if (password.length < 6) return show("Password must be at least 6 characters.");
    setLoading(true);
    startSession(name.trim());
    setTimeout(() => router.push("/consent"), 700);
  };

  return (
    <AuthShell>
      <section className="login-card card-rise">
        <div className="login-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="InternSetu" className="login-logo" />
          <p className="welcome-text">Join InternSetu</p>
          <h1>Create your account</h1>
          <p className="subtitle">
            It takes under a minute. Then we&apos;ll set up your profile.
          </p>
        </div>

        <form className="login-form" onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="name">Full name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
          </div>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="form-field">
            <label htmlFor="pw">Password</label>
            <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" />
            <div className="strength">
              {[1, 2, 3, 4].map((n) => (
                <span key={n} className={strength >= n ? `on s${strength}` : ""} />
              ))}
              <small>{password ? labels[strength] : "Use 8+ characters, a number & a symbol"}</small>
            </div>
          </div>
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? <span className="spinner" /> : "Create account"}
          </button>
        </form>

        <div className="register-section">
          <span>Already have an account?</span>
          <Link href="/" className="register-button">Login</Link>
        </div>
      </section>
      {toast}
    </AuthShell>
  );
}
