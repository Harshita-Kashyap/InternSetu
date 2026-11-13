"use client";
import { useEffect } from "react";

/** The root layout is shared by all languages, so set the page language here for screen readers. */
export default function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return null;
}
