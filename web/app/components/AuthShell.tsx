"use client";
import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useT } from "../../i18n/useT";

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const tr = useT();
  return (
    <main className="auth-shell">
      <aside className="auth-visual" aria-hidden="true" />
      <section className="auth-main">
        <Link href="/" className="auth-home-link">{tr("← Home")}</Link>
        <div className="auth-tools"><ThemeToggle /><LanguageSwitcher /></div>
        {children}
      </section>
    </main>
  );
}
