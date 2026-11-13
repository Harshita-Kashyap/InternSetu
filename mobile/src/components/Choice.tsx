import React, { useMemo, useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme, Colors, fonts } from "../theme";

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  mark?: string; // glyph shown when not selected
  sub?: string;
  wide?: boolean; // full-width card (used for yes/no)
};

// One selectable tile used for skills, interests, work modes, domains & relocate.
export default function Choice({ label, selected, onPress, mark = "+", sub, wide }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const s = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (selected) {
      Animated.sequence([
        Animated.timing(s, { toValue: 1.06, duration: 110, useNativeDriver: true }),
        Animated.spring(s, { toValue: 1, useNativeDriver: true }),
      ]).start();
    }
  }, [selected, s]);

  return (
    <Animated.View style={[wide ? styles.wide : styles.half, { transform: [{ scale: s }] }]}>
      <Pressable onPress={onPress} style={[styles.tile, selected && styles.on]} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={label}>
        <View style={[styles.dot, selected && styles.dotOn]}>
          <Text style={[styles.dotTxt, selected && { color: "#fff" }]}>{selected ? "✓" : mark}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, selected && { color: colors.tealDark }]} numberOfLines={1}>{label}</Text>
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  half: { width: "48.5%", marginBottom: 10 },
  wide: { width: "100%", marginBottom: 10 },
  tile: {
    minHeight: 50, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 11, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white,
  },
  on: { backgroundColor: colors.tealLight, borderColor: colors.teal },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.tealBorder, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center" },
  dotOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  dotTxt: { fontSize: 12, fontFamily: fonts.bold, color: colors.teal },
  label: { fontSize: 13.5, fontFamily: fonts.semibold, color: colors.text },
  sub: { fontSize: 11, color: colors.muted, fontFamily: fonts.body, marginTop: 2 },
});
