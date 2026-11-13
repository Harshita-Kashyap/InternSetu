import { useSpeakable } from "../speak";
import React, { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import Header from "../components/Header";
import Field from "../components/Field";
import Button from "../components/Button";
import Choice from "../components/Choice";
import TaxPicker from "../components/TaxPicker";
import GroupedSkillPicker from "../components/GroupedSkillPicker";
import PickOther from "../components/PickOther";
import { useToast } from "../components/Toast";
import { useSetupStyles } from "./SetupLayout";
import { educationLevels } from "../data";
import { loadProfileRemote, saveProfileRemote, Profile } from "../store";
import { useTax } from "../taxo";
import { api } from "../api";
import { useI18n } from "../i18n";
import { useTheme, Colors, fonts, shadow } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "EditProfile">;
type Mode = NonNullable<Profile["relocate"]>;

/** Edit Profile: one prefilled, sectioned screen that updates the existing profile (not the onboarding steps). */
export default function EditProfileScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const s = useSetupStyles();
  const { t } = useI18n();
  const toast = useToast();
  const edu = useTax("education_level"), degs = useTax("degree"), flds = useTax("field_of_study");
  const sk = useTax("skill"), cats = useTax("skill_category"), city = useTax("city"), sec = useTax("sector");
  const levels = edu.names.length ? edu.names : educationLevels;
  const [orig, setOrig] = useState<Profile | null>(null);
  const [p, setP] = useState<Profile>({});
  const [wasComplete, setWasComplete] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([loadProfileRemote(), api.getProfile().catch(() => null)]).then(([lp, ap]) => {
      setOrig(lp); setP(lp); setWasComplete(ap?.status === "complete");
    });
  }, []);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((c) => ({ ...c, [k]: v }));
  const dirty = JSON.stringify(orig) !== JSON.stringify(p);

  const save = async () => {
    if (!p.degree?.trim() || !p.field?.trim() || !p.college?.trim()) return toast(t("Please fill in your degree, field of study and college."));
    if (!p.location?.trim()) return toast(t("Please select the city where you live."));
    if (!p.skills?.length) return toast(t("Please select at least one skill."));
    if (p.relocate === "selected" && !p.preferredLocations?.length) return toast(t("Please pick at least one other city."));
    setSaving(true);
    try {
      await saveProfileRemote({ ...p, degree: p.degree.trim(), field: p.field.trim(), college: p.college.trim(), location: p.location.trim(), relocate: p.relocate ?? "nearby" });
      if (wasComplete) await api.confirmProfile();
      setOrig(p); toast(t("Profile updated."), "success");
    } catch (e) { toast(e instanceof Error ? e.message : t("Could not save. Please try again.")); }
    finally { setSaving(false); }
  };

  const modes: { id: Mode; label: string; sub: string }[] = [
    { id: "nearby", label: t("Nearby only"), sub: t("Opportunities in or close to my city") },
    { id: "selected", label: t("Selected cities"), sub: t("My city plus cities I choose") },
    { id: "anywhere", label: t("Anywhere in India"), sub: t("I can move to another city") },
  ];

  useSpeakable(`${t("Update your profile")}. ${t("Change anything below, then press Save changes. Your saved details are already filled in.")}`);
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <Header />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>{t("YOUR PROFILE")}</Text>
          <Text style={styles.h1}>{t("Update your profile")}</Text>
          <Text style={styles.sub}>{t("Change anything below, then press Save changes. Your saved details are already filled in.")}</Text>

          <View style={styles.section}>
            <Text style={styles.legend}>{t("Education")}</Text>
            <View style={styles.levels}>
              {levels.map((l) => (
                <Pressable key={l} onPress={() => set("education", l)} accessibilityRole="radio" accessibilityState={{ selected: p.education === l }} style={[styles.pill, p.education === l && styles.pillOn]}>
                  <Text style={[styles.pillTxt, p.education === l && { color: "#fff" }]}>{l}</Text>
                </Pressable>
              ))}
            </View>
            <PickOther label={t("Degree / Course")} options={degs.names} loading={degs.loading} value={p.degree ?? ""} onChange={(v) => set("degree", v)} searchPlaceholder={t("Search degrees")} />
            <PickOther label={t("Field of study")} options={flds.names} loading={flds.loading} value={p.field ?? ""} onChange={(v) => set("field", v)} searchPlaceholder={t("Search fields")} />
            <Field label={t("College / Institution")} placeholder={t("Enter your college or institution")} value={p.college ?? ""} onChangeText={(v) => set("college", v)} />
          </View>

          <View style={styles.section}>
            <Text style={styles.legend}>{t("Skills")}</Text>
            <Text style={s.count}>{p.skills?.length ?? 0} {t("selected")}</Text>
            <GroupedSkillPicker skills={sk.items} categories={cats.items} loading={sk.loading} selected={p.skills ?? []} onChange={(v) => set("skills", v)} placeholder={t("Search skills (e.g. Python)")} />
          </View>

          <View style={styles.section}>
            <Text style={styles.legend}>{t("Location and preferences")}</Text>
            <PickOther label={t("Where do you live?")} options={city.names} loading={city.loading} value={p.location ?? ""} onChange={(v) => set("location", v)} searchPlaceholder={t("Search your city")} otherPlaceholder={t("Type your city or town")} />
            <Text style={[s.h2, { marginTop: 16 }]}>{t("Location preference")}</Text>
            <View style={s.grid}>
              {modes.map((m) => <Choice key={m.id} wide mark="" selected={p.relocate === m.id} onPress={() => set("relocate", m.id)} label={m.label} sub={m.sub} />)}
            </View>
            {p.relocate === "selected" ? (
              <View style={{ marginTop: 14 }}>
                <Text style={s.h2}>{t("Other cities you would consider")}</Text>
                <TaxPicker options={city.names.filter((c) => c !== p.location)} loading={city.loading} selected={p.preferredLocations ?? []} onChange={(v) => set("preferredLocations", v)} placeholder={t("Search your city")} />
              </View>
            ) : null}
            <Text style={[s.h2, { marginTop: 18 }]}>{t("Preferred domains")}</Text>
            <TaxPicker options={sec.names} loading={sec.loading} selected={p.domains ?? []} onChange={(v) => set("domains", v)} placeholder={t("Search sectors")} />
          </View>
        </ScrollView>
        <View style={styles.bar}>
          <View style={{ flex: 1 }}><Button variant="outline" title={t("Cancel")} onPress={() => navigation.navigate("Home")} /></View>
          <View style={{ flex: 1.4 }}><Button title={t("Save changes")} onPress={save} loading={saving} disabled={!dirty} /></View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  eyebrow: { color: colors.teal, fontSize: 12, fontFamily: fonts.bold, letterSpacing: 1.5, marginTop: 6 },
  h1: { fontSize: 28, fontFamily: fonts.headXL, color: colors.text, letterSpacing: -0.8, marginTop: 6 },
  sub: { fontSize: 14, color: colors.muted, fontFamily: fonts.body, lineHeight: 21, marginTop: 8, marginBottom: 14 },
  section: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginTop: 14, ...shadow },
  legend: { fontSize: 15, fontFamily: fonts.bold, color: colors.teal, marginBottom: 12 },
  levels: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  pill: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.creamLight },
  pillOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  pillTxt: { fontSize: 13.5, fontFamily: fonts.semibold, color: colors.text },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 10, padding: 14, paddingBottom: 22, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
});
