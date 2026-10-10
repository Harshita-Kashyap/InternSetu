import React, { useRef } from "react";
import { ActivityIndicator, Animated, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { colors, fonts } from "../theme";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  arrow?: boolean;
  variant?: "primary" | "outline";
  style?: StyleProp<ViewStyle>;
};

export default function Button({ title, onPress, loading, arrow, variant = "primary", style }: Props) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40 }).start();
  const outline = variant === "outline";
  return (
    <Pressable onPress={onPress} disabled={loading} onPressIn={() => to(0.96)} onPressOut={() => to(1)}>
      <Animated.View style={[styles.btn, outline && styles.outline, { transform: [{ scale: s }] }, style]}>
        {loading ? (
          <ActivityIndicator color={outline ? colors.teal : "#fff"} />
        ) : (
          <Text style={[styles.txt, outline && { color: colors.teal }]}>
            {title}
            {arrow ? "  →" : ""}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52, borderRadius: 10, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center",
    shadowColor: colors.teal, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  outline: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.tealBorder, shadowOpacity: 0, elevation: 0 },
  txt: { color: "#fff", fontSize: 15, fontFamily: fonts.bold },
});
