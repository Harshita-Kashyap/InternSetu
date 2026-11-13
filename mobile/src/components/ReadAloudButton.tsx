import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import * as Speech from "expo-speech";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";

const VOICE: Record<string, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN", bn: "bn-IN" };

/** Reads the given text aloud in the app language. Tap again to stop. Uses the phone's own voices (works offline if installed). */
export default function ReadAloudButton({ text, getText }: { text?: string; getText?: () => string }) {
  const { t, lang } = useI18n();
  const { colors } = useTheme();
  const [speaking, setSpeaking] = React.useState(false);
  React.useEffect(() => () => { Speech.stop(); }, []);
  const toggle = async () => {
    if (speaking) { Speech.stop(); setSpeaking(false); return; }
    const said = (getText ? getText() : text) || "";
    if (!said) return;
    setSpeaking(true);
    Speech.speak(said, { language: VOICE[lang] || "en-IN", onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false), onError: () => setSpeaking(false) });
  };
  return (
    <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={speaking ? t("Stop reading") : t("Read aloud")} style={[styles.btn, { borderColor: colors.border }]}>
      <Text style={{ color: colors.teal, fontSize: 13, fontWeight: "600" }}>{speaking ? "■ " + t("Stop reading") : "🔊 " + t("Read aloud")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({ btn: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderWidth: 1.5, borderRadius: 12, marginTop: 8 } });
