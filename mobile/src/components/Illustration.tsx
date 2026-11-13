import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";
import { SvgXml } from "react-native-svg";
import { ART, ArtName } from "../illustrations";

/** Decorative 3D-style illustration with a soft floating motion (skipped when the phone's "reduce motion" is on). Screen readers skip it. */
export default function Illustration({ name, width = 200 }: { name: ArtName; width?: number }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!live || reduce) return;
      loop = Animated.loop(Animated.sequence([
        Animated.timing(y, { toValue: -5, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      loop.start();
    }).catch(() => {});
    return () => { live = false; loop?.stop(); };
  }, [y]);
  return (
    <Animated.View style={{ transform: [{ translateY: y }] }} accessible={false} importantForAccessibility="no-hide-descendants">
      <SvgXml xml={ART[name]} width={width} height={(width * 180) / 240} />
    </Animated.View>
  );
}
