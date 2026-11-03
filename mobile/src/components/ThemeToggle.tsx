import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";

export default function ThemeToggle() {
  const { colors, mode, toggle } = useTheme();
  const { t } = useI18n();
  return (
    <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={mode === "dark" ? t("Switch to light theme") : t("Switch to dark theme")}
      style={[styles.btn, { borderColor: colors.border, backgroundColor: colors.white }]} hitSlop={6}>
      <Text style={{ fontSize: 17, color: colors.teal }}>{mode === "dark" ? "☀" : "☾"}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({ btn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" } });
