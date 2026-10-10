import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import SetupLayout, { setupStyles as s } from "./SetupLayout";
import Choice from "../components/Choice";
import Button from "../components/Button";
import { useToast } from "../components/Toast";
import { interests, skills } from "../data";
import { loadProfile, saveProfile } from "../store";

type Props = NativeStackScreenProps<RootStackParamList, "Skills">;
const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export default function SkillsScreen({ navigation }: Props) {
  const toast = useToast();
  const [selSkills, setSelSkills] = useState<string[]>([]);
  const [selInterests, setSelInterests] = useState<string[]>([]);

  useEffect(() => {
    loadProfile().then((p) => {
      if (p.skills) setSelSkills(p.skills);
      if (p.interests) setSelInterests(p.interests);
    });
  }, []);

  const next = async () => {
    if (!selSkills.length) return toast("Please select at least one skill.");
    if (!selInterests.length) return toast("Please select at least one interest.");
    await saveProfile({ skills: selSkills, interests: selInterests });
    navigation.navigate("Preferences");
  };

  return (
    <SetupLayout step={2} eyebrow="STEP 2 OF 3" title="Tell us what you're good at" subtitle="Select the skills you already have and the areas you're interested in exploring.">
      <View>
        <Text style={s.h2}>Your skills</Text>
        <Text style={s.p}>Select all that apply.</Text>
        <Text style={s.count}>{selSkills.length} selected</Text>
        <View style={s.grid}>
          {skills.map((k) => (
            <Choice key={k} label={k} selected={selSkills.includes(k)} onPress={() => setSelSkills(toggle(selSkills, k))} />
          ))}
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.h2}>Your interests</Text>
        <Text style={s.p}>What kind of work would you enjoy exploring?</Text>
        <Text style={s.count}>{selInterests.length} selected</Text>
        <View style={s.grid}>
          {interests.map((k) => (
            <Choice key={k} label={k} mark="○" selected={selInterests.includes(k)} onPress={() => setSelInterests(toggle(selInterests, k))} />
          ))}
        </View>
      </View>

      <View style={s.actions}>
        <Button title="Continue" arrow onPress={next} />
        <Text style={s.back} onPress={() => navigation.navigate("Profile")}>← Back</Text>
      </View>
    </SetupLayout>
  );
}
