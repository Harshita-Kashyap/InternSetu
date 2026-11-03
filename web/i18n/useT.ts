"use client";
import { useTranslations } from "next-intl";

// Same key rule as messages/*.json "UI" namespace (generated from the English text).
export function uiKey(s: string) {
  let x = s.replace(/:/g, " colon ");
  if (x.startsWith(" ")) x = "sp " + x;
  if (x.endsWith(" ")) x = x + " sp";
  return x.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "x";
}

/** tr("English text") -> translated text for the current locale; falls back to the English text. */
export function useT() {
  const t = useTranslations("UI");
  return (s: string) => {
    const k = uiKey(s);
    return t.has(k) ? t(k) : s;
  };
}
