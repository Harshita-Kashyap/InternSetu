import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../theme";

type Kind = "error" | "success";
const Ctx = createContext<(msg: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState("");
  const [kind, setKind] = useState<Kind>("error");
  const v = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((m: string, k: Kind = "error") => {
    setMsg(m);
    setKind(k);
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(v, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(v, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    }, 2800);
  }, [v]);

  return (
    <Ctx.Provider value={show}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[styles.toast, { bottom: insets.bottom + 24, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}
      >
        <View style={[styles.icon, { backgroundColor: kind === "error" ? colors.danger : colors.success }]}>
          <Text style={styles.iconTxt}>{kind === "error" ? "!" : "✓"}</Text>
        </View>
        <Text style={styles.txt}>{msg}</Text>
      </Animated.View>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  toast: { position: "absolute", left: 20, right: 20, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.text, padding: 14, borderRadius: 12, elevation: 10, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  icon: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  iconTxt: { color: "#fff", fontSize: 12, fontFamily: fonts.bold },
  txt: { flex: 1, color: "#fff", fontSize: 14, fontFamily: fonts.semibold },
});
