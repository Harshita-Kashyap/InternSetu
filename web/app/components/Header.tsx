"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useT } from "../../i18n/useT";
import { endSession } from "../lib/store";

const NAV = [
  { href: "/home", label: "Discover" },
  { href: "/recommendations", label: "Top matches" },
  { href: "/saved", label: "Saved" },
  { href: "/profile", label: "Edit profile" },
];

export default function Header({ label = "Profile Setup" }: { label?: string }) {
  const tr = useT();
  const router = useRouter();
  const path = usePathname() ?? "";
  const active = (h: string) => (h === "/profile" ? /\/profile(\/|$)/.test(path) : path.endsWith(h));
  return (
    <header className="profile-header">
      <Link href="/home" className="profile-brand" aria-label="InternSetu home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="InternSetu" className="header-logo" />
      </Link>
      <nav className="header-nav" aria-label={tr("Main")}>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={active(n.href) ? "on" : ""} aria-current={active(n.href) ? "page" : undefined}>
            {tr(n.label)}
          </Link>
        ))}
      </nav>
      <div className="profile-header-right">
        <span className="header-label">{label}</span>
        <LanguageSwitcher />
        <ThemeToggle />
        <button type="button" className="logout-button" onClick={() => { endSession(); router.push("/"); }}>
          {tr("Logout")}
        </button>
      </div>
    </header>
  );
}
