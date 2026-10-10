import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import SetupLayout, { setupStyles as s } from "./SetupLayout";
import Choice from "../components/Choice";
import Button from "../components/Button";
import { useToast } from "../components/Toast";
import { interests as domains, locations, workModes } from "../data";
import { loadProfile, saveProfile } from "../store";
import { colors, fonts } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Preferences">;

export default function PreferencesScreen({ navigation }: Props) {
  const toast = useToast();
  const [location, setLocation] = useState("Any location");
  const [relocate, setRelocate] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [selDomains, setSelDomains] = useState<string[]>([]);

  useEffect(() => {
    loadProfile().then((p) => {
      if (p.location) setLocation(p.location);
      if (p.relocate) setRelocate(p.relocate);
      if (p.workMode) setWorkMode(p.workMode);
      if (p.domains) setSelDomains(p.domains);
      else if (p.interests) setSelDomains(p.interests);
    });
  }, []);

  const finish = async () => {
    if (!relocate) return toast("Please tell us whether you are willing to relocate.");
    if (!workMode) return toast("Please select your preferred work mode.");
    if (!selDomains.length) return toast("Please select at least one preferred domain.");
    await saveProfile({ location, relocate, workMode, domains: selDomains });
    navigation.reset({ index: 0, routes: [{ name: "Recommendations" }] });
  };

  return (
    <SetupLayout step={3} eyebrow="STEP 3 OF 3" title="Where would you like to work?" subtitle="Tell us about your location and work preferences so we can find opportunities that fit your situation.">
      <Text style={s.h2}>Preferred location</Text>
      <View style={styles.chips}>
        {locations.map((l) => (
          <Pressable key={l} onPress={() => setLocation(l)} style={[styles.pill, location === l && styles.pillOn]}>
            <Text style={[styles.pillTxt, location === l && { color: "#fff" }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>Choose &quot;Any location&quot; if you are open to opportunities anywhere in India.</Text>

      <View style={s.section}>
        <Text style={s.h2}>Are you willing to relocate?</Text>
        <Text style={s.p}>This helps us include opportunities outside your preferred location.</Text>
        <View style={s.grid}>
          <Choice wide label="Yes" sub="I'm open to relocating" mark="" selected={relocate === "Yes"} onPress={() => setRelocate("Yes")} />
          <Choice wide label="No" sub="I prefer to stay nearby" mark="" selected={relocate === "No"} onPress={() => setRelocate("No")} />
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.h2}>Preferred work mode</Text>
        <Text style={s.p}>Choose the type of workplace you prefer.</Text>
        <View style={styles.modes}>
          {workModes.map((m) => (
            <Pressable key={m} onPress={() => setWorkMode(m)} style={[styles.mode, workMode === m && styles.modeOn]}>
              <Text style={[styles.modeTxt, workMode === m && { color: colors.tealDark }]}>{workMode === m ? "✓ " : "○ "}{m}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.h2}>Preferred domains</Text>
        <Text style={s.p}>Select the areas you would like to explore.</Text>
        <View style={s.grid}>
          {domains.map((d) => (
            <Choice key={d} label={d} selected={selDomains.includes(d)} onPress={() => setSelDomains(selDomains.includes(d) ? selDomains.filter((x) => x !== d) : [...selDomains, d])} />
          ))}
        </View>
      </View>

      <View style={s.actions}>
        <Button title="Find my internships" arrow onPress={finish} />
        <Text style={s.back} onPress={() => navigation.navigate("Skills")}>← Back</Text>
      </View>
    </SetupLayout>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  pill: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.creamLight },
  pillOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  pillTxt: { fontSize: 13.5, fontFamily: fonts.semibold, color: colors.text },
  hint: { marginTop: 10, fontSize: 12, color: colors.muted, fontFamily: fonts.body, lineHeight: 18 },
  modes: { flexDirection: "row", gap: 8, marginTop: 14 },
  mode: { flex: 1, height: 48, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  modeOn: { backgroundColor: colors.tealLight, borderColor: colors.teal },
  modeTxt: { fontSize: 13.5, fontFamily: fonts.semibold, color: colors.text },
});
