import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import Choice from "./Choice";
import { setupStyles as s } from "../screens/SetupLayout";
import { colors, fonts } from "../theme";

type Props = { options: string[]; selected: string[]; onChange: (v: string[]) => void; single?: boolean; loading?: boolean; placeholder?: string; limit?: number };

/** Searchable chip picker for large backend taxonomies. Selected items always stay visible. */
export default function TaxPicker({ options, selected, onChange, single, loading, placeholder = "Search…", limit = 24 }: Props) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const pool = options.filter((o) => !selected.includes(o) && (!t || o.toLowerCase().includes(t)));
    return [...selected, ...pool.slice(0, limit)];
  }, [options, selected, q, limit]);
  const toggle = (v: string) => onChange(single ? [v] : selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <View>
      <TextInput value={q} onChangeText={setQ} placeholder={placeholder} placeholderTextColor="#9aa5aa" style={styles.search} autoCapitalize="none" />
      {loading ? <ActivityIndicator color={colors.teal} style={{ marginVertical: 12 }} /> : null}
      <View style={s.grid}>
        {shown.map((k) => <Choice key={k} label={k} mark={single ? "" : "+"} selected={selected.includes(k)} onPress={() => toggle(k)} />)}
      </View>
      {!loading && !shown.length ? <Text style={styles.none}>No matches. Try a different word.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  search: { height: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff", paddingHorizontal: 14, marginTop: 10, marginBottom: 12, fontFamily: fonts.body, fontSize: 14, color: colors.text },
  none: { color: colors.muted, fontSize: 13, fontFamily: fonts.body, marginTop: 8 },
});
