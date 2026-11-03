"use client";

import {useLocale} from "next-intl";
import {useRouter} from "next/navigation";

const LANGS = [
  {code: "en", label: "English"},
  {code: "hi", label: "हिन्दी"},
  {code: "mr", label: "मराठी"},
];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const changeLanguage = (newLocale: string) => {
    const pathWithoutLocale = window.location.pathname.replace(/^\/(en|hi|mr)(?=\/|$)/, "");
    router.push(`/${newLocale}${pathWithoutLocale}`);
  };

  return (
    <select value={locale} onChange={(e) => changeLanguage(e.target.value)} aria-label="Select language">
      {LANGS.map((l) => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  );
}
