import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import SetupLayout, { setupStyles as s } from "./SetupLayout";
import Choice from "../components/Choice";
import TaxPicker from "../components/TaxPicker";
import Button from "../components/Button";
import { useToast } from "../components/Toast";
import { workModes } from "../data";
import { loadProfileRemote, saveProfileRemote } from "../store";
import { useTax } from "../taxo";
import { api, ApiError } from "../api";
import { colors, fonts } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Preferences">;

export default function PreferencesScreen({ navigation }: Props) {
  const toast = useToast();
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const city = useTax("city");
  const sec = useTax("sector");
  const [relocate, setRelocate] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [selDomains, setSelDomains] = useState<string[]>([]);

  useEffect(() => {
    loadProfileRemote().then((p) => {
      if (p.location) setLocation(p.location);
      if (p.relocate) setRelocate(p.relocate);
      if (p.workMode) setWorkMode(p.workMode);
      if (p.domains) setSelDomains(p.domains);
    });
  }, []);

  const finish = async () => {
    if (!location) return toast("Please choose your home city.");
    if (!relocate) return toast("Please tell us whether you are willing to relocate.");
    if (!workMode) return toast("Please select your preferred work mode.");
    if (!selDomains.length) return toast("Please select at least one preferred domain.");
    setSaving(true);
    try {
      await saveProfileRemote({ location, relocate, workMode, domains: selDomains });
      const p = await api.confirmProfile();
      if (p.status !== "complete") { setSaving(false); return toast("Please complete your profile first."); }
      navigation.reset({ index: 0, routes: [{ name: "Recommendations" }] });
    } catch (e) {
      if (e instanceof ApiError && e.code === "consent_required") navigation.reset({ index: 0, routes: [{ name: "Consent" }] });
      else toast(e instanceof Error ? e.message : "Could not save your preferences.");
      setSaving(false);
    }
  };

  return (
    <SetupLayout step={3} eyebrow="STEP 3 OF 3" title="Where would you like to work?" subtitle="Tell us about your location and work preferences so we can find opportunities that fit your situation.">
      <Text style={s.h2}>Home city</Text>
      <TaxPicker single options={city.names} loading={city.loading} selected={location ? [location] : []} onChange={(v) => setLocation(v[0] || "")} placeholder="Search your city" />

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
        <TaxPicker options={sec.names} loading={sec.loading} selected={selDomains} onChange={setSelDomains} placeholder="Search sectors" />
      </View>

      <View style={s.actions}>
        <Button title="Find my internships" arrow onPress={finish} loading={saving} />
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
