import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, ApiError, InternshipDetail } from "../api";
import { useI18n } from "../i18n";
import Ring from "./Ring";
import Button from "./Button";
import { useTheme, Colors, fonts } from "../theme";

/** "Check match": eligibility (hard rules) and the 0-100 match score are shown as two separate things. */
export default function MatchSheet({ id, onClose, onProfile }: { id: string | null; onClose: () => void; onProfile: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [d, setD] = useState<InternshipDetail | null>(null);
  const [err, setErr] = useState<{ msg: string; setup: boolean } | null>(null);

  useEffect(() => {
    setD(null); setErr(null);
    if (!id) return;
    api.internship(id, lang).then(setD).catch((e) =>
      setErr({ msg: e instanceof ApiError ? e.message : t("Could not load the match."), setup: e instanceof ApiError && e.code === "profile_incomplete" }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, lang]);

  const missing = new Set(d?.skill_gap.missing_mandatory ?? []);
  return (
    <Modal visible={!!id} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t("Close")} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.grab} />
        <ScrollView showsVerticalScrollIndicator={false}>
          {!d && !err ? <ActivityIndicator color={colors.teal} size="large" style={{ marginVertical: 40 }} /> : null}
          {err ? (
            <View style={{ alignItems: "center", paddingVertical: 24, gap: 14 }}>
              <Text style={styles.h2}>{err.msg}</Text>
              {err.setup ? <Button title={t("Complete my profile")} onPress={() => { onClose(); onProfile(); }} /> : null}
            </View>
          ) : null}
          {d ? (
            <>
              <Text style={styles.eyebrow}>{t("CHECK MATCH")}</Text>
              <Text style={styles.title}>{d.title}</Text>
              <Text style={styles.muted}>{[d.company_name, d.location_name, d.sector_name, d.duration].filter(Boolean).join(" · ")}</Text>

              {d.eligible ? (
                <View style={[styles.callout, { backgroundColor: colors.tealLight }]}>
                  <Ring value={Math.round(d.match_percentage)} size={64} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.strong}>{t("You are eligible")}</Text>
                    <Text style={styles.muted}>{d.low_match ? t("Low match: you meet the requirements, but your profile fits this role only partly.") : `${Math.round(d.match_percentage)}/100 ${t("match score")}`}</Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.callout, { backgroundColor: colors.warnBg }]}>
                  <View style={styles.x}><Text style={styles.xTxt}>!</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.strong}>{t("Not eligible")}</Text>
                    <Text style={styles.muted}>{t("A required condition is not met. This is an eligibility rule, not a low score.")}</Text>
                  </View>
                </View>
              )}

              {d.why_recommended.length ? <><Text style={styles.h4}>{t("Why this matches")}</Text>{d.why_recommended.map((r) => <Text key={r} style={styles.li}>• {r}</Text>)}</> : null}
              {d.considerations.length ? <><Text style={styles.h4}>{t("Things to consider")}</Text>{d.considerations.map((r) => <Text key={r} style={styles.li}>• {r}</Text>)}</> : null}

              <Text style={styles.h4}>{t("Required skills")}</Text>
              <View style={styles.chips}>
                {d.mandatory_skills.length === 0 ? <Text style={styles.muted}>{t("None listed")}</Text> : null}
                {d.mandatory_skills.map((s) => {
                  const bad = missing.has(s.name);
                  return <Text key={s.id} style={[styles.chip, bad ? styles.chipBad : styles.chipOk]}>{bad ? "✗" : "✓"} {s.name}</Text>;
                })}
              </View>
              {d.education_required ? <Text style={[styles.muted, { marginTop: 8 }]}>{t("Minimum education")}: {d.education_required}</Text> : null}
              {d.skill_gap.missing_preferred.length ? (
                <><Text style={styles.h4}>{t("Nice-to-have skills you could add")}</Text>
                <View style={styles.chips}>{d.skill_gap.missing_preferred.map((s) => <Text key={s} style={styles.chip}>{s}</Text>)}</View></>
              ) : null}

              <Text style={[styles.strong, { marginTop: 18 }]}>{d.stipend_inr_per_month ? `₹${d.stipend_inr_per_month.toLocaleString("en-IN")}/${t("mo")}` : t("Stipend not listed")}</Text>
              <View style={{ marginTop: 12 }}><Button title={t("Apply on PMIS")} onPress={() => Linking.openURL(d.apply_url)} /></View>
              {d.is_demo_data ? <Text style={[styles.muted, { marginTop: 10 }]}>{t("Demo listing: not an official PMIS vacancy. Apply only through the official PMIS portal.")}</Text> : null}
            </>
          ) : null}
        </ScrollView>
        <Pressable onPress={onClose} style={styles.close}><Text style={styles.closeTxt}>{t("Close")}</Text></Pressable>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(8,20,22,0.55)" },
  sheet: { maxHeight: "88%", backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  grab: { alignSelf: "center", width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 },
  eyebrow: { color: colors.teal, fontSize: 11.5, fontFamily: fonts.bold, letterSpacing: 1.5 },
  title: { fontSize: 21, fontFamily: fonts.headXL, color: colors.text, marginTop: 4, letterSpacing: -0.4 },
  h2: { fontSize: 16, fontFamily: fonts.bold, color: colors.text, textAlign: "center" },
  h4: { fontSize: 14, fontFamily: fonts.bold, color: colors.text, marginTop: 18, marginBottom: 6 },
  muted: { fontSize: 13, color: colors.muted, fontFamily: fonts.body, lineHeight: 19, marginTop: 3 },
  strong: { fontSize: 15, color: colors.text, fontFamily: fonts.bold },
  li: { fontSize: 13.5, color: colors.text, fontFamily: fonts.body, lineHeight: 21 },
  callout: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 16, marginTop: 16 },
  x: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.warn, alignItems: "center", justifyContent: "center" },
  xTxt: { color: "#fff", fontSize: 20, fontFamily: fonts.bold },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999, overflow: "hidden", backgroundColor: colors.chip, color: colors.text, fontSize: 12.5, fontFamily: fonts.medium },
  chipOk: { backgroundColor: colors.tealLight, color: colors.tealDark },
  chipBad: { backgroundColor: colors.dangerBg, color: colors.danger },
  close: { alignItems: "center", paddingTop: 12 },
  closeTxt: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 14 },
});
