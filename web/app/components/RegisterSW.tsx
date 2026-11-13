"use client";

import { useEffect } from "react";

/** Registers the static-file service worker (production only; skipped in dev so hot reload is not cached). */
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
