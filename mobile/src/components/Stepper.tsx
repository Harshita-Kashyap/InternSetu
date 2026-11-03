import { useI18n } from "../i18n";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import { useTheme, Colors, fonts } from "../theme";

const steps: { label: string; route: "Profile" | "Skills" | "Preferences" }[] = [
  { label: "Education", route: "Profile" },
  { label: "Skills", route: "Skills" },
  { label: "Preferences", route: "Preferences" },
];

export default function Stepper({ current }: { current: 1 | 2 | 3 }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useI18n();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={styles.wrap}>
      {steps.map((s, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={[styles.line, n <= current && { backgroundColor: colors.teal }]} />}
            <Pressable disabled={!done} onPress={() => nav.navigate(s.route)} style={styles.step}>
              <View style={[styles.circle, (done || active) && styles.circleOn, active && styles.glow]}>
                <Text style={[styles.num, (done || active) && { color: "#fff" }]}>{done ? "✓" : n}</Text>
              </View>
              <Text style={[styles.label, (done || active) && { color: colors.teal }]}>{t(s.label)}</Text>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "flex-start", justifyContent: "center", marginBottom: 26 },
  step: { alignItems: "center", width: 78 },
  circle: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  circleOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  glow: { shadowColor: colors.teal, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  num: { fontSize: 12, fontFamily: fonts.bold, color: colors.faint },
  label: { marginTop: 6, fontSize: 11, fontFamily: fonts.semibold, color: colors.faint },
  line: { height: 1.5, width: 30, marginTop: 15, backgroundColor: colors.track },
});
