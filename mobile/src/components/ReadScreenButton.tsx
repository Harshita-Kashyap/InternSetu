import React from "react";
import { View } from "react-native";
import ReadAloudButton from "./ReadAloudButton";
import { getSpeakable } from "../speak";

/** "Read aloud" for whatever screen is open (text comes from useSpeakable). Reads only when tapped. */
export default function ReadScreenButton() {
  return <View style={{ alignItems: "flex-start" }}><ReadAloudButton getText={getSpeakable} /></View>;
}
