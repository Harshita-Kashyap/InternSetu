
"use client";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "../components/AuthShell";
import { useToast } from "../components/Toast";
import {
  startSession,
  hasPrivacyConsent,
} from "../lib/store";
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("Login");
  const router = useRouter();
  const { toast, show } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      show(t("passwordRequired"));
      return;
    }
    setLoading(true);
    startSession(username.trim());
    setTimeout(() => {
  if (hasPrivacyConsent()) {
    router.push("/profile");
  } else {
    router.push("/consent");
  }
}, 700);
  };

  return (
  <AuthShell>
    <div className="language-switcher">
      <LanguageSwitcher />
    </div>

    <section className="login-card card-rise">
        <div className="login-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="InternSetu" className="login-logo" />
          <p className="welcome-text">{t("welcome")}</p>
          <h1>{t("heading")}</h1>
          <p className="subtitle">
  {t("subtitle")}
</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-field">
            <label htmlFor="username">{t("username")}</label>
            <input
              id="username"
              type="text"
              placeholder={t("usernamePlaceholder")}
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-field">
            <div className="password-label-row">
              <label htmlFor="password">{t("password")}</label>
              <Link href="/forgot-password" className="forgot-button">
  {t("forgotPassword")}
</Link>
            </div>

            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
               placeholder={t("passwordPlaceholder")}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="show-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              >
                {showPassword ? t("hidePassword") : t("showPassword")}
              </button>
            </div>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? <span className="spinner" /> : t("login")}
          </button>
        </form>

        <div className="register-section">
          <span>{t("noAccount")}</span>
          <Link href="/register" className="register-button">
  {t("register")}
</Link>
        </div>

        <div className="login-footer">
          <span className="footer-dot"></span>
          <div className="login-footer">
  <span className="footer-dot"></span>
  {t("secureFooter")}
</div>
        </div>
      </section>
      {toast}
    </AuthShell>
  );
}
