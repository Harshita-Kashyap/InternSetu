import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import AuthLayout from "./AuthLayout";
import Field from "../components/Field";
import Button from "../components/Button";
import FadeIn from "../components/FadeIn";
import { useToast } from "../components/Toast";
import { api } from "../api";
import { colors, fonts } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <AuthLayout>
      <View style={{ alignItems: "center", marginBottom: 24 }}>
        <Text style={styles.h1}>Reset your password</Text>
        <Text style={styles.sub}>Enter your email and we&apos;ll send you a reset link.</Text>
      </View>

      {sent ? (
        <FadeIn style={{ alignItems: "center" }}>
          <View style={styles.check}><Text style={styles.checkTxt}>✓</Text></View>
          <Text style={styles.sub}>If an account exists for {email}, a reset link is on its way.</Text>
        </FadeIn>
      ) : (
        <>
          <Field label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Button title="Send reset link" onPress={async () => { if (!/^\S+@\S+\.\S+$/.test(email)) return toast("Please enter a valid email."); await api.forgotPassword(email.trim()).catch(() => {}); setSent(true); }} />
        </>
      )}
      <Text style={[styles.link, { textAlign: "center", marginTop: 22 }]} onPress={() => navigation.navigate("Login")}>← Back to login</Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 26, color: colors.teal, fontFamily: fonts.headXL, letterSpacing: -0.6, textAlign: "center" },
  sub: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 10, lineHeight: 21, fontFamily: fonts.body },
  link: { color: colors.teal, fontSize: 13, fontFamily: fonts.bold },
  check: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.tealLight, borderWidth: 2, borderColor: colors.teal, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  checkTxt: { color: colors.teal, fontSize: 30, fontFamily: fonts.bold },
});
