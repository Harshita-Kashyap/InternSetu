"use client";

import { useCallback, useRef, useState } from "react";
import { useT } from "../../i18n/useT";

export function useToast() {
  const tr = useT();
  const trRef = useRef(tr);
  trRef.current = tr;
  const [msg, setMsg] = useState("");
  const [kind, setKind] = useState<"error" | "success">("error");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((m: string, k: "error" | "success" = "error") => {
    setMsg(trRef.current(m));
    setKind(k);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(""), 3200);
  }, []);

  const node = msg ? (
    <div className={`toast toast-${kind}`} role={kind === "error" ? "alert" : "status"} key={msg + kind}>
      <span>{kind === "error" ? "!" : "✓"}</span>
      {msg}
    </div>
  ) : null;

  return { toast: node, show };
}
