import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import Header from "../components/Header";
import JobCard from "../components/JobCard";
import MatchSheet from "../components/MatchSheet";
import FilterSheet from "../components/FilterSheet";
import Button from "../components/Button";
import { useToast } from "../components/Toast";
import { api, ApiError, BrowseItem } from "../api";
import { useTax } from "../taxo";
import { useI18n } from "../i18n";
import { useTheme, Colors, fonts } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;
type Scope = "all" | "suitable";
const PAGE = 12;

export default function HomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useI18n();
  const toast = useToast();
  const sectors = useTax("sector");
  const cities = useTax("city");
  const [scope, setScope] = useState<Scope>("all");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("");
  const [city, setCity] = useState("");
  const [sheet, setSheet] = useState<"sector" | "city" | null>(null);
  const [items, setItems] = useState<BrowseItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [complete, setComplete] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const [more, setMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => { const id = setTimeout(() => setQuery(q), 350); return () => clearTimeout(id); }, [q]);
  const idOf = (list: { id: string; name: string }[], name: string) => list.find((i) => i.name === name)?.id;

  const load = useCallback(async (offset: number, pull = false) => {
    const my = ++seq.current;
    if (pull) setRefreshing(true); else if (offset === 0) { setItems(null); setFailed(false); } else setMore(true);
    try {
      const r = await api.browse({ scope, q: query, sector: idOf(sectors.items, sector), city: idOf(cities.items, city), limit: PAGE, offset });
      if (my !== seq.current) return;
      setComplete(r.profile_complete); setTotal(r.total); setFailed(false);
      setItems((c) => (offset === 0 ? r.items : [...(c ?? []), ...r.items]));
    } catch (e) {
      if (my !== seq.current) return;
      if (e instanceof ApiError && e.code === "profile_incomplete") { navigation.reset({ index: 0, routes: [{ name: "Profile" }] }); return; }
      if (e instanceof ApiError && e.code === "consent_required") { navigation.reset({ index: 0, routes: [{ name: "Consent" }] }); return; }
      setFailed(true); setItems([]);
      toast(e instanceof ApiError ? e.message : t("Could not load internships."));
    } finally { if (my === seq.current) { setMore(false); setRefreshing(false); } }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, query, sector, city, sectors.items, cities.items]);
  useEffect(() => { load(0); }, [load]);

  const toggleSave = async (it: BrowseItem) => {
    try {
      await (it.saved ? api.unsave(it.internship_id) : api.save(it.internship_id));
      setItems((c) => (c ?? []).map((x) => (x.internship_id === it.internship_id ? { ...x, saved: !it.saved } : x)));
      toast(it.saved ? t("Removed from saved.") : t("Saved for later."), "success");
    } catch (e) { toast(e instanceof ApiError ? e.message : t("Could not update saved list.")); }
  };

  const filtered = !!(query || sector || city);
  const clear = () => { setQ(""); setQuery(""); setSector(""); setCity(""); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <Header />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(0, true)} tintColor={colors.teal} />}>
        <Text style={styles.eyebrow}>{t("DISCOVER")}</Text>
        <Text style={styles.h1}>{t("Find your internship")}</Text>
        <Text style={styles.sub}>{t("Browse every listing, see where you are eligible, and check your match before you apply.")}</Text>
        <Text style={styles.notice}>ⓘ {t("These are demo listings (synthetic data), not official PMIS vacancies. Apply only on the official PMIS portal.")}</Text>

        <View style={styles.tabs}>
          {([["all", t("All internships")], ["suitable", t("Suitable for me")]] as [Scope, string][]).map(([id, label]) => (
            <Pressable key={id} onPress={() => setScope(id)} style={[styles.tab, scope === id && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: scope === id }}>
              <Text style={[styles.tabTxt, scope === id && { color: colors.tealDark }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput value={q} onChangeText={setQ} placeholder={t("Search title, company or keyword")} placeholderTextColor={colors.faint}
          style={styles.search} autoCapitalize="none" returnKeyType="search" accessibilityLabel={t("Search internships")} />
        <View style={styles.filters}>
          <Pressable onPress={() => setSheet("sector")} style={[styles.filter, !!sector && styles.filterOn]}>
            <Text style={[styles.filterTxt, !!sector && { color: colors.tealDark }]} numberOfLines={1}>{sector || t("All sectors")} ▾</Text>
          </Pressable>
          <Pressable onPress={() => setSheet("city")} style={[styles.filter, !!city && styles.filterOn]}>
            <Text style={[styles.filterTxt, !!city && { color: colors.tealDark }]} numberOfLines={1}>{city || t("All locations")} ▾</Text>
          </Pressable>
          {filtered ? <Pressable onPress={clear} style={styles.clear}><Text style={styles.clearTxt}>{t("Clear")}</Text></Pressable> : null}
        </View>

        {complete === false ? (
          <Text style={styles.notice} onPress={() => navigation.navigate("Profile")}>{t("Complete your profile to see eligibility and match scores.")} <Text style={{ color: colors.teal, fontFamily: fonts.bold }}>{t("Complete profile")}</Text></Text>
        ) : null}
        {items && !failed ? <Text style={styles.count}>{total} {t("internships")}</Text> : null}

        {items === null ? <ActivityIndicator color={colors.teal} size="large" style={{ marginTop: 40 }} /> : null}
        {failed ? (
          <View style={styles.empty}><Text style={styles.emptyH}>{t("Could not load internships.")}</Text><Button title={t("Try again")} onPress={() => load(0)} /></View>
        ) : null}
        {items?.length === 0 && !failed ? (
          <View style={styles.empty}>
            <Text style={styles.emptyH}>{t("No internships found")}</Text>
            <Text style={styles.emptyP}>{scope === "suitable" ? t("No eligible internships for these filters. Add skills to your profile or widen the filters.") : t("Try a different search or clear the filters.")}</Text>
            {filtered ? <Button title={t("Clear filters")} onPress={clear} /> : null}
          </View>
        ) : null}

        {items?.map((j) => <JobCard key={j.internship_id} item={j} onCheck={() => setOpen(j.internship_id)} onSave={() => toggleSave(j)} />)}
        {items && items.length < total ? (
          <Button variant="outline" title={more ? "…" : `${t("Show more")} (${total - items.length})`} loading={more} onPress={() => load(items.length)} />
        ) : null}
      </ScrollView>

      <FilterSheet visible={sheet === "sector"} title={t("Sector")} options={sectors.names} loading={sectors.loading} value={sector} onChange={setSector} onClose={() => setSheet(null)} />
      <FilterSheet visible={sheet === "city"} title={t("Location")} options={cities.names} loading={cities.loading} value={city} onChange={setCity} onClose={() => setSheet(null)} />
      <MatchSheet id={open} onClose={() => setOpen(null)} onProfile={() => navigation.navigate("Profile")} />
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  eyebrow: { color: colors.teal, fontSize: 12, fontFamily: fonts.bold, letterSpacing: 1.5, marginTop: 6 },
  h1: { fontSize: 28, fontFamily: fonts.headXL, color: colors.text, letterSpacing: -0.8, marginTop: 6 },
  sub: { fontSize: 14, color: colors.muted, fontFamily: fonts.body, lineHeight: 21, marginTop: 8 },
  notice: { marginTop: 14, padding: 12, borderRadius: 12, overflow: "hidden", backgroundColor: colors.tealLight, color: colors.text, fontSize: 12.5, fontFamily: fonts.body, lineHeight: 18 },
  tabs: { flexDirection: "row", gap: 4, padding: 4, borderRadius: 14, backgroundColor: colors.chip, marginTop: 18 },
  tab: { flex: 1, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tabOn: { backgroundColor: colors.white },
  tabTxt: { color: colors.muted, fontSize: 13.5, fontFamily: fonts.bold },
  search: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 14, marginTop: 14, fontFamily: fonts.body, fontSize: 14, color: colors.text },
  filters: { flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center" },
  filter: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 12, justifyContent: "center" },
  filterOn: { backgroundColor: colors.tealLight, borderColor: colors.teal },
  filterTxt: { color: colors.text, fontSize: 13, fontFamily: fonts.semibold },
  clear: { height: 42, paddingHorizontal: 12, justifyContent: "center" },
  clearTxt: { color: colors.teal, fontSize: 13, fontFamily: fonts.bold },
  count: { color: colors.muted, fontSize: 13, fontFamily: fonts.semibold, marginTop: 14, marginBottom: 12 },
  empty: { alignItems: "center", gap: 12, padding: 28, marginTop: 20, borderRadius: 20, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.tealBorder, backgroundColor: colors.white },
  emptyH: { fontSize: 17, fontFamily: fonts.bold, color: colors.text, textAlign: "center" },
  emptyP: { fontSize: 13.5, color: colors.muted, fontFamily: fonts.body, textAlign: "center", lineHeight: 20 },
});
