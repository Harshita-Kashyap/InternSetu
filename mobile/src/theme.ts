// Same palette and tokens as the InternSetu web app (globals.css), light + dark.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const light = {
  cream: "#f7f5ef", creamLight: "#fbfaf7", white: "#ffffff",
  teal: "#256b73", tealDark: "#1d565d", tealLight: "#eaf4f3", tealBorder: "#b9d5d3",
  text: "#17202a", muted: "#66747d", border: "#d8e0df", track: "#e6eeed",
  chip: "#f1f4f3", divider: "#edf0ef", faint: "#8a969b", hover: "#f4faf9",
  danger: "#d9534f", dangerBg: "#fdf1f3", success: "#3c9d82", rose: "#e0566b",
  warn: "#b7791f", warnBg: "#fff4d6", onTeal: "#ffffff", logoBg: "transparent",
};
export type Colors = typeof light;
const dark: Colors = {
  cream: "#0e1618", creamLight: "#142024", white: "#172529",
  teal: "#2b8a90", tealDark: "#bfe6e4", tealLight: "#1b3a3d", tealBorder: "#2f5d60",
  text: "#e9f1f0", muted: "#9fb2b2", border: "#2b3f43", track: "#263a3e",
  chip: "#1f3135", divider: "#243639", faint: "#7f9495", hover: "#1b2f33",
  danger: "#ff7b8e", dangerBg: "#3a2127", success: "#4fb596", rose: "#ff7b8e",
  warn: "#f1c76b", warnBg: "#3b3216", onTeal: "#ffffff", logoBg: "#fbf6e9",
};

export type Mode = "light" | "dark";
const KEY = "internsetu_theme";
const Ctx = createContext<{ colors: Colors; mode: Mode; toggle: () => void }>({ colors: light, mode: "light", toggle: () => {} });
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [pref, setPref] = useState<Mode | null>(null);
  useEffect(() => { AsyncStorage.getItem(KEY).then((v) => (v === "dark" || v === "light") && setPref(v)).catch(() => {}); }, []);
  const mode: Mode = pref ?? (system === "dark" ? "dark" : "light");
  const toggle = useCallback(() => {
    const next: Mode = mode === "dark" ? "light" : "dark";
    setPref(next);
    AsyncStorage.setItem(KEY, next).catch(() => {});
  }, [mode]);
  const [fontKey, setFontKey] = useState(0);
  useEffect(() => { const f = () => setFontKey((k) => k + 1); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  // a fresh colors object when the font family changes, so every memoised StyleSheet is rebuilt with the new fonts
  const value = useMemo(() => ({ colors: { ...(mode === "dark" ? dark : light) }, mode, toggle }), [mode, toggle, fontKey]);
  return React.createElement(Ctx.Provider, { value }, children);
}

// Plus Jakarta Sans for English; Noto Sans Devanagari for Hindi/Marathi; Noto Sans Bengali for Bengali (one family per script,
// so every language looks consistent). The family follows the app language: setFontScript() is called by the language provider.
type Script = "latin" | "deva" | "beng";
const fam = (p: string, h: string) => ({ body: `${p}_400Regular`, medium: `${p}_500Medium`, semibold: `${p}_600SemiBold`, bold: `${p}_700Bold`, head: `${p}_700Bold`, headXL: `${p}_${h}` });
const FAMILY: Record<Script, ReturnType<typeof fam>> = {
  latin: fam("PlusJakartaSans", "800ExtraBold"),
  deva: fam("NotoSansDevanagari", "700Bold"),
  beng: fam("NotoSansBengali", "700Bold"),
};
let script: Script = "latin";
const listeners = new Set<() => void>();
export const fonts = {
  get body() { return FAMILY[script].body; }, get medium() { return FAMILY[script].medium; }, get semibold() { return FAMILY[script].semibold; },
  get bold() { return FAMILY[script].bold; }, get head() { return FAMILY[script].head; }, get headXL() { return FAMILY[script].headXL; },
};
export function setFontScript(lang: string) {
  const next: Script = lang === "hi" || lang === "mr" ? "deva" : lang === "bn" ? "beng" : "latin";
  if (next !== script) { script = next; listeners.forEach((f) => f()); }
}

/** One scale for the whole app: controls 12, cards 16, chips/pills fully round. Minimum tap height 48. */
export const radius = { sm: 10, md: 12, lg: 16, pill: 999 } as const;
export const tap = 48;

export const shadow = {
  shadowColor: "#256b73", shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 6,
};
