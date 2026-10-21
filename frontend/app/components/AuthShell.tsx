import Link from "next/link";

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <aside className="auth-visual" aria-hidden="true">
        <div className="auth-visual-bg" />
        <div className="auth-visual-content">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="auth-visual-mark" />
          <h2>Bridging your skills with real opportunities</h2>
          <ul>
            <li style={{ "--d": "0.3s" } as React.CSSProperties}><b>🎓</b> Build your skills</li>
            <li style={{ "--d": "0.5s" } as React.CSSProperties}><b>💼</b> Find internships</li>
            <li style={{ "--d": "0.7s" } as React.CSSProperties}><b>📈</b> Shape your future</li>
          </ul>
        </div>
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </aside>
      <section className="auth-main">
        <Link href="/" className="auth-home-link">← Home</Link>
        {children}
      </section>
    </main>
  );
}
