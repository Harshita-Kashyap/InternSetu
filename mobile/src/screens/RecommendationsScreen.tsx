import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import Header from "../components/Header";
import FadeIn from "../components/FadeIn";
import Ring from "../components/Ring";
import { useToast } from "../components/Toast";
import { internships, score } from "../data";
import { loadProfile, Profile } from "../store";
import { colors, fonts, shadow } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Recommendations">;

function DomainBar({ label, value }: { label: string; value: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: value, duration: 1000, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [v, value]);
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.bar}>
        <Animated.View style={[styles.barFill, { width: v.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) }]} />
      </View>
      <Text style={styles.barVal}>{value}%</Text>
    </View>
  );
}

export default function RecommendationsScreen({ navigation }: Props) {
  const toast = useToast();
  const [profile, setProfile] = useState<Profile>({});
  const [mode, setMode] = useState("All");
  const [saved, setSaved] = useState<number[]>([]);
  const [applied, setApplied] = useState<number[]>([]);

  useEffect(() => { loadProfile().then(setProfile); }, []);

  const ranked = useMemo(
    () => internships.map((j) => ({ ...j, match: score(j, profile) })).sort((a, b) => b.match - a.match),
    [profile]
  );
  const list = ranked.filter((j) => mode === "All" || j.mode === mode);
  const strong = ranked.filter((j) => j.match >= 70).length;
  const mySkills = profile.skills ?? [];

  const domainStats = (profile.domains ?? []).map((d) => {
    const items = ranked.filter((j) => j.domain === d);
    return { d, avg: items.length ? Math.round(items.reduce((a, j) => a + j.match, 0) / items.length) : 0 };
  });

  const toggleSave = useCallback((id: number) => {
    setSaved((cur) => {
      const had = cur.includes(id);
      toast(had ? "Removed from saved." : "Saved for later.", "success");
      return had ? cur.filter((x) => x !== id) : [...cur, id];
    });
  }, [toast]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <Header />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <LinearGradient colors={["#1d565d", "#256b73", "#3c8a8a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Text style={styles.eyebrow}>PERSONALISED FOR YOU</Text>
            <Text style={styles.h1}>Your internship matches</Text>
            <Text style={styles.heroSub}>
              {profile.degree
                ? `Based on your ${profile.degree}${profile.field ? ` in ${profile.field}` : ""}, your skills and your preferences.`
                : "Complete your profile for sharper, more personal matches."}
            </Text>
            <View style={styles.stats}>
              {[[ranked.length, "Internships"], [strong, "Strong matches"], [mySkills.length, "Your skills"]].map(([n, l]) => (
                <View key={l as string} style={styles.stat}>
                  <Text style={styles.statN}>{n}</Text>
                  <Text style={styles.statL}>{l}</Text>
                </View>
              ))}
            </View>
            <View style={styles.heroBtns}>
              <Pressable style={styles.heroBtn} onPress={() => navigation.navigate("Profile")}><Text style={styles.heroBtnTxt}>Edit profile</Text></Pressable>
              <Pressable style={styles.heroBtn} onPress={() => navigation.navigate("Preferences")}><Text style={styles.heroBtnTxt}>Change preferences</Text></Pressable>
            </View>
          </LinearGradient>
        </FadeIn>

        {domainStats.length > 0 && (
          <FadeIn delay={120} style={styles.panel}>
            <Text style={styles.panelH}>Match by domain</Text>
            {domainStats.map((s) => <DomainBar key={s.d} label={s.d} value={s.avg} />)}
          </FadeIn>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {["All", "Remote", "Hybrid", "On-site"].map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.filter, mode === m && styles.filterOn]}>
              <Text style={[styles.filterTxt, mode === m && { color: "#fff" }]}>{m}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {list.map((j, i) => (
          <FadeIn key={j.id} delay={Math.min(i, 6) * 70} style={styles.card}>
            <View style={styles.top}>
              <View style={styles.avatar}><Text style={styles.avatarTxt}>{j.company.charAt(0)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{j.title}</Text>
                <Text style={styles.company}>{j.company} · {j.city}</Text>
              </View>
              <Ring value={j.match} />
            </View>
            <View style={styles.tags}>
              <Text style={[styles.tag, styles.tagDomain]}>{j.domain}</Text>
              <Text style={styles.tag}>{j.mode}</Text>
              <Text style={styles.tag}>{j.duration}</Text>
            </View>
            <View style={styles.tags}>
              {j.skills.map((k) => {
                const have = mySkills.includes(k);
                return <Text key={k} style={[styles.skill, have && styles.skillHave]}>{have ? "✓ " : ""}{k}</Text>;
              })}
            </View>
            <View style={styles.bottom}>
              <Text style={styles.stipend}>{j.stipend}</Text>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Pressable onPress={() => toggleSave(j.id)} style={[styles.save, saved.includes(j.id) && styles.saveOn]}>
                  <Text style={{ fontSize: 18, color: saved.includes(j.id) ? colors.rose : colors.muted }}>{saved.includes(j.id) ? "♥" : "♡"}</Text>
                </Pressable>
                <Pressable
                  disabled={applied.includes(j.id)}
                  onPress={() => { setApplied((a) => [...a, j.id]); toast(`Applied to ${j.company}!`, "success"); }}
                  style={[styles.apply, applied.includes(j.id) && { backgroundColor: colors.success }]}
                >
                  <Text style={styles.applyTxt}>{applied.includes(j.id) ? "Applied ✓" : "Apply"}</Text>
                </Pressable>
              </View>
            </View>
          </FadeIn>
        ))}
      </ScrollView>
    </View>
  );
}

const card = { backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "rgba(37,107,115,0.1)" } as const;
const styles = StyleSheet.create({
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
  filters: { gap: 8, paddingVertical: 20 },
  filter: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff" },
  filterOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  filterTxt: { fontSize: 13, fontFamily: fonts.semibold, color: colors.muted },
  card: { ...card, padding: 18, marginBottom: 14, shadowColor: colors.teal, shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.tealLight, alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: colors.teal, fontSize: 19, fontFamily: fonts.headXL },
  title: { fontSize: 15.5, fontFamily: fonts.bold, color: colors.text },
  company: { fontSize: 12.5, color: colors.muted, marginTop: 3, fontFamily: fonts.body },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 14 },
  tag: { fontSize: 12, fontFamily: fonts.semibold, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "#f1f4f3", color: colors.muted, overflow: "hidden" },
  tagDomain: { backgroundColor: colors.tealLight, color: colors.tealDark },
  skill: { fontSize: 12, fontFamily: fonts.body, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed", color: colors.muted, overflow: "hidden" },
  skillHave: { borderStyle: "solid", borderColor: colors.tealBorder, backgroundColor: colors.tealLight, color: colors.tealDark, fontFamily: fonts.semibold },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#edf0ef" },
  stipend: { fontSize: 14, fontFamily: fonts.bold, color: colors.text },
  save: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  saveOn: { borderColor: "#f0b8c0", backgroundColor: "#fdf1f3" },
  apply: { height: 38, paddingHorizontal: 20, borderRadius: 10, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center" },
  applyTxt: { color: "#fff", fontSize: 13, fontFamily: fonts.bold },
});
