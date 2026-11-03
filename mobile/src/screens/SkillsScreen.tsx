import React, { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import SetupLayout, { useSetupStyles } from "./SetupLayout";
import TaxPicker from "../components/TaxPicker";
import Button from "../components/Button";
import { useToast } from "../components/Toast";
import { loadProfileRemote, saveProfileRemote } from "../store";
import { useTax } from "../taxo";

type Props = NativeStackScreenProps<RootStackParamList, "Skills">;

export default function SkillsScreen({ navigation }: Props) {
  const s = useSetupStyles();
  const { t } = useI18n();
  const toast = useToast();
  const [selSkills, setSelSkills] = useState<string[]>([]);
  const [selInterests, setSelInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const sk = useTax("skill");
  const it = useTax("interest");

  useEffect(() => {
    loadProfileRemote().then((p) => {
      if (p.skills) setSelSkills(p.skills);
      if (p.interests) setSelInterests(p.interests);
    });
  }, []);

  const next = async () => {
    if (!selSkills.length) return toast(t("Please select at least one skill."));
    if (!selInterests.length) return toast(t("Please select at least one interest."));
    setSaving(true);
    try { await saveProfileRemote({ skills: selSkills, interests: selInterests }); navigation.navigate("Preferences"); }
    catch (e) { toast(e instanceof Error ? e.message : t("Could not save your skills.")); }
    finally { setSaving(false); }
  };

  return (
    <SetupLayout step={2} eyebrow={t("STEP 2 OF 3")} title={t("Tell us what you're good at")} subtitle={t("Select the skills you already have and the areas you're interested in exploring.")}>
      <View>
        <Text style={s.h2}>{t("Your skills")}</Text>
        <Text style={s.p}>{t("Select all that apply.")}</Text>
        <Text style={s.count}>{selSkills.length} {t("selected")}</Text>
        <TaxPicker options={sk.names} loading={sk.loading} selected={selSkills} onChange={setSelSkills} placeholder={t("Search skills (e.g. Python)")} />
      </View>

      <View style={s.section}>
        <Text style={s.h2}>{t("Your interests")}</Text>
        <Text style={s.p}>{t("What kind of work would you enjoy exploring?")}</Text>
        <Text style={s.count}>{selInterests.length} {t("selected")}</Text>
        <TaxPicker options={it.names} loading={it.loading} selected={selInterests} onChange={setSelInterests} placeholder={t("Search interests")} />
      </View>

      <View style={s.actions}>
        <Button title={t("Continue")} arrow onPress={next} loading={saving} />
        <Text style={s.back} onPress={() => navigation.navigate("Profile")}>{t("← Back")}</Text>
      </View>
    </SetupLayout>
  );
}
