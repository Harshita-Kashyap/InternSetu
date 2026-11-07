"use client";

import { useLocale } from "next-intl";
import { useT } from "../../i18n/useT";
import { usePathname, useRouter } from "../../i18n/navigation";

const LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "mr", label: "मराठी" },
];

export default function LanguageSwitcher() {
  const tr = useT();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname(); // locale-free path, so the same page stays open

  return (
    <select
      value={locale}
      onChange={(e) => router.replace(pathname, { locale: e.target.value })}
      data-lang-switch aria-label={tr("Select language")}
    >
      {LANGS.map((l) => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  );
}
