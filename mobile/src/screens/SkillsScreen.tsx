import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import SetupLayout, { setupStyles as s } from "./SetupLayout";
import TaxPicker from "../components/TaxPicker";
import Button from "../components/Button";
import { useToast } from "../components/Toast";
import { loadProfileRemote, saveProfileRemote } from "../store";
import { useTax } from "../taxo";

type Props = NativeStackScreenProps<RootStackParamList, "Skills">;

export default function SkillsScreen({ navigation }: Props) {
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
    if (!selSkills.length) return toast("Please select at least one skill.");
    if (!selInterests.length) return toast("Please select at least one interest.");
    setSaving(true);
    try { await saveProfileRemote({ skills: selSkills, interests: selInterests }); navigation.navigate("Preferences"); }
    catch (e) { toast(e instanceof Error ? e.message : "Could not save your skills."); }
    finally { setSaving(false); }
  };

  return (
    <SetupLayout step={2} eyebrow="STEP 2 OF 3" title="Tell us what you're good at" subtitle="Select the skills you already have and the areas you're interested in exploring.">
      <View>
        <Text style={s.h2}>Your skills</Text>
        <Text style={s.p}>Select all that apply.</Text>
        <Text style={s.count}>{selSkills.length} selected</Text>
        <TaxPicker options={sk.names} loading={sk.loading} selected={selSkills} onChange={setSelSkills} placeholder="Search skills (e.g. Python)" />
      </View>

      <View style={s.section}>
        <Text style={s.h2}>Your interests</Text>
        <Text style={s.p}>What kind of work would you enjoy exploring?</Text>
        <Text style={s.count}>{selInterests.length} selected</Text>
        <TaxPicker options={it.names} loading={it.loading} selected={selInterests} onChange={setSelInterests} placeholder="Search interests" />
      </View>

      <View style={s.actions}>
        <Button title="Continue" arrow onPress={next} loading={saving} />
        <Text style={s.back} onPress={() => navigation.navigate("Profile")}>← Back</Text>
      </View>
    </SetupLayout>
  );
}
