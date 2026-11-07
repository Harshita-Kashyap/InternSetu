"use client";
import { Link } from "../../i18n/navigation";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useT } from "../../i18n/useT";

export default function AuthShell({ children, visual = true }: { children: React.ReactNode; visual?: boolean }) {
  const tr = useT();
  return (
    <main className={`auth-shell${visual ? "" : " auth-shell--plain"}`}>
      {visual && <aside className="auth-visual" aria-hidden="true"><span className="av-ring r1" /><span className="av-ring r2" /><span className="av-dots" />
        <div className="av-copy">
          <h2>{tr("Find internships you are eligible for.")}</h2>
          <ul>
            <li><b>✓</b>{tr("Clear eligibility, kept apart from match score")}</li>
            <li><b>★</b>{tr("Matches explained in plain words")}</li>
            <li><b>→</b>{tr("Apply on the official PMIS portal")}</li>
          </ul>
        </div>
      </aside>}
      <section className="auth-main">
        <Link href="/" className="auth-home-link">{tr("← Home")}</Link>
        <div className="auth-tools"><ThemeToggle /><LanguageSwitcher /></div>
        {children}
      </section>
    </main>
  );
}
