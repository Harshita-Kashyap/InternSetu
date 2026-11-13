import React from "react";
import { Text } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }), SafeAreaView: ({ children }: { children: React.ReactNode }) => children, SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children }));

jest.mock("@react-navigation/native", () => ({ useNavigation: () => ({ navigate: jest.fn() }), useFocusEffect: () => {} }));

import Ring from "../src/components/Ring";
import FadeIn from "../src/components/FadeIn";
import Stepper from "../src/components/Stepper";
import GroupedSkillPicker from "../src/components/GroupedSkillPicker";
import { ToastProvider, useToast } from "../src/components/Toast";
import { I18nProvider, useI18n } from "../src/i18n";
import { setFontScript } from "../src/theme";

describe("small components", () => {
  it("Ring shows the match percentage", async () => {
    await render(<Ring value={72.6} />);
    expect(screen.getByText("72.6%")).toBeTruthy();
  });
  it("FadeIn renders its children", async () => {
    await render(<FadeIn><Text>hello</Text></FadeIn>);
    expect(screen.getByText("hello")).toBeTruthy();
  });
  it("Stepper renders for each step", async () => {
    for (const n of [1, 2, 3] as const) { const r = await render(<Stepper current={n} />); expect(r.toJSON()).not.toBeNull(); await r.unmount(); }
  });
});

describe("GroupedSkillPicker", () => {
  const categories = [{ id: "C1", name: "Office" }, { id: "C2", name: "Tech" }];
  const skills = [{ id: "S1", name: "Excel", parent_id: "C1" }, { id: "S2", name: "Typing", parent_id: "C1" }, { id: "S3", name: "Python", parent_id: "C2" }];
  it("lists skills, filters by search and reports selections", async () => {
    const onChange = jest.fn();
    await render(<GroupedSkillPicker skills={skills} categories={categories} selected={[]} onChange={onChange} />);
    await fireEvent.changeText(screen.getByPlaceholderText("Search…"), "pyth");
    expect(screen.queryByText("Excel")).toBeNull();
    await fireEvent.press(screen.getByText("Python"));
    expect(onChange).toHaveBeenLastCalledWith(["Python"]);
  });
});

describe("toast", () => {
  it("shows the message it is given", async () => {
    jest.useFakeTimers();
    function Demo() { const toast = useToast(); return <Text onPress={() => toast("Saved!", "success")}>go</Text>; }
    await render(<ToastProvider><Demo /></ToastProvider>);
    await fireEvent.press(screen.getByText("go"));
    expect(screen.getByText("Saved!")).toBeTruthy();
    await act(async () => { jest.advanceTimersByTime(3200); });
    jest.useRealTimers();
  });
});

describe("language provider", () => {
  afterEach(() => setFontScript("en"));
  function Probe() { const { t, lang, setLang } = useI18n(); return <><Text testID="lang">{lang}</Text><Text testID="speak">{t("Speak")}</Text><Text testID="unknown">{t("A sentence nobody translated")}</Text><Text onPress={() => setLang("hi", false)}>to-hindi</Text><Text onPress={() => setLang("bn", false)}>to-bengali</Text></>; }
  it("translates known text, falls back to English for the rest, and switches the font family with the language", async () => {
    await render(<I18nProvider><Probe /></I18nProvider>);
    expect(screen.getByTestId("speak").props.children).toBe("Speak");
    await fireEvent.press(screen.getByText("to-hindi"));
    expect(screen.getByTestId("lang").props.children).toBe("hi");
    expect(screen.getByTestId("speak").props.children).toBe("बोलकर लिखें");
    expect(screen.getByTestId("unknown").props.children).toBe("A sentence nobody translated");
    const { fonts } = require("../src/theme");
    expect(fonts.body).toBe("NotoSansDevanagari_400Regular");
    await fireEvent.press(screen.getByText("to-bengali"));
    expect(screen.getByTestId("speak").props.children).toBe("বলে লিখুন");
    expect(fonts.body).toBe("NotoSansBengali_400Regular");
  });
});
