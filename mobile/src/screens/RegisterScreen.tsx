import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import AuthLayout from "./AuthLayout";
import Field from "../components/Field";
import Button from "../components/Button";
import { useToast } from "../components/Toast";
import { api, ApiError } from "../api";
import { colors, fonts } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;
const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
const barColors = ["#e3eae9", colors.danger, "#e8a33d", "#6bb08a", colors.teal];

export default function RegisterScreen({ navigation }: Props) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);

  const strength = Math.min(4, (password.length >= 8 ? 1 : 0) + (/[A-Z]/.test(password) ? 1 : 0) + (/[0-9]/.test(password) ? 1 : 0) + (/[^A-Za-z0-9]/.test(password) ? 1 : 0));

  const submit = async () => {
    if (!name.trim()) return toast("Please enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast("Please enter a valid email.");
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return toast("Password needs 8+ characters with a letter and a number.");
    if (!agree) return toast("Please accept the privacy notice to continue.");
    setLoading(true);
    try {
      await api.register({ full_name: name.trim(), email: email.trim(), password, consent: true });
      navigation.reset({ index: 0, routes: [{ name: "Profile" }] });
    } catch (e) {
      toast(e instanceof ApiError ? (e.fields[0]?.message || e.message) : "Could not create your account.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <View style={styles.head}>
        <Text style={styles.welcome}>Join InternSetu</Text>
        <Text style={styles.h1}>Create your account</Text>
        <Text style={styles.sub}>It takes under a minute. Then we&apos;ll set up your profile.</Text>
      </View>
      <Field label="Full name" placeholder="Your full name" value={name} onChangeText={setName} />
      <Field label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Password" placeholder="Create a password" secure value={password} onChangeText={setPassword} />
      <View style={styles.strength}>
        {[1, 2, 3, 4].map((n) => (
          <View key={n} style={[styles.seg, { backgroundColor: strength >= n ? barColors[strength] : barColors[0] }]} />
        ))}
        <Text style={styles.small}>{password ? labels[strength] : "8+ chars, a number & a symbol"}</Text>
      </View>
      <Pressable style={styles.agree} onPress={() => setAgree(!agree)}>
        <Text style={styles.box}>{agree ? "☑" : "☐"}</Text>
        <Text style={styles.agreeTxt}>I accept the privacy notice and agree to InternSetu processing my profile data to recommend internships.</Text>
      </Pressable>
      <Button title="Create account" onPress={submit} loading={loading} />
      <View style={styles.reg}>
        <Text style={styles.muted}>Already have an account? </Text>
        <Text style={styles.link} onPress={() => navigation.navigate("Login")}>Login</Text>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
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
