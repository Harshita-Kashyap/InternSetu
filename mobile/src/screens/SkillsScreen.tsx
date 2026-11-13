import React, { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { Pressable, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import SetupLayout, { useSetupStyles } from "./SetupLayout";
import GroupedSkillPicker from "../components/GroupedSkillPicker";
import Button from "../components/Button";
import { useToast } from "../components/Toast";
import { loadProfileRemote, saveProfileRemote } from "../store";
import { useTax } from "../taxo";
import { api, Activity } from "../api";

type Props = NativeStackScreenProps<RootStackParamList, "Skills">;

export default function SkillsScreen({ navigation }: Props) {
  const s = useSetupStyles();
  const { t, lang } = useI18n();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [moreActs, setMoreActs] = useState(false);
  const toast = useToast();
  const [selSkills, setSelSkills] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const sk = useTax("skill");
  const cats = useTax("skill_category");
  useEffect(() => { api.activities().then(setActivities).catch(() => {}); }, []);
  const idToName = new Map(sk.items.map((i) => [i.id, i.name]));
  const namesOf = (a: Activity) => a.skill_ids.map((i) => idToName.get(i)).filter(Boolean) as string[];
  const isOn = (a: Activity) => namesOf(a).length > 0 && namesOf(a).every((n) => selSkills.includes(n));
  const toggleActivity = (a: Activity) => {
    const ns = namesOf(a);
    setSelSkills((c) => (isOn(a) ? c.filter((x) => !ns.includes(x)) : [...new Set([...c, ...ns])]));
  };

  useEffect(() => {
    loadProfileRemote().then((p) => {
      if (p.skills) setSelSkills(p.skills);
    });
  }, []);

  const next = async () => {
    if (!selSkills.length) return toast(t("Please select at least one skill."));
    setSaving(true);
    try { await saveProfileRemote({ skills: selSkills }); navigation.navigate("Preferences"); }
    catch (e) { toast(e instanceof Error ? e.message : t("Could not save your skills.")); }
    finally { setSaving(false); }
  };

  return (
    <SetupLayout art="skills" step={2} eyebrow={t("STEP 2 OF 3")} title={t("Tell us what you're good at")} subtitle={t("Select the skills you already have.")}>
      {activities.length > 0 ? (
        <View style={{ marginBottom: 18 }}>
          <Text style={s.h2}>{t("What have you done?")}</Text>
          <Text style={s.p}>{t("Tap everything you have done. We add the matching skills for you.")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
            {activities.filter((a, i) => moreActs || i < 16 || isOn(a)).map((a) => (
              <Pressable key={a.id} onPress={() => toggleActivity(a)} accessibilityRole="button" accessibilityState={{ selected: isOn(a) }} accessibilityLabel={(a.label[lang] || a.label.en)}
                style={{ width: "47%", minHeight: 88, padding: 10, borderRadius: 12, borderWidth: 2, borderColor: isOn(a) ? "#2da096" : "#c9d3d1", backgroundColor: isOn(a) ? "rgba(45,160,150,0.14)" : "transparent", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Text style={{ fontSize: 28 }}>{a.icon}</Text>
                <Text style={[s.p, { textAlign: "center", fontWeight: "600" }]}>{(a.label[lang] || a.label.en)}</Text>
              </Pressable>
            ))}
          </View>
          {activities.length > 16 ? <Pressable onPress={() => setMoreActs(!moreActs)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center", marginTop: 6 }}><Text style={[s.p, { fontWeight: "600" }]}>{moreActs ? t("Show fewer activities") : t("Show more activities")}</Text></Pressable> : null}
        </View>
      ) : null}

      <View>
        <Text style={s.h2}>{t("Your skills")}</Text>
        <Text style={s.p}>{t("Select all that apply.")}</Text>
        <Text style={s.count}>{selSkills.length} {t("selected")}</Text>
        <GroupedSkillPicker skills={sk.items} categories={cats.items} loading={sk.loading} selected={selSkills} onChange={setSelSkills} placeholder={t("Search skills (e.g. Python)")} />
      </View>

      <View style={s.actions}>
        <Button title={t("Continue")} arrow onPress={next} loading={saving} />
        <Text style={s.back} onPress={() => navigation.navigate("Profile")}>{t("← Back")}</Text>
      </View>
    </SetupLayout>
  );
}
