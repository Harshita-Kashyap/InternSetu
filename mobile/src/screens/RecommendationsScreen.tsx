import React, { useMemo, useCallback, useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import Header from "../components/Header";
import FadeIn from "../components/FadeIn";
import Ring from "../components/Ring";
import Button from "../components/Button";
import { useToast } from "../components/Toast";
import { api, ApiError, RecommendationsResponse } from "../api";
import { useTheme, Colors, fonts, shadow } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Recommendations">;

export default function RecommendationsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t, lang } = useI18n();
  const toast = useToast();
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (pull = false) => {
    pull ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [r, s] = await Promise.all([api.recommendations(undefined, lang), api.saved().catch(() => [])]);
      setData(r);
      setSaved(s.map((x) => x.internship_id));
    } catch (e) {
      if (e instanceof ApiError && e.code === "profile_incomplete") { toast(t("Please complete your profile first.")); navigation.reset({ index: 0, routes: [{ name: "Profile" }] }); return; }
      if (e instanceof ApiError && e.code === "consent_required") { navigation.reset({ index: 0, routes: [{ name: "Consent" }] }); return; }
      setError(e instanceof ApiError ? e.message : t("Could not load recommendations."));
    } finally { setLoading(false); setRefreshing(false); }
  }, [navigation, toast, lang]);

  useEffect(() => { load(); }, [load]);

  const toggleSave = async (id: string) => {
    const on = saved.includes(id);
    setSaved((c) => (on ? c.filter((x) => x !== id) : [...c, id]));
    try { await (on ? api.unsave(id) : api.save(id)); toast(on ? t("Removed from saved.") : "Saved for later.", "success"); }
    catch (e) { setSaved((c) => (on ? [...c, id] : c.filter((x) => x !== id))); toast(e instanceof ApiError ? e.message : t("Could not update saved list.")); }
  };
  const apply = (url: string) => Linking.openURL(url).catch(() => toast(t("Could not open the PMIS portal link.")));

  const recs = data?.recommendations ?? [];
  const best = recs.length ? Math.max(...recs.map((r) => r.match_percentage)) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <Header />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 50 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.teal} />}>
        <FadeIn>
          <LinearGradient colors={["#1d565d", "#256b73", "#3c8a8a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Text style={styles.eyebrow}>{t("PERSONALISED FOR YOU")}</Text>
            <Text style={styles.h1}>{t("Your internship matches")}</Text>
            <Text style={styles.heroSub}>{t("Ranked by skills, education, location and interests, with reasons for each match.")}</Text>
            <View style={styles.stats}>
              {[[data?.eligible_count ?? "–", "Eligible"], [recs.length, "Top picks"], [best ? `${best}%` : "–", "Best match"]].map(([n, l]) => (
                <View key={l as string} style={styles.stat}><Text style={styles.statN}>{n}</Text><Text style={styles.statL}>{t(l as string)}</Text></View>
              ))}
            </View>
            <View style={styles.heroBtns}>
              <Pressable style={styles.heroBtn} onPress={() => navigation.navigate("Profile")}><Text style={styles.heroBtnTxt}>{t("Edit profile")}</Text></Pressable>
              <Pressable style={styles.heroBtn} onPress={() => navigation.navigate("Preferences")}><Text style={styles.heroBtnTxt}>{t("Change preferences")}</Text></Pressable>
              <Pressable style={styles.heroBtn} onPress={() => navigation.navigate("Saved")}><Text style={styles.heroBtnTxt}>♥ {t("Saved")}</Text></Pressable>
            </View>
          </LinearGradient>
        </FadeIn>

        {loading ? <ActivityIndicator color={colors.teal} size="large" style={{ marginTop: 40 }} /> : null}

        {error ? (
          <View style={[styles.panel, { alignItems: "center" }]}>
            <Text style={styles.panelH}>{t("Something went wrong")}</Text>
            <Text style={[styles.note, { textAlign: "center", marginBottom: 14 }]}>{error}</Text>
            <Button title={t("Try again")} onPress={() => load()} />
          </View>
        ) : null}

        {data?.demo_notice ? <View style={styles.demo}><Text style={styles.demoTxt}>{data.demo_notice}</Text></View> : null}
        {data && !recs.length && !error ? (
          <View style={styles.panel}>
            <Text style={styles.panelH}>{t("No eligible internships yet")}</Text>
            <Text style={styles.note}>{data.message || "Try adding more skills or widening your preferences."}</Text>
            {data.nearest.map((n) => (
              <View key={n.internship_id} style={styles.near}>
                <Text style={styles.title}>{n.title}</Text>
                <Text style={styles.company}>{n.company_name} · {n.location_name}</Text>
                <Text style={styles.note}>{n.reason}</Text>
                {n.missing_mandatory.length ? <Text style={styles.note}>{t("Missing:")} {n.missing_mandatory.join(", ")}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {recs.map((j, i) => {
          const isSaved = saved.includes(j.internship_id);
          const gaps = [...j.skill_gap.missing_mandatory, ...j.skill_gap.missing_preferred];
          return (
            <FadeIn key={j.internship_id} delay={Math.min(i, 6) * 70} style={styles.card}>
              <View style={styles.top}>
                <View style={styles.avatar}><Text style={styles.avatarTxt}>{j.company_name.charAt(0)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{j.title}</Text>
                  <Text style={styles.company}>{j.company_name} · {j.location_name}</Text>
                </View>
                <Ring value={j.match_percentage} />
              </View>
              <View style={styles.tags}>
                <Text style={[styles.tag, styles.tagDomain]}>{j.sector_name}</Text>
                {j.role_name ? <Text style={styles.tag}>{j.role_name}</Text> : null}
                {j.duration ? <Text style={styles.tag}>{j.duration}</Text> : null}
                {j.match_tag ? <Text style={styles.tag}>{j.match_tag}</Text> : null}
                {j.is_demo_data ? <Text style={styles.tag}>{t("Demo data")}</Text> : null}
              </View>
              {j.why_recommended.length ? (
                <View style={styles.block}>
                  <Text style={styles.blockH}>{t("Why recommended")}</Text>
                  {j.why_recommended.map((w, k) => <Text key={k} style={styles.line}>✓ {w}</Text>)}
                </View>
              ) : null}
              {j.considerations.length ? (
                <View style={styles.block}>
                  <Text style={styles.blockH}>{t("Keep in mind")}</Text>
                  {j.considerations.map((w, k) => <Text key={k} style={styles.line}>• {w}</Text>)}
                </View>
              ) : null}
              {gaps.length ? (
                <View style={styles.block}>
                  <Text style={styles.blockH}>{t("Skills to build")}</Text>
                  <View style={styles.tags}>{gaps.map((k) => <Text key={k} style={styles.skill}>{k}</Text>)}</View>
                </View>
              ) : null}
              <View style={styles.bottom}>
                <Text style={styles.stipend}>{j.stipend_inr_per_month != null ? `₹${j.stipend_inr_per_month.toLocaleString("en-IN")}/mo` : "Stipend not listed"}</Text>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <Pressable onPress={() => toggleSave(j.internship_id)} style={[styles.save, isSaved && styles.saveOn]}>
                    <Text style={{ fontSize: 18, color: isSaved ? colors.rose : colors.muted }}>{isSaved ? "♥" : "♡"}</Text>
                  </Pressable>
                  <Pressable onPress={() => apply(j.apply_url)} style={styles.apply}><Text style={styles.applyTxt}>{t("Apply on PMIS")}</Text></Pressable>
                </View>
              </View>
            </FadeIn>
          );
        })}

        {data && data.skill_gap_summary.length ? (
          <View style={styles.panel}>
            <Text style={styles.panelH}>{t("Skills that would help most")}</Text>
            <View style={styles.tags}>{data.skill_gap_summary.map((g) => <Text key={g.skill_id} style={styles.skill}>{g.skill} ×{g.count}</Text>)}</View>
          </View>
        ) : null}

        {data ? <Text style={styles.disclaimer}>{data.disclaimer}</Text> : null}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Colors) => { const card = { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: "rgba(37,107,115,0.1)" } as const; return StyleSheet.create({
  hero: { borderRadius: 20, padding: 22, ...shadow },
  eyebrow: { color: "#cfe8e6", fontSize: 12, fontFamily: fonts.bold, letterSpacing: 1.5 },
  h1: { color: "#fff", fontSize: 28, fontFamily: fonts.headXL, letterSpacing: -0.8, marginTop: 8 },
  heroSub: { color: "#d9ecea", fontSize: 14, lineHeight: 21, marginTop: 8, fontFamily: fonts.body },
  stats: { flexDirection: "row", gap: 10, marginTop: 18 },
  stat: { flex: 1, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  statN: { color: "#fff", fontSize: 24, fontFamily: fonts.headXL },
  statL: { color: "#d9ecea", fontSize: 11, fontFamily: fonts.body, marginTop: 2 },
  heroBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  heroBtn: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" },
  heroBtnTxt: { color: "#fff", fontSize: 13, fontFamily: fonts.bold },
  panel: { ...card, marginTop: 16, padding: 20 },
  panelH: { fontSize: 16, fontFamily: fonts.bold, color: colors.text, marginBottom: 14 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  barLabel: { width: 92, fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  bar: { flex: 1, height: 10, borderRadius: 10, backgroundColor: colors.track, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 10, backgroundColor: colors.teal },
  barVal: { width: 40, textAlign: "right", fontSize: 13, fontFamily: fonts.bold, color: colors.tealDark },
  note: { fontSize: 13, color: colors.muted, lineHeight: 19, fontFamily: fonts.body, marginTop: 4 },
  near: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider },
  demo: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: colors.warnBg, borderWidth: 1, borderColor: colors.warn },
  demoTxt: { fontSize: 12.5, color: colors.warn, lineHeight: 18, fontFamily: fonts.body },
  block: { marginTop: 14 },
  blockH: { fontSize: 12.5, fontFamily: fonts.bold, color: colors.tealDark, marginBottom: 6 },
  line: { fontSize: 13, color: colors.text, lineHeight: 19, fontFamily: fonts.body, marginBottom: 3 },
  disclaimer: { fontSize: 11.5, color: colors.faint, lineHeight: 17, textAlign: "center", marginTop: 8, fontFamily: fonts.body },
  filters: { gap: 8, paddingVertical: 20 },
  filter: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  filterOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  filterTxt: { fontSize: 13, fontFamily: fonts.semibold, color: colors.muted },
  card: { ...card, padding: 18, marginBottom: 14, shadowColor: colors.teal, shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.tealLight, alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: colors.teal, fontSize: 19, fontFamily: fonts.headXL },
  title: { fontSize: 15.5, fontFamily: fonts.bold, color: colors.text },
  company: { fontSize: 12.5, color: colors.muted, marginTop: 3, fontFamily: fonts.body },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 14 },
  tag: { fontSize: 12, fontFamily: fonts.semibold, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.chip, color: colors.muted, overflow: "hidden" },
  tagDomain: { backgroundColor: colors.tealLight, color: colors.tealDark },
  skill: { fontSize: 12, fontFamily: fonts.body, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed", color: colors.muted, overflow: "hidden" },
  skillHave: { borderStyle: "solid", borderColor: colors.tealBorder, backgroundColor: colors.tealLight, color: colors.tealDark, fontFamily: fonts.semibold },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.divider },
  stipend: { fontSize: 14, fontFamily: fonts.bold, color: colors.text },
  save: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  saveOn: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  apply: { height: 38, paddingHorizontal: 20, borderRadius: 10, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center" },
  applyTxt: { color: "#fff", fontSize: 13, fontFamily: fonts.bold },
}); };
