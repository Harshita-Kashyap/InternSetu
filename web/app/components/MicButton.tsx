"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useT } from "../../i18n/useT";

const VOICE: Record<string, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN", bn: "bn-IN" };
type Rec = { lang: string; interimResults: boolean; onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void };

/** Microphone button: speak instead of typing. Hidden when the browser has no speech recognition (e.g. some Firefox / iOS versions). */
export default function MicButton({ onText }: { onText: (text: string) => void }) {
  const tr = useT();
  const locale = useLocale();
  const [ok, setOk] = useState(false);
  const [on, setOn] = useState(false);
  const rec = useRef<Rec | null>(null);
  useEffect(() => { setOk(typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)); return () => rec.current?.stop(); }, []);
  if (!ok) return null;
  const toggle = () => {
    if (on) { rec.current?.stop(); return; }
    const R = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const r: Rec = new R();
    r.lang = VOICE[locale] || "en-IN";
    r.interimResults = false;
    r.onresult = (e: any) => { const t = e.results?.[0]?.[0]?.transcript; if (t) onText(String(t).trim()); };
    r.onend = () => setOn(false);
    r.onerror = () => setOn(false);
    rec.current = r;
    setOn(true);
    try { r.start(); } catch { setOn(false); }
  };
  return (
    <button type="button" className={`mic-btn ${on ? "on" : ""}`} onClick={toggle} aria-pressed={on} aria-label={on ? tr("Listening…") : tr("Speak")} title={on ? tr("Listening…") : tr("Speak")}>
      {on ? "🎙️" : "🎤"}
    </button>
  );
}
