import { useSpeakable } from "../speak";
import Illustration from "../components/Illustration";
import React, { useMemo, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import Header from "../components/Header";
import Button from "../components/Button";
import Field from "../components/Field";
import { useToast } from "../components/Toast";
import { api, ApiError } from "../api";
import { endSession } from "../store";
import { useI18n } from "../i18n";
import { useTheme, Colors, fonts } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Account">;

/** Account settings (#39): download my data, withdraw consent, delete my account. */
export default function AccountScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const toast = useToast();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [byCode, setByCode] = useState(false);
  const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : t("Could not complete this. Please try again."));
  const run = async (f: () => Promise<void>) => { setBusy(true); try { await f(); } catch (e) { fail(e); } finally { setBusy(false); } };

  const download = () => run(async () => {
    const data = await api.exportData();
    await Share.share({ title: "InternSetu", message: JSON.stringify(data, null, 2) });
  });
  const withdraw = () => run(async () => {
    await api.withdrawConsent(); toast(t("Consent withdrawn."), "success"); navigation.reset({ index: 0, routes: [{ name: "Consent" }] });
  });
  const sendCode = () => run(async () => { await api.requestDeleteCode(); setByCode(true); toast(t("A code has been sent to your email."), "success"); });
  const remove = () => run(async () => {
    await api.deleteAccount(byCode ? { code: code.trim() } : { password }); await endSession(); toast(t("Your account was deleted."), "success");
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  });

  useSpeakable(`${t("Your account")}. ${t("Get a copy of everything InternSetu has saved about you.")} ${t("You will not get recommendations until you agree again. Your profile stays saved.")} ${t("This permanently deletes your profile, skills and saved internships. It cannot be undone.")}`);
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <Header />
      <ScrollView contentContainerStyle={styles.wrap}>
        <Illustration name="account" width={190} />
        <Text style={styles.h1}>{t("Your account")}</Text>
        <View style={styles.card}>
          <Text style={styles.h2}>{t("Download my data")}</Text>
          <Text style={styles.sub}>{t("Get a copy of everything InternSetu has saved about you.")}</Text>
          <Button title={t("Download my data")} variant="outline" onPress={download} disabled={busy} />
        </View>
        <View style={styles.card}>
          <Text style={styles.h2}>{t("Withdraw my consent")}</Text>
          <Text style={styles.sub}>{t("You will not get recommendations until you agree again. Your profile stays saved.")}</Text>
          <Button title={t("Withdraw my consent")} variant="outline" onPress={withdraw} disabled={busy} />
        </View>
        <View style={styles.card}>
          <Text style={styles.h2}>{t("Delete my account")}</Text>
          <Text style={styles.sub}>{t("This permanently deletes your profile, skills and saved internships. It cannot be undone.")}</Text>
          {!confirming ? (
            <Button title={t("Delete my account")} variant="outline" onPress={() => setConfirming(true)} disabled={busy} />
          ) : (
            <>
              {byCode ? (
                <Field label={t("Enter the 6-digit code we emailed you")} placeholder="123456" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={6} />
              ) : (
                <>
                  <Field label={t("Enter your password to confirm")} value={password} onChangeText={setPassword} secure autoCapitalize="none" />
                  <Button title={t("Email me a code instead")} variant="outline" onPress={sendCode} disabled={busy} />
                </>
              )}
              <Button title={t("Yes, delete everything")} onPress={remove} disabled={busy || (byCode ? code.trim().length !== 6 : !password)} />
              <Text style={styles.cancel} onPress={() => { setConfirming(false); setPassword(""); setCode(""); setByCode(false); }}>{t("Cancel")}</Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  wrap: { padding: 16, gap: 14 },
  h1: { fontFamily: fonts.head, fontSize: 24, color: c.text },
  h2: { fontFamily: fonts.head, fontSize: 18, color: c.text },
  sub: { color: c.muted, fontSize: 15, marginVertical: 6 },
  card: { backgroundColor: c.white, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 16 },
  cancel: { color: c.muted, textAlign: "center", paddingVertical: 14, fontSize: 16 },
});
