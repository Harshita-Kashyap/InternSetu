import React, { useMemo, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme, Colors, fonts } from "../theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function Ring({ value, size = 54 }: { value: number; size?: number }) {
  const { colors } = useTheme();
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 1100, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [v]);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={r} stroke={colors.teal} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={v.interpolate({ inputRange: [0, 1], outputRange: [c, c * (1 - value / 100)] })}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ fontSize: 12, fontFamily: fonts.bold, color: colors.tealDark }}>{value}%</Text>
      </View>
    </View>
  );
}
