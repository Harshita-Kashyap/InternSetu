import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api, pick, PmisHandoff } from "../api";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";

let cache: Promise<PmisHandoff> | null = null;
const load = () => (cache ??= api.pmisHandoff().catch((e) => { cache = null; throw e; }));

/** "Keep these ready before you apply" - collapsible document list next to Apply. Nothing is stored; Aadhaar is never asked for. */
export default function ApplyHelp() {
  const { colors } = useTheme();
  const { t, lang } = useI18n();
  const [h, setH] = useState<PmisHandoff | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { let on = true; load().then((x) => on && setH(x)).catch(() => {}); return () => { on = false; }; }, []);
  if (!h) return null;
  return (
    <View style={{ marginTop: 6 }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={s.row}>
        <Text style={{ color: colors.muted, fontSize: 14 }}>{open ? "▾" : "▸"} {t("Keep these ready before you apply")}</Text>
      </Pressable>
      {open ? (
        <View style={{ paddingLeft: 4 }}>
          {h.documents.map((d) => <Text key={d.id} style={{ color: colors.text, fontSize: 14, marginBottom: 2 }}>• {pick(d.label, lang)}</Text>)}
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{pick(h.note, lang)}</Text>
        </View>
      ) : null}
    </View>
  );
}
const s = StyleSheet.create({ row: { minHeight: 44, justifyContent: "center" } });
