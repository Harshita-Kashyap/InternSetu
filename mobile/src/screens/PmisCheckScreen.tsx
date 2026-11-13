import { useSpeakable } from "../speak";
import React, { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import AuthLayout from "./AuthLayout";
import Button from "../components/Button";
import FadeIn from "../components/FadeIn";
import { useI18n } from "../i18n";
import { api, pick, PmisAnswers, PmisHandoff, PmisPrecheck } from "../api";
import { useTheme, Colors, fonts } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "PmisCheck">;
type Yes = "yes" | "no" | "unsure";
type Key = "income" | "family_govt_job" | "excluded_qualification" | "govt_apprenticeship" | "employed_full_time";

/** "Can I apply to PMIS?" One question per screen. Calls the public, stateless POST /pmis/precheck; nothing is stored. */
export default function PmisCheckScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t, lang } = useI18n();
  const [limit, setLimit] = useState(12);
  const [officialUrl, setOfficialUrl] = useState("https://pminternship.mca.gov.in/");
  const [step, setStep] = useState(0);
  const [age, setAge] = useState("");
  const [ans, setAns] = useState<Partial<Record<Key, Yes>>>({});
  const [result, setResult] = useState<PmisPrecheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [handoff, setHandoff] = useState<PmisHandoff | null>(null);

  useEffect(() => { api.pmisRules().then((r) => { setLimit(r.family_income_limit_lakh); setOfficialUrl(r.official_url); }).catch(() => {}); api.pmisHandoff().then(setHandoff).catch(() => {}); }, []);

  const questions: { key: Key; icon: string; text: string }[] = [
    { key: "income", icon: "₹", text: `${t("Is your family's total income more than")} ₹${limit} ${t("lakh in a year?")}` },
    { key: "family_govt_job", icon: "🏛", text: t("Does anyone in your family have a permanent government job?") },
    { key: "excluded_qualification", icon: "🎓", text: t("Do you have a degree like IIT, IIM, CA, MBA, MBBS or PhD?") },
    { key: "govt_apprenticeship", icon: "🛠", text: t("Have you done, or are you doing, a government apprenticeship (NATS or NAPS)?") },
    { key: "employed_full_time", icon: "💼", text: t("Do you have a full-time job right now?") },
  ];
  const total = questions.length + 1;
  const ageNum = parseInt(age, 10);
  const ageOk = Number.isFinite(ageNum) && ageNum >= 10 && ageNum <= 80;

  const submit = async (a: Partial<Record<Key, Yes>>) => {
    setBusy(true); setError("");
    const tri = (v?: Yes) => (v === "yes" ? true : v === "no" ? false : null);
    const body: PmisAnswers = {
      age: ageNum,
      family_income_lakh: a.income === "yes" ? limit + 1 : a.income === "no" ? 0 : null,
      family_govt_job: tri(a.family_govt_job), excluded_qualification: tri(a.excluded_qualification),
      govt_apprenticeship: tri(a.govt_apprenticeship), employed_full_time: tri(a.employed_full_time),
    };
    try { setResult(await api.pmisPrecheck(body)); }
    catch (e) { setError(e instanceof Error ? e.message : t("Something went wrong.")); }
    finally { setBusy(false); }
  };
  const answer = (v: Yes) => {
    const next = { ...ans, [questions[step - 1].key]: v };
    setAns(next);
    if (step === questions.length) submit(next); else setStep(step + 1);
  };
  const restart = () => { setStep(0); setAns({}); setAge(""); setResult(null); setError(""); };

  useSpeakable(`${t("Can I apply to PMIS?")}. ${t("Answer a few quick questions. Nothing you answer is saved.")}`);
  return (
    <AuthLayout>
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <Text style={styles.h1}>{t("Can I apply to PMIS?")}</Text>
        <Text style={styles.sub}>{t("Answer a few quick questions. Nothing you answer is saved.")}</Text>
      </View>

      {!result && (
        <FadeIn key={step} style={{ alignItems: "center" }}>
          <Text style={styles.progress}>{t("Question")} {step + 1} / {total}</Text>
          <View style={styles.track}><View style={[styles.fill, { width: `${((step + 1) / total) * 100}%` }]} /></View>

          {step === 0 ? (
            <>
              <Text style={styles.icon} accessible={false}>🎂</Text>
              <Text style={styles.q}>{t("How old are you?")}</Text>
              <TextInput value={age} onChangeText={(v) => setAge(v.replace(/[^0-9]/g, "").slice(0, 2))} keyboardType="number-pad" maxLength={2}
                style={styles.age} accessibilityLabel={t("How old are you?")} placeholderTextColor={colors.faint} />
              <Button title={t("Next")} onPress={() => setStep(1)} disabled={!ageOk} />
            </>
          ) : (
            <>
              <Text style={styles.icon} accessible={false}>{questions[step - 1].icon}</Text>
              <Text style={styles.q}>{questions[step - 1].text}</Text>
              <View style={styles.choices}>
                {([["yes", t("Yes")], ["no", t("No")], ["unsure", t("Not sure")]] as [Yes, string][]).map(([v, label]) => (
                  <Pressable key={v} disabled={busy} onPress={() => answer(v)} accessibilityRole="button" accessibilityLabel={label}
                    style={[styles.choice, v === "unsure" && { borderColor: colors.border }]}>
                    <Text style={styles.choiceTxt}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.link} onPress={() => setStep(step - 1)}>{t("Back")}</Text>
            </>
          )}
          {error ? <Text style={styles.err} accessibilityRole="alert">{error}</Text> : null}
        </FadeIn>
      )}

      {result && (
        <FadeIn>
          <View style={[styles.result, { borderColor: result.status === "likely_eligible" ? "#2e9e6b" : result.status === "likely_not_eligible" ? "#c0562f" : "#c9962b" }]}>
            <Text style={styles.resultH}>{result.status === "likely_eligible" ? "✓ " : result.status === "likely_not_eligible" ? "! " : "? "}{pick(result.summary, lang)}</Text>
            {result.blockers.map((b) => <Text key={b.code} style={styles.bullet}>• {pick(b.text, lang)}</Text>)}
            {result.status === "check_details" ? <Text style={styles.bullet}>{t("Some answers were \"Not sure\". Check those on the official portal.")}</Text> : null}
          </View>
          <Text style={styles.notice}>ⓘ {pick(result.notice, lang)}</Text>
          {handoff && result.status !== "likely_not_eligible" ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.resultH}>{t("Keep these ready before you apply")}</Text>
              {handoff.documents.map((d) => <Text key={d.id} style={styles.bullet}>• {pick(d.label, lang)}</Text>)}
              <Text style={[styles.notice, { marginTop: 8 }]}>{pick(handoff.note, lang)}</Text>
            </View>
          ) : null}
          <Button title={t("Open official PMIS portal")} onPress={() => Linking.openURL(result.official_url || officialUrl)} />
          <Text style={[styles.link, { marginTop: 16 }]} onPress={restart}>{t("Start again")}</Text>
        </FadeIn>
      )}
      <Text style={[styles.link, { textAlign: "center", marginTop: 22 }]} onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Login"))}>{t("← Back")}</Text>
    </AuthLayout>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  h1: { fontSize: 24, color: colors.teal, fontFamily: fonts.headXL, letterSpacing: -0.5, textAlign: "center" },
  sub: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 8, lineHeight: 21, fontFamily: fonts.body },
  progress: { fontSize: 14, color: colors.muted, fontFamily: fonts.medium, alignSelf: "flex-start", marginBottom: 6 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.track, alignSelf: "stretch", overflow: "hidden", marginBottom: 20 },
  fill: { height: 6, backgroundColor: colors.teal },
  icon: { fontSize: 44, marginBottom: 10 },
  q: { fontSize: 18, color: colors.text, fontFamily: fonts.bold, textAlign: "center", lineHeight: 26, marginBottom: 18 },
  age: { width: 120, minHeight: 56, fontSize: 24, textAlign: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 12, color: colors.text, marginBottom: 18, fontFamily: fonts.bold },
  choices: { alignSelf: "stretch", gap: 12, marginBottom: 18 },
  choice: { minHeight: 52, borderRadius: 12, borderWidth: 2, borderColor: colors.teal, alignItems: "center", justifyContent: "center" },
  choiceTxt: { fontSize: 17, color: colors.text, fontFamily: fonts.bold },
  link: { color: colors.teal, fontSize: 14, fontFamily: fonts.bold, textAlign: "center" },
  err: { color: "#c0562f", marginTop: 12, textAlign: "center", fontFamily: fonts.body },
  result: { borderWidth: 1.5, borderRadius: 12, padding: 16, marginBottom: 14 },
  resultH: { fontSize: 17, color: colors.text, fontFamily: fonts.bold, marginBottom: 8, lineHeight: 24 },
  bullet: { fontSize: 14, color: colors.text, fontFamily: fonts.body, lineHeight: 21, marginTop: 4 },
  notice: { fontSize: 12.5, color: colors.muted, fontFamily: fonts.body, lineHeight: 19, marginBottom: 16 },
});
