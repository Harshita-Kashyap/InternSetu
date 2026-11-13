"use client";

import { useEffect, useState } from "react";
import { useT } from "../../i18n/useT";

/** Plain-words notice when the phone or computer loses its internet connection (#42). */
export default function OfflineBanner() {
  const tr = useT();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);
  if (!offline) return null;
  return <div className="offline-banner" role="status">{tr("You are offline. Check your internet connection.")}</div>;
}
