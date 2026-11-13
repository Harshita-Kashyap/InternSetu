import React, { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import Illustration from "../components/Illustration";
import SetupLayout, { useSetupStyles } from "./SetupLayout";
import Choice from "../components/Choice";
import TaxPicker from "../components/TaxPicker";
import Button from "../components/Button";
import { useToast } from "../components/Toast";
import { loadProfileRemote, saveProfileRemote, Profile } from "../store";
import { useTax } from "../taxo";
import { api, ApiError } from "../api";

type Props = NativeStackScreenProps<RootStackParamList, "Preferences">;
type Mode = NonNullable<Profile["relocate"]>;

export default function PreferencesScreen({ navigation }: Props) {
  const s = useSetupStyles();
  const { t } = useI18n();
  const toast = useToast();
  const city = useTax("city");
  const sec = useTax("sector");
  const [home, setHome] = useState("");
  const [mode, setMode] = useState<Mode | "">("");
  const [extra, setExtra] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfileRemote().then((p) => {
      if (p.location) setHome(p.location);
      if (p.relocate) setMode(p.relocate);
      if (p.preferredLocations) setExtra(p.preferredLocations);
      if (p.domains) setDomains(p.domains);
    });
  }, []);

  const finish = async () => {
    if (!home) return toast(t("Please select the city where you live."));
    if (!mode) return toast(t("Please choose how far you are willing to go."));
    if (mode === "selected" && !extra.length) return toast(t("Please pick at least one other city."));
    if (!domains.length) return toast(t("Please select at least one preferred domain."));
    setSaving(true);
    try {
      await saveProfileRemote({ location: home, relocate: mode, preferredLocations: extra, domains });
      const p = await api.confirmProfile();
      if (p.status !== "complete") { setSaving(false); return toast(t("Please complete your profile first.")); }
      navigation.reset({ index: 0, routes: [{ name: "Recommendations" }] });
    } catch (e) {
      if (e instanceof ApiError && e.code === "consent_required") navigation.reset({ index: 0, routes: [{ name: "Consent" }] });
      else toast(e instanceof Error ? e.message : t("Could not save your preferences."));
      setSaving(false);
    }
  };

  return (
    <SetupLayout art="location" step={3} eyebrow={t("STEP 3 OF 3")} title={t("Where would you like to work?")} subtitle={t("Location is a preference, not a rule: internships elsewhere can still match, they just score a little lower.")}>
      <Text style={s.h2}>{t("Where do you live?")}</Text>
      <TaxPicker single options={city.names} loading={city.loading} selected={home ? [home] : []} onChange={(v) => setHome(v[0] || "")} placeholder={t("Search your city")} />

      <View style={s.section}>
        <Text style={s.h2}>{t("How far are you willing to go?")}</Text>
        <Text style={s.p}>{t("This decides how much location affects your matches.")}</Text>
        <View style={s.grid}>
          <Choice wide mark="🏠" selected={mode === "nearby"} onPress={() => setMode("nearby")} label={t("Nearby only")} sub={t("Opportunities in or close to my city")} />
          <Choice wide mark="📍" selected={mode === "selected"} onPress={() => setMode("selected")} label={t("Selected cities")} sub={t("My city plus cities I choose")} />
          <Choice wide mark="🇮🇳" selected={mode === "anywhere"} onPress={() => setMode("anywhere")} label={t("Anywhere in India")} sub={t("I can move to another city")} />
        </View>
      </View>

      {mode === "selected" ? (
        <View style={s.section}>
          <Text style={s.h2}>{t("Other cities you would consider")}</Text>
          <Text style={s.count}>{extra.length} {t("selected")}</Text>
          <TaxPicker options={city.names.filter((c) => c !== home)} loading={city.loading} selected={extra} onChange={setExtra} placeholder={t("Search your city")} />
        </View>
      ) : null}

      <View style={s.section}>
        <View style={{ alignItems: "center" }}><Illustration name="sector" width={180} /></View>
        <Text style={s.h2}>{t("Preferred domains")}</Text>
        <Text style={s.p}>{t("Select the areas you would like to explore.")}</Text>
        <Text style={s.count}>{domains.length} {t("selected")}</Text>
        <TaxPicker options={sec.names} loading={sec.loading} selected={domains} onChange={setDomains} placeholder={t("Search sectors")} />
      </View>

      <View style={s.actions}>
        <Button title={t("Find my internships")} arrow onPress={finish} loading={saving} />
        <Text style={s.back} onPress={() => navigation.navigate("Skills")}>{t("← Back")}</Text>
      </View>
    </SetupLayout>
  );
}
