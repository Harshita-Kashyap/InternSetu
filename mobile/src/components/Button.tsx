import React, { useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { useTheme, Colors, fonts } from "../theme";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  arrow?: boolean;
  variant?: "primary" | "outline";
  style?: StyleProp<ViewStyle>;
};

export default function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  arrow,
  variant = "primary",
  style,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const s = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const to = (v: number) =>
    Animated.spring(s, {
      toValue: v,
      useNativeDriver: true,
      speed: 40,
    }).start();

  const outline = variant === "outline";

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      onPressIn={() => {
        if (!isDisabled) to(0.96);
      }}
      onPressOut={() => to(1)}
      accessibilityRole="button"
      accessibilityState={{
        disabled: isDisabled,
        busy: loading,
      }}
    >
      <Animated.View
        style={[
          styles.btn,
          outline && styles.outline,
          isDisabled && styles.disabled,
          { transform: [{ scale: s }] },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={outline ? colors.teal : "#fff"}
          />
        ) : (
          <Text
            style={[
              styles.txt,
              outline && { color: colors.teal },
            ]}
          >
            {title}
            {arrow ? "  →" : ""}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    btn: {
      height: 52,
      borderRadius: 10,
      backgroundColor: colors.teal,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.teal,
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },

    outline: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.tealBorder,
      shadowOpacity: 0,
      elevation: 0,
    },

    disabled: {
      opacity: 0.55,
      shadowOpacity: 0,
      elevation: 0,
    },

    txt: {
      color: "#fff",
      fontSize: 15,
      fontFamily: fonts.bold,
    },
  });