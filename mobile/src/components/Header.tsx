import React, { useMemo } from "react";
import { useI18n } from "../i18n";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import { endSession } from "../store";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useTheme, Colors, fonts } from "../theme";

const NAV: { to: keyof RootStackParamList; label: string }[] = [
  { to: "Home", label: "Discover" },
  { to: "Recommendations", label: "Top matches" },
  { to: "Saved", label: "Saved" },
  { to: "Profile", label: "Edit profile" },
];

export default function Header() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const inSetup = ["Profile", "Skills", "Preferences"].includes(route.name);
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        <Pressable onPress={() => nav.navigate("Home")} style={styles.logoWrap} accessibilityLabel="InternSetu">
          <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
        </Pressable>
        <View style={styles.right}>
          <ThemeToggle />
          <Pressable style={styles.logout} onPress={async () => { await endSession(); nav.reset({ index: 0, routes: [{ name: "Login" }] }); }}>
            <Text style={styles.logoutTxt}>{t("Logout")}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.row2}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flex: 1 }}>
          {NAV.map((n) => {
            const on = n.to === route.name || (n.to === "Profile" && inSetup);
            return (
              <Pressable key={n.to} onPress={() => !on && nav.navigate(n.to)} style={[styles.tab, on && styles.tabOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[styles.tabTxt, on && { color: colors.tealDark }]}>{t(n.label)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <View style={styles.langRow}><LanguageSwitcher /></View>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  bar: { paddingHorizontal: 16, paddingBottom: 8, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logoWrap: { backgroundColor: colors.logoBg, borderRadius: 10, paddingHorizontal: colors.logoBg === "transparent" ? 0 : 8 },
  logo: { height: 38, width: 108 },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  logout: { height: 36, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.tealBorder, justifyContent: "center" },
  logoutTxt: { color: colors.teal, fontSize: 13, fontFamily: fonts.bold },
  row2: { flexDirection: "row", marginTop: 10 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  tabOn: { backgroundColor: colors.tealLight },
  tabTxt: { color: colors.muted, fontSize: 13.5, fontFamily: fonts.semibold },
  langRow: { alignItems: "flex-end", marginTop: 8 },
});
