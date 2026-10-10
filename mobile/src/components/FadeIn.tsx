import React, { useEffect, useRef } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";

type Props = { delay?: number; y?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode };

export default function FadeIn({ delay = 0, y = 18, style, children }: Props) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 520, delay, useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View
      style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) }] }, style]}
    >
      {children}
    </Animated.View>
  );
}
