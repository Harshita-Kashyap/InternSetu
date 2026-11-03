import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LANGS, useI18n } from "../i18n";
import { useTheme, Colors, fonts } from "../theme";

export default function LanguageSwitcher() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { lang, setLang } = useI18n();
  return (
    <View style={styles.row}>
      {LANGS.map((l) => (
        <Pressable key={l.code} onPress={() => setLang(l.code)} style={[styles.pill, lang === l.code && styles.on]} accessibilityLabel={l.label}>
          <Text style={[styles.txt, lang === l.code && { color: "#fff" }]}>{l.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
const makeStyles = (colors: Colors) => StyleSheet.create({
  row: { flexDirection: "row", gap: 6 },
  pill: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.tealBorder, backgroundColor: colors.white },
  on: { backgroundColor: colors.teal, borderColor: colors.teal },
  txt: { fontSize: 12, color: colors.teal, fontFamily: fonts.bold },
});
