import React, { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import Illustration from "../components/Illustration";
import { useSpeakable } from "../speak";
import AuthLayout from "./AuthLayout";
import Field from "../components/Field";
import Button from "../components/Button";
import FadeIn from "../components/FadeIn";
import { useToast } from "../components/Toast";
import { api } from "../api";
import { useTheme, Colors, fonts } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useI18n();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast(t("Please enter a valid email."));
    setBusy(true);
    await api.forgotPassword(email.trim()).catch(() => {});
    setBusy(false);
    setSent(true);
  };
  const resend = async () => {
    setBusy(true);
    await api.forgotPassword(email.trim()).catch(() => {});
    setBusy(false);
    toast(t("If an account exists for that email, a code has been sent."));
  };
  const reset = async () => {
    if (!/^\d{6}$/.test(code.trim())) return toast(t("Please enter the 6-digit code."));
    setBusy(true);
    try { await api.resetPassword(email.trim(), code.trim(), pw); setDone(true); }
    catch (e) { toast(e instanceof Error ? e.message : t("Something went wrong.")); }
    setBusy(false);
  };

  useSpeakable(`${t("Reset your password")}. ${sent && !done ? t("Enter the 6-digit code from your email and choose a new password.") : t("Enter your email and we'll send you a 6-digit code.")}`);

  return (
    <AuthLayout>
      <View style={{ alignItems: "center", marginBottom: 24 }}>
        <Illustration name="lock" width={190} />
        <Illustration name="lock" width={190} />
        <Text style={styles.h1}>{t("Reset your password")}</Text>
        <Text style={styles.sub}>{sent && !done ? t("Enter the 6-digit code from your email and choose a new password.") : t("Enter your email and we'll send you a 6-digit code.")}</Text>
      </View>

      {done ? (
        <FadeIn style={{ alignItems: "center" }}>
          <View style={styles.check}><Text style={styles.checkTxt}>✓</Text></View>
          <Text style={styles.sub}>{t("Password changed. You can log in now.")}</Text>
        </FadeIn>
      ) : sent ? (
        <>
          <Field label={t("6-digit code")} placeholder="123456" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={6} />
          <Field label={t("New password")} secure value={pw} onChangeText={setPw} autoCapitalize="none" />
          <Button title={t("Change password")} onPress={reset} loading={busy} />
          <Text style={[styles.link, { textAlign: "center", marginTop: 16 }]} onPress={resend}>{t("Send a new code")}</Text>
        </>
      ) : (
        <>
          <Field label={t("Email")} placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Button title={t("Send code")} onPress={sendCode} loading={busy} />
        </>
      )}
      <Text style={[styles.link, { textAlign: "center", marginTop: 22 }]} onPress={() => navigation.navigate("Login")}>{t("← Back to login")}</Text>
    </AuthLayout>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  h1: { fontSize: 26, color: colors.teal, fontFamily: fonts.headXL, letterSpacing: -0.6, textAlign: "center" },
  sub: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 10, lineHeight: 21, fontFamily: fonts.body },
  link: { color: colors.teal, fontSize: 13, fontFamily: fonts.bold },
  check: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.tealLight, borderWidth: 2, borderColor: colors.teal, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  checkTxt: { color: colors.teal, fontSize: 30, fontFamily: fonts.bold },
});
