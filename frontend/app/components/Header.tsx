"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { endSession } from "../lib/store";

export default function Header({ label = "Profile Setup" }: { label?: string }) {
  const router = useRouter();
  return (
    <header className="profile-header">
      <Link href="/profile" className="profile-brand" aria-label="InternSetu home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="InternSetu" className="header-logo" />
      </Link>
      <div className="profile-header-right">
        <span className="header-label">{label}</span>
        <button
          type="button"
          className="logout-button"
          onClick={() => {
            endSession();
            router.push("/");
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
