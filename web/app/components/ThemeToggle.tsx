"use client";
import { useEffect, useState } from "react";
import { useT } from "../../i18n/useT";

export default function ThemeToggle() {
  const tr = useT();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);
  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("internsetu_theme", next); } catch {}
    setTheme(next);
  };
  const label = theme === "dark" ? tr("Switch to light theme") : tr("Switch to dark theme");
  return (
    <button type="button" className="theme-toggle" onClick={flip} aria-label={label} title={label}>
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>
      )}
    </button>
  );
}
