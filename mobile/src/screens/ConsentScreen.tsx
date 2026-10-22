import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import AuthLayout from "./AuthLayout";
import Button from "../components/Button";
import { useToast } from "../components/Toast";
import { api, ApiError } from "../api";
import { endSession } from "../store";
import { colors, fonts } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Consent">;

export default function ConsentScreen({ navigation }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const accept = async () => {
    setLoading(true);
    try { await api.giveConsent(); navigation.reset({ index: 0, routes: [{ name: "Profile" }] }); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Could not save your consent."); setLoading(false); }
  };
  return (
    <AuthLayout>
      <Text style={styles.h1}>Privacy notice</Text>
      <Text style={styles.p}>InternSetu uses your education, skills and preferences only to recommend internships. Recommendations are guidance only; you apply through the official PMIS portal. You can withdraw consent at any time.</Text>
      <Button title="I agree, continue" onPress={accept} loading={loading} />
      <Text style={styles.link} onPress={async () => { await endSession(); navigation.reset({ index: 0, routes: [{ name: "Login" }] }); }}>Not now, log out</Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 26, color: colors.teal, fontFamily: fonts.headXL, textAlign: "center", marginBottom: 14 },
  p: { fontSize: 14, color: colors.muted, lineHeight: 21, textAlign: "center", marginBottom: 24, fontFamily: fonts.body },
  link: { color: colors.teal, fontSize: 13, fontFamily: fonts.bold, textAlign: "center", marginTop: 22 },
});
