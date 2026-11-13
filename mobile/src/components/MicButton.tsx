import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";

// expo-speech-recognition is a native module: it exists in a development/production build but NOT in Expo Go.
// If it is missing the button simply does not appear.
let Mod: any = null;
try { Mod = require("expo-speech-recognition").ExpoSpeechRecognitionModule; } catch { Mod = null; }

const VOICE: Record<string, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN", bn: "bn-IN" };

/** Speak instead of typing: puts what was heard into the text box. */
export default function MicButton({ onText }: { onText: (text: string) => void }) {
  const { t, lang } = useI18n();
  const { colors } = useTheme();
  const [on, setOn] = useState(false);
  const subs = useRef<{ remove: () => void }[]>([]);
  useEffect(() => () => { subs.current.forEach((s) => s.remove()); try { Mod?.abort(); } catch {} }, []);
  if (!Mod) return null;
  const toggle = async () => {
    if (on) { try { Mod.stop(); } catch {} return; }
    try {
      const perm = await Mod.requestPermissionsAsync();
      if (!perm.granted) return;
      subs.current.forEach((s) => s.remove());
      subs.current = [
        Mod.addListener("result", (e: any) => { const x = e?.results?.[0]?.transcript; if (x && e.isFinal !== false) onText(String(x).trim()); }),
        Mod.addListener("end", () => setOn(false)),
        Mod.addListener("error", () => setOn(false)),
      ];
      setOn(true);
      Mod.start({ lang: VOICE[lang] || "en-IN", interimResults: false });
    } catch { setOn(false); }
  };
  return (
    <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={on ? t("Listening…") : t("Speak")} style={[styles.btn, { borderColor: on ? colors.teal : colors.border, backgroundColor: on ? colors.tealLight : colors.white }]}>
      <Text style={{ fontSize: 20 }}>{on ? "🎙️" : "🎤"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({ btn: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, alignItems: "center", justifyContent: "center", marginLeft: 8 } });
