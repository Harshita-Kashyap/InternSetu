import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import { endSession } from "../store";
import { colors, fonts } from "../theme";

export default function Header() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
      <Pressable
        style={styles.logout}
        onPress={async () => {
          await endSession();
          nav.reset({ index: 0, routes: [{ name: "Login" }] });
        }}
      >
        <Text style={styles.logoutTxt}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "rgba(37,107,115,0.1)" },
  logo: { height: 40, width: 112 },
  logout: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: colors.tealBorder },
  logoutTxt: { color: colors.teal, fontSize: 13, fontFamily: fonts.bold },
});
