import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";

/** Thin bar shown at the top of every screen while the phone has no internet. */
export default function OfflineBanner() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [offline, setOffline] = useState(false);
  useEffect(() => NetInfo.addEventListener((s) => setOffline(s.isConnected === false || s.isInternetReachable === false)), []);
  if (!offline) return null;
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.bar, { backgroundColor: colors.warn }]}>
      <Text style={styles.txt}>{t("No internet. Saved results still work; other actions need a connection.")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingVertical: 8, paddingHorizontal: 14 },
  txt: { color: "#1a1a1a", fontSize: 13, textAlign: "center", fontWeight: "600" },
});
