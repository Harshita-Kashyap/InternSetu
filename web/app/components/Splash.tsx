"use client";

import { useEffect, useState } from "react";

export default function Splash() {
  const [phase, setPhase] = useState<"show" | "out" | "gone">("show");

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("internsetu_splash") === "1";
      sessionStorage.setItem("internsetu_splash", "1");
    } catch {}
    if (seen) {
      setPhase("gone");
      return;
    }
    const t1 = setTimeout(() => setPhase("out"), 3400);
    const t2 = setTimeout(() => setPhase("gone"), 4200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const skip = () => {
    setPhase("out");
    setTimeout(() => setPhase("gone"), 700);
  };

  if (phase === "gone") return null;

  return (
    <div
      className={`splash ${phase === "out" ? "splash-out" : ""}`}
      onClick={skip}
      role="presentation"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/hero.jpg" alt="InternSetu - Connect, Learn, Grow" className="splash-img" />
      <div className="splash-shade" />
      <div className="splash-bar">
        <span />
      </div>
      <button type="button" className="splash-skip" onClick={skip}>
        Skip →
      </button>
    </div>
  );
}
