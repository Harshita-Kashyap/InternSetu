import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Choice from "./Choice";
import Field from "./Field";
import TaxPicker from "./TaxPicker";
import { useI18n } from "../i18n";
import { useSetupStyles } from "../screens/SetupLayout";

type Props = {
  label: string; options: string[]; loading?: boolean; value: string; onChange: (v: string) => void;
  searchPlaceholder?: string; otherPlaceholder?: string; limit?: number;
};

/** Searchable single choice from the taxonomy, plus "Other" with a free-text box. An unlisted saved value opens Other prefilled. */
export default function PickOther({ label, options, loading, value, onChange, searchPlaceholder, otherPlaceholder, limit }: Props) {
  const s = useSetupStyles();
  const { t } = useI18n();
  const unlisted = !!value.trim() && !loading && options.length > 0 && !options.includes(value);
  const [otherOn, setOtherOn] = useState(false);
  useEffect(() => { if (unlisted) setOtherOn(true); }, [unlisted]);
  const showOther = otherOn || unlisted;
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={s.h2}>{label}</Text>
      <TaxPicker single options={options} loading={loading} limit={limit}
        selected={!showOther && value ? [value] : []} placeholder={searchPlaceholder}
        onChange={(v) => { setOtherOn(false); onChange(v[0] || ""); }} />
      <View style={s.grid}>
        <Choice mark="" selected={showOther} label={t("Other")} onPress={() => { setOtherOn(true); if (!unlisted) onChange(""); }} />
      </View>
      {showOther ? (
        <View style={{ marginTop: 12 }}>
          <Field label={`${label} (${t("Other")})`} placeholder={otherPlaceholder ?? t("Type here")} value={value} onChangeText={onChange} />
        </View>
      ) : null}
    </View>
  );
}
