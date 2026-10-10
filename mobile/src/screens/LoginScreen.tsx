import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import AuthLayout from "./AuthLayout";
import Field from "../components/Field";
import Button from "../components/Button";
import { useToast } from "../components/Toast";
import { startSession } from "../store";
import { colors, fonts } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!username.trim() || !password) return toast("Please enter your username and password.");
    setLoading(true);
    await startSession(username.trim());
    setTimeout(() => navigation.reset({ index: 0, routes: [{ name: "Profile" }] }), 600);
  };

  return (
    <AuthLayout>
      <View style={styles.head}>
        <Text style={styles.welcome}>Welcome back</Text>
        <Text style={styles.h1}>Sign in to InternSetu</Text>
        <Text style={styles.sub}>Your pathway to meaningful internship opportunities.</Text>
      </View>

      <Field label="Username" placeholder="Enter your username" value={username} onChangeText={setUsername} autoCapitalize="none" autoComplete="username" />
      <Field label="Password" placeholder="Enter your password" secure value={password} onChangeText={setPassword}
        rightLabel="Forgot password?" onRightPress={() => navigation.navigate("ForgotPassword")} />
      <Button title="Login" onPress={login} loading={loading} />

      <View style={styles.reg}>
        <Text style={styles.muted}>Don&apos;t have an account? </Text>
        <Text style={styles.link} onPress={() => navigation.navigate("Register")}>Register</Text>
      </View>
      <View style={styles.foot}>
        <View style={styles.dot} />
        <Text style={styles.footTxt}>Secure &amp; simple access to InternSetu</Text>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: "center", marginBottom: 26 },
  welcome: { fontSize: 15, color: colors.muted, fontFamily: fonts.medium },
  h1: { fontSize: 26, color: colors.teal, fontFamily: fonts.headXL, letterSpacing: -0.6, marginTop: 4, textAlign: "center" },
  sub: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 10, lineHeight: 21, fontFamily: fonts.body },
  reg: { flexDirection: "row", justifyContent: "center", marginTop: 22 },
  muted: { color: colors.muted, fontSize: 13, fontFamily: fonts.body },
  link: { color: colors.teal, fontSize: 13, fontFamily: fonts.bold },
  foot: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 24, paddingTop: 18, borderTopWidth: 1, borderTopColor: "#edf0ef" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.teal },
  footTxt: { color: "#8a969b", fontSize: 11.5, fontFamily: fonts.body },
});
