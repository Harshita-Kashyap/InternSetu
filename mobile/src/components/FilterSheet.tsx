import React, { useMemo } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../i18n";
import TaxPicker from "./TaxPicker";
import Button from "./Button";
import { useTheme, Colors, fonts } from "../theme";

type Props = { visible: boolean; title: string; options: string[]; single?: boolean; loading?: boolean; value: string[]; onChange: (v: string[]) => void; onClose: () => void };

/** Bottom sheet with a searchable list. Multi-select by default; pass `single` to keep one value (used for the sector and city filters). */
export default function FilterSheet({ visible, title, options, single, loading, value, onChange, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useI18n();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t("Close")} />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <Text style={styles.title}>{title}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
            <TaxPicker single={single} options={options} loading={loading} selected={value} onChange={onChange} placeholder={t("Search") + "…"} limit={40} />
          </ScrollView>
          <View style={styles.actions}>
            <View style={{ flex: 1 }}><Button variant="outline" title={t("Clear")} onPress={() => { onChange([]); onClose(); }} /></View>
            <View style={{ flex: 1 }}><Button title={t("Done")} onPress={onClose} /></View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(8,20,22,0.55)" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 },
  grab: { alignSelf: "center", width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 14 },
  title: { fontSize: 18, fontFamily: fonts.head, color: colors.text },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
});
