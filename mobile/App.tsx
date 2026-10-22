
import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  DefaultTheme,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";

import {
  DMSans_400Regular,
  DMSans_500Medium,
 
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";

import {
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";

import type { RootStackParamList } from "./src/types";
import { colors } from "./src/theme";
import { api, ApiError, getToken, setUnauthorizedHandler } from "./src/api";
import { ToastProvider } from "./src/components/Toast";

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import SkillsScreen from "./src/screens/SkillsScreen";
import PreferencesScreen from "./src/screens/PreferencesScreen";
import ConsentScreen from "./src/screens/ConsentScreen";
import RecommendationsScreen from "./src/screens/RecommendationsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const navRef = createNavigationContainerRef<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.cream,
    primary: colors.teal,
  },
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    
    DMSans_700Bold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  const [initial, setInitial] =
    useState<keyof RootStackParamList | null>(null);

  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Restore session: a stored token must still be valid on the server.
    (async () => {
      try {
        if (!(await getToken())) return mounted && setInitial("Login");
        await api.me();
        mounted && setInitial("Profile");
      } catch (error: unknown) {
        // 401 -> token cleared by the client, go to Login. Offline -> keep the session and continue.
        mounted && setInitial(error instanceof ApiError && error.status === 0 ? "Profile" : "Login");
      }
    })();

    setUnauthorizedHandler(() => {
      if (navRef.isReady()) navRef.reset({ index: 0, routes: [{ name: "Login" }] });
    });

    return () => {
      mounted = false;
      setUnauthorizedHandler(null);
    };
  }, []);

  // Temporary diagnostic screen to identify startup problems.
  if (fontError || !fontsLoaded || !initial) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#ffffff",
            padding: 24,
          }}
        >
          <Text
            style={{
              color: "#111111",
              fontSize: 22,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            InternSetu is starting...
          </Text>

          <Text
            style={{
              color: "#333333",
              fontSize: 16,
              marginTop: 20,
              textAlign: "center",
            }}
          >
            Fonts loaded: {String(fontsLoaded)}
          </Text>

          <Text
            style={{
              color: "#333333",
              fontSize: 16,
              marginTop: 10,
              textAlign: "center",
            }}
          >
            Session route: {initial ?? "Waiting for session"}
          </Text>

          {fontError ? (
            <Text
              style={{
                color: "#b00020",
                marginTop: 16,
                textAlign: "center",
              }}
            >
              Font error: {fontError.message}
            </Text>
          ) : null}

          {sessionError ? (
            <Text
              style={{
                color: "#b00020",
                marginTop: 16,
                textAlign: "center",
              }}
            >
              Session error: {sessionError}
            </Text>
          ) : null}
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />

      <ToastProvider>
        <NavigationContainer ref={navRef} theme={navTheme}>
          <Stack.Navigator
            initialRouteName={initial}
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
              contentStyle: {
                backgroundColor: colors.cream,
              },
            }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
            <Stack.Screen name="Consent" component={ConsentScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Skills" component={SkillsScreen} />
            <Stack.Screen
              name="Preferences"
              component={PreferencesScreen}
            />
            <Stack.Screen
              name="Recommendations"
              component={RecommendationsScreen}
              options={{ animation: "fade" }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
