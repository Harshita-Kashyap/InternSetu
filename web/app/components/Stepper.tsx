"use client";
import Link from "next/link";
import { useT } from "../../i18n/useT";

const steps = [
  { label: "Education", href: "/profile" },
  { label: "Skills & Interests", href: "/profile/skills" },
  { label: "Preferences", href: "/profile/preferences" },
];

export default function Stepper({ current }: { current: 1 | 2 | 3 }) {
  const tr = useT();
  return (
    <div className="progress-section">
      {steps.map((s, i) => {
        const n = i + 1;
        const state = n < current ? "completed" : n === current ? "active" : "";
        const inner = (
          <>
            <div className="step-circle">{n < current ? "✓" : n}</div>
            <span>{tr(s.label)}</span>
          </>
        );
        return (
          <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
            {i > 0 && (
              <div className={`progress-line ${n <= current ? "active" : ""}`} />
            )}
            {n < current ? (
              <Link href={s.href} className={`progress-step ${state} step-link`}>
                {inner}
              </Link>
            ) : (
              <div className={`progress-step ${state}`}>{inner}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
