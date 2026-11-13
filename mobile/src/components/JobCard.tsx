import React, { useMemo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { BrowseItem } from "../api";
import { useI18n } from "../i18n";
import { useTheme, Colors, fonts, shadow } from "../theme";
import ApplyHelp from "./ApplyHelp";

type Props = {
  item: BrowseItem;
  onCheck: () => void;
  onSave?: () => void;
  onRemove?: () => void;
  busy?: boolean;
};

/** One internship card, used by Discover and Saved so both look and behave the same. */
export default function JobCard({ item: j, onCheck, onSave, onRemove, busy }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useI18n();
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.avatar}><Text style={styles.avatarTxt}>{(j.company_name || "?").charAt(0)}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>{j.title}</Text>
          <Text style={styles.company} numberOfLines={1}>{j.company_name}</Text>
        </View>
        {j.eligible === true && j.match_percentage != null ? (
          <View style={styles.pill}><Text style={styles.pillTxt}>{Math.round(j.match_percentage)}%</Text><Text style={styles.pillSub}>{t("match")}</Text></View>
        ) : null}
      </View>

      <View style={styles.tags}>
        <Text style={styles.tag}>📍 {j.location_name}</Text>
        {j.distance_km != null && j.distance_km > 0 ? <Text style={styles.tag}>{j.distance_km} km {t("away")}</Text> : null}
        <Text style={[styles.tag, styles.tagDomain]}>{j.sector_name}</Text>
        {j.duration ? <Text style={styles.tag}>🕒 {j.duration}</Text> : null}
        {j.stipend_inr_per_month != null ? <Text style={styles.tag}>₹{j.stipend_inr_per_month.toLocaleString("en-IN")}/{t("mo")}</Text> : null}
        {j.is_demo_data ? <Text style={[styles.tag, styles.tagDemo]}>{t("Demo data")}</Text> : null}
      </View>

      {j.eligible === true ? <Text style={[styles.status, { color: j.low_match ? colors.warn : colors.success }]}>{j.low_match ? t("Eligible · low match") : t("Eligible")}</Text> : null}
      {j.eligible === false ? (
        <Text style={[styles.status, { color: colors.danger }]}>
          {j.education_ok !== false && j.missing_mandatory.length > 0 && j.missing_mandatory.length <= 2 ? `${t("Close match")} · ` : ""}{t("Not eligible")}: {j.missing_mandatory.length ? `${t("needs")} ${j.missing_mandatory.slice(0, 3).join(", ")}${j.missing_mandatory.length > 3 ? ` +${j.missing_mandatory.length - 3}` : ""}` : t("education level below requirement")}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={onCheck} style={styles.ghost} accessibilityRole="button"><Text style={styles.ghostTxt}>{t("Check match")}</Text></Pressable>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {onSave ? (
            <Pressable onPress={onSave} style={styles.heart} accessibilityRole="button" accessibilityLabel={t("Save internship")} accessibilityState={{ selected: j.saved }}>
              <Text style={{ fontSize: 18, color: j.saved ? colors.rose : colors.muted }}>{j.saved ? "♥" : "♡"}</Text>
            </Pressable>
          ) : null}
          {onRemove ? (
            <Pressable onPress={onRemove} disabled={busy} style={[styles.ghost, styles.ghostDanger]} accessibilityRole="button"><Text style={[styles.ghostTxt, { color: colors.danger }]}>{busy ? "…" : t("Remove")}</Text></Pressable>
          ) : (
            <Pressable onPress={() => Linking.openURL(j.apply_url)} style={styles.apply} accessibilityRole="link"><Text style={styles.applyTxt}>{t("Apply on PMIS")}</Text></Pressable>
          )}
        </View>
      </View>
      {onRemove ? null : <ApplyHelp />}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border, ...shadow, shadowOpacity: 0.08 },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.tealLight, alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: colors.tealDark, fontSize: 18, fontFamily: fonts.headXL },
  title: { fontSize: 16, fontFamily: fonts.head, color: colors.text, lineHeight: 21 },
  company: { fontSize: 13, color: colors.muted, fontFamily: fonts.body, marginTop: 1 },
  pill: { alignItems: "center", paddingVertical: 5, paddingHorizontal: 11, borderRadius: 12, backgroundColor: colors.tealLight },
  pillTxt: { color: colors.tealDark, fontSize: 16, fontFamily: fonts.headXL },
  pillSub: { color: colors.tealDark, fontSize: 10, fontFamily: fonts.medium },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  tag: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, overflow: "hidden", backgroundColor: colors.chip, color: colors.text, fontSize: 12, fontFamily: fonts.medium },
  tagDomain: { backgroundColor: colors.tealLight, color: colors.tealDark },
  tagDemo: { backgroundColor: colors.warnBg, color: colors.warn },
  status: { marginTop: 12, fontSize: 13, fontFamily: fonts.bold },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider },
  ghost: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
  ghostDanger: { borderColor: colors.danger },
  ghostTxt: { color: colors.text, fontSize: 13, fontFamily: fonts.bold },
  heart: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  apply: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.teal, justifyContent: "center" },
  applyTxt: { color: "#fff", fontSize: 13, fontFamily: fonts.bold },
});
