import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Header from "../components/Header";
import Stepper from "../components/Stepper";
import FadeIn from "../components/FadeIn";
import { colors, fonts, shadow } from "../theme";

type Props = { step: 1 | 2 | 3; eyebrow: string; title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode };

// Shared layout for the 3 profile-setup screens (mirrors .profile-card on the web).
export default function SetupLayout({ step, eyebrow, title, subtitle, children, footer }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <Header />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FadeIn style={styles.card}>
            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <Text style={styles.eyebrow}>{eyebrow}</Text>
              <Text style={styles.h1}>{title}</Text>
              <Text style={styles.sub}>{subtitle}</Text>
            </View>
            <Stepper current={step} />
            {children}
            {footer}
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export const setupStyles = StyleSheet.create({
  h2: { fontSize: 17, fontFamily: fonts.bold, color: colors.text },
  p: { fontSize: 13.5, color: colors.muted, marginTop: 4, fontFamily: fonts.body, lineHeight: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 14 },
  section: { marginTop: 26 },
  count: { alignSelf: "flex-start", marginTop: 8, paddingVertical: 4, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, borderColor: colors.tealBorder, backgroundColor: colors.tealLight, color: colors.tealDark, fontSize: 12, fontFamily: fonts.bold, overflow: "hidden" },
  actions: { marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border, gap: 6 },
  back: { textAlign: "center", color: colors.muted, fontFamily: fonts.semibold, fontSize: 14, paddingVertical: 12 },
});

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 22, borderWidth: 1, borderColor: "rgba(37,107,115,0.09)", ...shadow },
  eyebrow: { color: colors.teal, fontSize: 12, fontFamily: fonts.bold, letterSpacing: 1.5, marginBottom: 10 },
  h1: { fontSize: 26, fontFamily: fonts.headXL, color: colors.text, textAlign: "center", letterSpacing: -0.8, lineHeight: 32 },
  sub: { color: colors.muted, fontSize: 14, textAlign: "center", marginTop: 12, lineHeight: 22, fontFamily: fonts.body },
});
