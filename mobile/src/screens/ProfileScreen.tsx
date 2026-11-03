import React, { useMemo, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import SetupLayout from "./SetupLayout";
import Field from "../components/Field";
import Button from "../components/Button";
import { useToast } from "../components/Toast";
import { educationLevels } from "../data";
import { loadProfileRemote, saveProfileRemote } from "../store";
import { useTax } from "../taxo";
import { ApiError } from "../api";
import { useTheme, Colors, fonts } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

export default function ProfileScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useI18n();
  const toast = useToast();
  const [education, setEducation] = useState("Undergraduate");
  const [degree, setDegree] = useState("");
  const [field, setField] = useState("");
  const [college, setCollege] = useState("");
  const edu = useTax("education_level");
  const levels = edu.names.length ? edu.names : educationLevels;
  const [saving, setSaving] = useState(false);
  const bar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProfileRemote().then((p) => {
      if (p.education) setEducation(p.education);
      if (p.degree) setDegree(p.degree);
      if (p.field) setField(p.field);
      if (p.college) setCollege(p.college);
    });
  }, []);

  const filled = [degree, field, college].filter((v) => v.trim()).length;
  useEffect(() => {
    Animated.timing(bar, { toValue: filled / 3, duration: 400, useNativeDriver: false }).start();
  }, [filled, bar]);

  const next = async () => {
    if (!degree.trim() || !field.trim() || !college.trim()) return toast(t("Please fill in your degree, field of study and college."));
    setSaving(true);
    try { await saveProfileRemote({ education, degree, field, college }); navigation.navigate("Skills"); }
    catch (e) { toast(e instanceof ApiError || e instanceof Error ? e.message : t("Could not save your details.")); }
    finally { setSaving(false); }
  };

  return (
    <SetupLayout
      step={1}
      eyebrow={t("LET'S GET STARTED")}
      title={t("Let's find the right internship for you")}
      subtitle={t("Tell us about your education, skills, and preferences so we can personalize your internship recommendations.")}
    >
      <View style={styles.progRow}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
        </View>
        <Text style={styles.small}>{filled}/3 {t("details added")}</Text>
      </View>

      <Text style={styles.label}>{t("Education level")}</Text>
      <View style={styles.levels}>
        {levels.map((l) => (
          <Pressable key={l} onPress={() => setEducation(l)} style={[styles.pill, education === l && styles.pillOn]}>
            <Text style={[styles.pillTxt, education === l && { color: "#fff" }]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      <Field label={t("Degree / Course")} placeholder={t("e.g. B.Tech, B.Com, BBA")} value={degree} onChangeText={setDegree} />
      <Field label={t("Field of study")} placeholder={t("e.g. Computer Science")} value={field} onChangeText={setField} />
      <Field label={t("College / Institution")} placeholder={t("Enter your college or institution")} value={college} onChangeText={setCollege} />
      <Button title={t("Continue")} arrow onPress={next} loading={saving} />
    </SetupLayout>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  progRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 22 },
  track: { flex: 1, height: 6, borderRadius: 6, backgroundColor: colors.track, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 6, backgroundColor: colors.teal },
  small: { fontSize: 12, color: colors.muted, fontFamily: fonts.semibold },
  label: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text, marginBottom: 10 },
  levels: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 22 },
  pill: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.creamLight },
  pillOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  pillTxt: { fontSize: 13.5, fontFamily: fonts.semibold, color: colors.text },
});
