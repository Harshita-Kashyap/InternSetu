"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useT } from "../../i18n/useT";

const VOICE: Record<string, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN", bn: "bn-IN" };

/** Floating "Read this page" button on every screen. Reads the visible page text aloud, only when tapped. */
export default function ReadPage() {
  const tr = useT();
  const locale = useLocale();
  const [ok, setOk] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => { setOk(typeof window !== "undefined" && "speechSynthesis" in window); return () => { try { window.speechSynthesis?.cancel(); } catch {} }; }, []);
  if (!ok) return null;
  const toggle = () => {
    const synth = window.speechSynthesis;
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    const root = (document.querySelector("main") || document.querySelector(".login-card") || document.body) as HTMLElement;
    const text = (root.innerText || root.textContent || "").replace(/\s+/g, " ").trim().slice(0, 2500);
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = VOICE[locale] || "en-IN";
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.cancel();
    setSpeaking(true);
    synth.speak(u);
  };
  return (
    <button type="button" className="read-page-btn" onClick={toggle} aria-pressed={speaking}>
      {speaking ? "■ " + tr("Stop reading") : "🔊 " + tr("Read this page")}
    </button>
  );
}
