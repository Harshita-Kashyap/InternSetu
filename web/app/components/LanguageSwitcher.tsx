"use client";

import {useLocale} from "next-intl";
import {useRouter} from "next/navigation";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const changeLanguage = (newLocale: string) => {
    const currentPath = window.location.pathname;

    const pathWithoutLocale = currentPath.replace(/^\/(en|hi)(?=\/|$)/, "");

    router.push(`/${newLocale}${pathWithoutLocale}`);
  };

  return (
    <select
      value={locale}
      onChange={(e) => changeLanguage(e.target.value)}
      aria-label="Select language"
    >
      <option value="en">English</option>
      <option value="hi">हिन्दी</option>
    </select>
  );
}