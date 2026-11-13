import React, { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import Illustration from "../components/Illustration";
import { useSpeakable } from "../speak";
import AuthLayout from "./AuthLayout";
import Field from "../components/Field";
import Button from "../components/Button";
import { useToast } from "../components/Toast";
import { api, ApiError } from "../api";
import { useTheme, Colors, fonts } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;
const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];

export default function RegisterScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const barColors = [colors.track, colors.danger, "#e8a33d", "#6bb08a", colors.teal];
  const { t, lang } = useI18n();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");

  const strength = Math.min(4, (password.length >= 8 ? 1 : 0) + (/[A-Z]/.test(password) ? 1 : 0) + (/[0-9]/.test(password) ? 1 : 0) + (/[^A-Za-z0-9]/.test(password) ? 1 : 0));

  const check = () => {
    if (!name.trim()) { toast(t("Please enter your full name.")); return false; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast(t("Please enter a valid email.")); return false; }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) { toast(t("Password needs 8+ characters with a letter and a number.")); return false; }
    if (!agree) { toast(t("Please accept the privacy notice to continue.")); return false; }
    return true;
  };

  const sendCode = async () => {
    if (!check()) return;
    setLoading(true);
    try { await api.requestRegisterCode(email.trim()); setSent(true); toast(t("A code has been sent to your email."), "success"); }
    catch (e) { toast(e instanceof ApiError ? e.message : t("Could not create your account.")); }
    setLoading(false);
  };

  const submit = async () => {
    if (!sent) return sendCode();
    if (!check()) return;
    if (!/^\d{6}$/.test(code.trim())) return toast(t("Please enter the 6-digit code."));
    setLoading(true);
    try {
      await api.register({ full_name: name.trim(), email: email.trim(), password, code: code.trim(), consent: true, preferred_language: lang });
      navigation.reset({ index: 0, routes: [{ name: "Profile" }] });
    } catch (e) {
      toast(e instanceof ApiError ? (e.fields[0]?.message || e.message) : t("Could not create your account."));
      setLoading(false);
    }
  };

  useSpeakable(`${t("Create your account")}. ${t("It takes under a minute. Then we'll set up your profile.")}`);

  return (
    <AuthLayout>
      <View style={styles.head}>
        <Illustration name="signup" width={190} />
        <Text style={styles.welcome}>{t("Join InternSetu")}</Text>
        <Text style={styles.h1}>{t("Create your account")}</Text>
        <Text style={styles.sub}>{t("It takes under a minute. Then we'll set up your profile.")}</Text>
      </View>
      <Field label={t("Full name")} placeholder={t("Your full name")} value={name} onChangeText={setName} />
      <Field label={t("Email")} placeholder="you@example.com" value={email} onChangeText={(v) => { setEmail(v); setSent(false); setCode(""); }} keyboardType="email-address" autoCapitalize="none" />
      <Field label={t("Password")} placeholder={t("Create a password")} secure value={password} onChangeText={setPassword} />
      <View style={styles.strength}>
        {[1, 2, 3, 4].map((n) => (
          <View key={n} style={[styles.seg, { backgroundColor: strength >= n ? barColors[strength] : barColors[0] }]} />
        ))}
        <Text style={styles.small}>{password ? t(labels[strength]) : t("Use 8+ characters, a number & a symbol")}</Text>
      </View>
      <Pressable style={styles.agree} onPress={() => setAgree(!agree)}>
        <Text style={styles.box}>{agree ? "☑" : "☐"}</Text>
        <Text style={styles.agreeTxt}>{t("I accept the privacy notice and agree to InternSetu processing my profile data to recommend internships.")}</Text>
      </Pressable>
      {sent ? <Field label={t("Enter the 6-digit code we emailed you")} placeholder="123456" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={6} /> : null}
      <Button title={sent ? t("Create account") : t("Send verification code")} onPress={submit} loading={loading} />
      {sent ? <Text style={[styles.link, { textAlign: "center", marginTop: 14 }]} onPress={sendCode}>{t("Send a new code")}</Text> : null}
      <View style={styles.reg}>
        <Text style={styles.muted}>{t("Already have an account?")} </Text>
        <Text style={styles.link} onPress={() => navigation.navigate("Login")}>{t("Login")}</Text>
      </View>
    </AuthLayout>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  head: { alignItems: "center", marginBottom: 24 },
  welcome: { fontSize: 15, color: colors.muted, fontFamily: fonts.medium },
  h1: { fontSize: 26, color: colors.teal, fontFamily: fonts.headXL, letterSpacing: -0.6, marginTop: 4 },
  sub: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 10, lineHeight: 21, fontFamily: fonts.body },
  strength: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: -8, marginBottom: 22 },
  seg: { width: 38, height: 5, borderRadius: 4 },
  small: { marginLeft: 6, fontSize: 12, color: colors.muted, fontFamily: fonts.body, flexShrink: 1 },
  agree: { flexDirection: "row", gap: 10, marginBottom: 18, alignItems: "flex-start" },
  box: { fontSize: 20, color: colors.teal, lineHeight: 22 },
  agreeTxt: { flex: 1, fontSize: 12.5, color: colors.muted, lineHeight: 18, fontFamily: fonts.body },
  reg: { flexDirection: "row", justifyContent: "center", marginTop: 22 },
  muted: { color: colors.muted, fontSize: 13, fontFamily: fonts.body },
  link: { color: colors.teal, fontSize: 13, fontFamily: fonts.bold },
});
