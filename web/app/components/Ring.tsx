"use client";

import { useEffect, useState } from "react";

export default function Ring({ value }: { value: number }) {
  const r = 22, c = 2 * Math.PI * r;
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 150); return () => clearTimeout(t); }, []);
  return (
    <div className="ring" aria-label={`${value}% match`}>
      <svg viewBox="0 0 56 56">
        <circle className="ring-bg" cx="28" cy="28" r={r} />
        <circle className="ring-fg" cx="28" cy="28" r={r} strokeDasharray={c} strokeDashoffset={on ? c * (1 - value / 100) : c} />
      </svg>
      <b>{Math.round(value)}%</b>
    </div>
  );
}
