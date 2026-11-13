import MicButton from "./MicButton";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useI18n } from "../i18n";
import { useTheme, Colors, fonts } from "../theme";
import { iconForCategory, orderCategories } from "../skillIcons";
import type { TaxonomyItem } from "../api";

type Props = {
  skills: TaxonomyItem[];          // parent_id = skill category id
  categories: TaxonomyItem[];      // skill categories
  selected: string[];              // selected skill NAMES
  onChange: (v: string[]) => void;
  loading?: boolean;
  placeholder?: string;
};

const PREVIEW = 8;   // skills shown before "Show all"

/** Skills as "umbrella" cards: each category is a rectangle holding its related skills, so people tap what they know without opening anything. */
export default function GroupedSkillPicker({ skills, categories, selected, onChange, loading, placeholder = "Search…" }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const query = q.trim().toLowerCase();

  const groups = useMemo(() => {
    const list = orderCategories(categories).map((c) => ({ id: c.id, name: c.name, items: [] as TaxonomyItem[] }));
    const other = { id: "__other", name: t("Other skills"), items: [] as TaxonomyItem[] };
    for (const sk of skills) (list.find((g) => g.id === sk.parent_id) ?? other).items.push(sk);
    if (other.items.length) list.push(other);
    return list.filter((g) => g.items.length > 0);
  }, [skills, categories, t]);

  const toggle = (name: string) => onChange(selected.includes(name) ? selected.filter((x) => x !== name) : [...selected, name]);
  const visible = groups
    .map((g) => ({ ...g, shown: query ? g.items.filter((i) => i.name.toLowerCase().includes(query) || g.name.toLowerCase().includes(query)) : g.items }))
    .filter((g) => g.shown.length > 0);

  const chip = (name: string, on: boolean, key: string) => (
    <Pressable key={key} onPress={() => toggle(name)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={name}
      style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipMark, on && { color: "#fff" }]}>{on ? "✓" : "+"}</Text>
      <Text style={[styles.chipText, on && { color: "#fff" }]}>{name}</Text>
    </Pressable>
  );

  return (
    <View>
      <View style={styles.tools}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
          <TextInput value={q} onChangeText={setQ} placeholder={placeholder} placeholderTextColor={colors.faint} style={[styles.search, { flex: 1 }]} autoCapitalize="none" />
          <MicButton onText={setQ} />
        </View>
        <Pressable onPress={() => onChange([])} disabled={selected.length === 0} accessibilityRole="button" accessibilityLabel={t("Clear all")}
          style={[styles.clear, selected.length === 0 && { opacity: 0.45 }]}>
          <Text style={styles.clearText}>{t("Clear all")}</Text>
        </Pressable>
      </View>
      {loading ? <ActivityIndicator color={colors.teal} style={{ marginVertical: 12 }} /> : null}
      {selected.length > 0 ? (
        <View style={styles.tray} accessibilityLabel={t("Selected")}>
          <Text style={styles.trayHead}>{selected.length} {t("selected")}</Text>
          <View style={styles.chips}>{selected.map((k) => chip(k, true, "sel-" + k))}</View>
        </View>
      ) : null}
      {visible.map((g) => {
        const count = g.items.filter((i) => selected.includes(i.name)).length;
        const open = !!query || !!expanded[g.id] || g.shown.length <= PREVIEW + 2;
        const items = open ? g.shown : [...g.shown.slice(0, PREVIEW), ...g.shown.slice(PREVIEW).filter((i) => selected.includes(i.name))];
        const hidden = g.shown.length - items.length;
        return (
          <View key={g.id} style={[styles.card, count > 0 && styles.cardOn]} accessibilityLabel={g.name}>
            <View style={styles.head}>
              <View style={styles.iconBox}><Text style={styles.icon}>{iconForCategory(g.id)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{g.name}</Text>
                <Text style={styles.sub}>{g.items.length} {t("skills")}</Text>
              </View>
              {count > 0 ? <Text style={styles.badge}>{count}/{g.items.length}</Text> : null}
            </View>
            <View style={styles.chips}>{items.map((i) => chip(i.name, selected.includes(i.name), i.id))}</View>
            {!query && g.shown.length > PREVIEW + 2 ? (
              <Pressable onPress={() => setExpanded((e) => ({ ...e, [g.id]: !open }))} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.more}>
                <Text style={styles.moreText}>{open ? t("Show fewer") : `${t("Show all")} (+${hidden})`}</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
      {!loading && !visible.length ? <Text style={styles.none}>{t("No matches. Try a different word.")}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  tools: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, marginBottom: 12 },
  search: { height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 14, color: colors.text },
  clear: { minHeight: 46, justifyContent: "center", paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border },
  clearText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  tray: { borderWidth: 1.5, borderColor: colors.teal, borderRadius: 16, padding: 12, marginBottom: 12, backgroundColor: colors.white },
  trayHead: { color: colors.tealDark ?? colors.teal, fontFamily: fonts.bold, fontSize: 13, marginBottom: 8 },
  card: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 16, padding: 14, marginBottom: 12, backgroundColor: colors.white },
  cardOn: { borderColor: colors.teal },
  head: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.tealLight },
  icon: { fontSize: 22 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  sub: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  badge: { backgroundColor: colors.teal, color: "#fff", borderRadius: 999, overflow: "hidden", paddingHorizontal: 10, paddingVertical: 3, fontSize: 12, fontFamily: fonts.bold },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 42, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipMark: { color: colors.teal, fontFamily: fonts.bold, fontSize: 14 },
  chipText: { color: colors.text, fontFamily: fonts.medium, fontSize: 13.5 },
  more: { minHeight: 44, justifyContent: "center", marginTop: 6 },
  moreText: { color: colors.tealDark ?? colors.teal, fontFamily: fonts.bold, fontSize: 13.5 },
  none: { color: colors.muted, fontSize: 13, fontFamily: fonts.body, marginTop: 8 },
});
