import React, { useEffect, useRef } from "react";
import { Animated, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, shadow } from "../theme";
import FadeIn from "../components/FadeIn";

function Orb({ size, top, left, right, delay }: { size: number; top?: number; left?: number; right?: number; delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 3500, delay, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 3500, useNativeDriver: true }),
      ])
    ).start();
  }, [v, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, top, left, right, backgroundColor: "rgba(37,107,115,0.08)", transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }] }}
    />
  );
}

// Shared shell for Login / Register / Forgot password: cream bg, floating orbs, logo, card.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <Orb size={220} top={-60} right={-60} delay={0} />
      <Orb size={140} top={420} left={-50} delay={1200} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FadeIn style={{ alignItems: "center" }}>
            <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
          </FadeIn>
          <FadeIn delay={120} style={styles.card}>{children}</FadeIn>
          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20 },
  logo: { width: 220, height: 90, marginBottom: 14 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 26, borderWidth: 1, borderColor: "rgba(37,107,115,0.1)", ...shadow },
});
