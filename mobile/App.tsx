import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans";
import { NotoSansDevanagari_400Regular, NotoSansDevanagari_500Medium, NotoSansDevanagari_600SemiBold, NotoSansDevanagari_700Bold } from "@expo-google-fonts/noto-sans-devanagari";
import { NotoSansBengali_400Regular, NotoSansBengali_500Medium, NotoSansBengali_600SemiBold, NotoSansBengali_700Bold } from "@expo-google-fonts/noto-sans-bengali";

import type { RootStackParamList } from "./src/types";
import { ThemeProvider, useTheme } from "./src/theme";
import { api, ApiError, getToken, setUnauthorizedHandler } from "./src/api";
import { ToastProvider } from "./src/components/Toast";
import OfflineBanner from "./src/components/OfflineBanner";
import { I18nProvider } from "./src/i18n";

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import ConsentScreen from "./src/screens/ConsentScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import SkillsScreen from "./src/screens/SkillsScreen";
import PreferencesScreen from "./src/screens/PreferencesScreen";
import RecommendationsScreen from "./src/screens/RecommendationsScreen";
import SavedScreen from "./src/screens/SavedScreen";
import AccountScreen from "./src/screens/AccountScreen";
import PmisCheckScreen from "./src/screens/PmisCheckScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const navRef = createNavigationContainerRef<RootStackParamList>();

function Shell() {
  const { colors, mode } = useTheme();
  const [fontsLoaded, fontError] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, NotoSansDevanagari_400Regular, NotoSansDevanagari_500Medium, NotoSansDevanagari_600SemiBold, NotoSansDevanagari_700Bold, NotoSansBengali_400Regular, NotoSansBengali_500Medium, NotoSansBengali_600SemiBold, NotoSansBengali_700Bold });
  const [initial, setInitial] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    let mounted = true;
    // Restore the session: a stored token must still be valid; a confirmed profile opens Discover directly.
    (async () => {
      try {
        if (!(await getToken())) return mounted && setInitial("Login");
        await api.me();
        const p = await api.getProfile().catch(() => null);
        mounted && setInitial(p?.status === "complete" ? "Home" : "Profile");
      } catch (e: unknown) {
        // 401 -> token cleared by the client -> Login. Offline -> keep the session.
        mounted && setInitial(e instanceof ApiError && e.status === 0 ? "Home" : "Login");
      }
    })();
    setUnauthorizedHandler(() => { if (navRef.isReady()) navRef.reset({ index: 0, routes: [{ name: "Login" }] }); });
    return () => { mounted = false; setUnauthorizedHandler(null); };
  }, []);

  const navTheme = useMemo(() => {
    const base = mode === "dark" ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: colors.cream, card: colors.white, text: colors.text, border: colors.border, primary: colors.teal } };
  }, [colors, mode]);

  if (!initial || (!fontsLoaded && !fontError)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream }}>
        <View style={{ backgroundColor: colors.logoBg, borderRadius: 12, padding: colors.logoBg === "transparent" ? 0 : 10 }}>
          <Image source={require("./assets/logo.png")} style={{ width: 180, height: 64 }} resizeMode="contain" />
        </View>
        <ActivityIndicator color={colors.teal} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <I18nProvider>
        <ToastProvider>
          <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.warn }}><OfflineBanner /></SafeAreaView>
          <NavigationContainer ref={navRef} theme={navTheme}>
            <Stack.Navigator initialRouteName={initial} screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: colors.cream } }}>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              <Stack.Screen name="Consent" component={ConsentScreen} />
              <Stack.Screen name="Home" component={HomeScreen} options={{ animation: "fade" }} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Skills" component={SkillsScreen} />
              <Stack.Screen name="Preferences" component={PreferencesScreen} />
              <Stack.Screen name="Recommendations" component={RecommendationsScreen} options={{ animation: "fade" }} />
              <Stack.Screen name="Saved" component={SavedScreen} />
              <Stack.Screen name="Account" component={AccountScreen} />
              <Stack.Screen name="PmisCheck" component={PmisCheckScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </ToastProvider>
      </I18nProvider>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Shell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
