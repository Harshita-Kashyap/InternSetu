import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, type Colors, fonts } from "../theme";

// Splash screen with hero animation, progress bar, and skip option.
export default function Splash({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const opacity = useRef(new Animated.Value(1)).current;
  const intro = useRef(new Animated.Value(0)).current;
  const zoom = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;

    done.current = true;

    Animated.timing(opacity, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onDone();
      }
    });
  };

  useEffect(() => {
    Animated.timing(intro, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.timing(zoom, {
      toValue: 1,
      duration: 4000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    Animated.timing(bar, {
      toValue: 1,
      duration: 3400,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(finish);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const h = (width * 900) / 1600;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.wrap, { opacity }]}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={finish}
      >
        <View style={styles.center}>
          <Animated.Image
            source={require("../../assets/hero.jpg")}
            resizeMode="cover"
            style={{
              width,
              height: h,
              opacity: intro,
              transform: [
                {
                  scale: zoom.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1],
                  }),
                },
              ],
            }}
          />
        </View>

        <Animated.View style={[styles.tag, { opacity: intro }]}>
          <Image
            source={require("../../assets/logo-mark.png")}
            style={styles.mark}
            resizeMode="contain"
          />

          <Text style={styles.tagTxt}>
            Connect · Learn · Grow
          </Text>
        </Animated.View>
      </Pressable>

      <Pressable
        style={[styles.skip, { top: insets.top + 12 }]}
        onPress={finish}
        accessibilityRole="button"
        accessibilityLabel="Skip splash screen"
      >
        <Text style={styles.skipTxt}>Skip →</Text>
      </Pressable>

      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: bar.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: colors.cream,
      zIndex: 100,
    },

    center: {
      flex: 1,
      justifyContent: "center",
      overflow: "hidden",
    },

    tag: {
      position: "absolute",
      bottom: 70,
      alignSelf: "center",
      alignItems: "center",
    },

    mark: {
      width: 44,
      height: 44,
      marginBottom: 8,
    },

    tagTxt: {
      color: colors.tealDark,
      fontFamily: fonts.semibold,
      letterSpacing: 1.5,
      fontSize: 12,
    },

    skip: {
      position: "absolute",
      right: 18,
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.tealBorder,
      backgroundColor: "rgba(255,255,255,0.7)",
    },

    skipTxt: {
      color: colors.tealDark,
      fontFamily: fonts.bold,
      fontSize: 13,
    },

    track: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 4,
      backgroundColor: "rgba(37,107,115,0.12)",
    },

    fill: {
      height: "100%",
      backgroundColor: colors.teal,
    },
  });