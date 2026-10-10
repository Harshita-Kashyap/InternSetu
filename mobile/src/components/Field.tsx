import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors, fonts } from "../theme";

type Props = TextInputProps & { label: string; secure?: boolean; rightLabel?: string; onRightPress?: () => void; hint?: string };

export default function Field({ label, secure, rightLabel, onRightPress, hint, ...rest }: Props) {
  const [focus, setFocus] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ marginBottom: 20 }}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        {rightLabel ? (
          <Pressable onPress={onRightPress} hitSlop={8}>
            <Text style={styles.link}>{rightLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <View>
        <TextInput
          {...rest}
          secureTextEntry={secure && hidden}
          placeholderTextColor="#9aa5aa"
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={[styles.input, focus && styles.focus, secure && { paddingRight: 70 }]}
        />
        {secure ? (
          <Pressable style={styles.show} onPress={() => setHidden(!hidden)} hitSlop={8}>
            <Text style={styles.link}>{hidden ? "Show" : "Hide"}</Text>
          </Pressable>
        ) : null}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
  link: { fontSize: 12.5, fontFamily: fonts.bold, color: colors.teal },
  input: {
    height: 52, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.creamLight,
    paddingHorizontal: 15, fontSize: 14, fontFamily: fonts.body, color: colors.text,
  },
  focus: { borderColor: colors.teal, backgroundColor: colors.tealLight },
  show: { position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" },
  hint: { marginTop: 7, fontSize: 12, color: colors.muted, fontFamily: fonts.body, lineHeight: 18 },
});
