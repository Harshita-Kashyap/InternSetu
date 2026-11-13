import MicButton from "./MicButton";
import React, { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import Choice from "./Choice";
import { useSetupStyles } from "../screens/SetupLayout";
import { useTheme, Colors, fonts } from "../theme";

type Props = { options: string[]; selected: string[]; onChange: (v: string[]) => void; single?: boolean; loading?: boolean; placeholder?: string; limit?: number };

/** Searchable chip picker for large backend taxonomies. Selected items always stay visible. */
export default function TaxPicker({ options, selected, onChange, single, loading, placeholder = "Search…", limit = 24 }: Props) {
  const s = useSetupStyles();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const pool = options.filter((o) => !selected.includes(o) && (!t || o.toLowerCase().includes(t)));
    return [...selected, ...pool.slice(0, limit)];
  }, [options, selected, q, limit]);
  const toggle = (v: string) => onChange(single ? [v] : selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput value={q} onChangeText={setQ} placeholder={placeholder} placeholderTextColor={colors.faint} style={[styles.search, { flex: 1 }]} autoCapitalize="none" />
          <MicButton onText={setQ} />
        </View>
      {loading ? <ActivityIndicator color={colors.teal} style={{ marginVertical: 12 }} /> : null}
      <View style={s.grid}>
        {shown.map((k) => <Choice key={k} label={k} mark={single ? "" : "+"} selected={selected.includes(k)} onPress={() => toggle(k)} />)}
      </View>
      {!loading && !shown.length ? <Text style={styles.none}>{t("No matches. Try a different word.")}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  search: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 14, marginTop: 10, marginBottom: 12, fontFamily: fonts.body, fontSize: 14, color: colors.text },
  none: { color: colors.muted, fontSize: 13, fontFamily: fonts.body, marginTop: 8 },
});
