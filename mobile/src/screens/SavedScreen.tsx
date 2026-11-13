import { useSpeakable } from "../speak";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import Header from "../components/Header";
import JobCard from "../components/JobCard";
import MatchSheet from "../components/MatchSheet";
import Button from "../components/Button";
import { useToast } from "../components/Toast";
import { api, ApiError, BrowseItem } from "../api";
import { useI18n } from "../i18n";
import { useTheme, Colors, fonts } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Saved">;

export default function SavedScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const toast = useToast();
  const { t } = useI18n();
  const [items, setItems] = useState<BrowseItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true); else { setItems(null); setFailed(false); }
    try {
      const r = await api.savedFull();
      const seen = new Set<string>();
      // map the saved shape onto the shared card shape; drop duplicates
      setItems(r.filter((i) => !seen.has(i.internship_id) && !!seen.add(i.internship_id)).map((i) => ({
        ...i, location: "", sector_name: "", role_name: "", apply_url: "", saved: true, low_match: null, missing_mandatory: [], education_ok: null,
        eligible: i.eligible ?? null,
      })));
      setFailed(false);
    } catch (e) { setFailed(true); setItems([]); toast(e instanceof ApiError ? e.message : t("Could not load saved internships.")); }
    finally { setRefreshing(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    setBusy(id);
    try { await api.unsave(id); setItems((c) => (c ?? []).filter((i) => i.internship_id !== id)); toast(t("Removed from saved."), "success"); }
    catch (e) { toast(e instanceof ApiError ? e.message : t("Could not update saved list.")); }
    finally { setBusy(null); }
  };

  useSpeakable(`${t("Saved internships")}. ${t("Internships you bookmarked. Tap the heart on a recommendation to save it.")}`);

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <Header />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 50 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.teal} />}>
        <Text style={styles.eyebrow}>{t("YOUR SHORTLIST")}</Text>
        <Text style={styles.h1}>{t("Saved internships")}</Text>
        <Text style={styles.sub}>{t("Internships you bookmarked. Tap the heart on a recommendation to save it.")}</Text>
        {items === null ? <ActivityIndicator color={colors.teal} size="large" style={{ marginTop: 40 }} /> : null}
        {failed ? <View style={styles.empty}><Text style={styles.emptyH}>{t("Could not load saved internships.")}</Text><Button title={t("Try again")} onPress={() => load()} /></View> : null}
        {items?.length === 0 && !failed ? (
          <View style={styles.empty}>
            <Text style={styles.emptyH}>{t("No saved internships yet.")}</Text>
            <Text style={styles.emptyP}>{t("Tap the heart on a recommendation to keep it here.")}</Text>
            <Button title={t("Browse internships")} onPress={() => navigation.navigate("Home")} />
          </View>
        ) : null}
        {items?.map((j) => <JobCard key={j.internship_id} item={j} busy={busy === j.internship_id} onCheck={() => setOpen(j.internship_id)} onRemove={() => remove(j.internship_id)} />)}
      </ScrollView>
      <MatchSheet id={open} onClose={() => setOpen(null)} onProfile={() => navigation.navigate("Profile")} />
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  eyebrow: { color: colors.teal, fontSize: 12, fontFamily: fonts.bold, letterSpacing: 1.5, marginTop: 6 },
  h1: { fontSize: 26, fontFamily: fonts.headXL, color: colors.text, letterSpacing: -0.6, marginTop: 6 },
  sub: { fontSize: 13.5, color: colors.muted, lineHeight: 20, fontFamily: fonts.body, marginTop: 6, marginBottom: 16 },
  empty: { alignItems: "center", gap: 12, padding: 28, marginTop: 10, borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.tealBorder, backgroundColor: colors.white },
  emptyH: { fontSize: 17, fontFamily: fonts.bold, color: colors.text, textAlign: "center" },
  emptyP: { fontSize: 13.5, color: colors.muted, fontFamily: fonts.body, textAlign: "center" },
});
