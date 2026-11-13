import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";

let current = "";
/** Text of the screen the person is looking at; the Read aloud button in the header/auth card reads it. */
export const getSpeakable = () => current;

/** Call at the top of a screen: `useSpeakable([title, subtitle].join(". "))`. */
export function useSpeakable(text: string) {
  useFocusEffect(useCallback(() => { current = text; return () => { if (current === text) current = ""; }; }, [text]));
}
