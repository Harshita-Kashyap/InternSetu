import React from "react";
import { Text } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

const mockSpeak = jest.fn(); const mockStop = jest.fn();
jest.mock("expo-speech", () => ({ speak: (...a: unknown[]) => mockSpeak(...a), stop: () => mockStop() }));
jest.mock("@react-navigation/native", () => { const R = require("react"); return { useFocusEffect: (cb: () => void | (() => void)) => R.useEffect(cb, [cb]) }; });
let netCb: ((s: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void) | null = null;
jest.mock("@react-native-community/netinfo", () => ({ __esModule: true, default: { addEventListener: (cb: typeof netCb) => { netCb = cb; return () => { netCb = null; }; } } }));

import Button from "../src/components/Button";
import ReadAloudButton from "../src/components/ReadAloudButton";
import ReadScreenButton from "../src/components/ReadScreenButton";
import OfflineBanner from "../src/components/OfflineBanner";
import MicButton from "../src/components/MicButton";
import Illustration from "../src/components/Illustration";
import { getSpeakable, useSpeakable } from "../src/speak";

beforeEach(() => { mockSpeak.mockClear(); mockStop.mockClear(); });

describe("Button", () => {
  it("calls onPress and ignores presses while loading", async () => {
    const onPress = jest.fn();
    const { rerender } = await render(<Button title="Save" onPress={onPress} />);
    await fireEvent.press(screen.getByText("Save"));
    expect(onPress).toHaveBeenCalledTimes(1);
    await rerender(<Button title="Save" onPress={onPress} loading />);
    await fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("read aloud", () => {
  it("speaks only after a tap, in the app language voice, and stops on the second tap", async () => {
    await render(<ReadAloudButton text="Your matches" />);
    expect(mockSpeak).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button"));
    expect(mockSpeak).toHaveBeenCalledWith("Your matches", expect.objectContaining({ language: "en-IN" }));
    await fireEvent.press(screen.getByRole("button"));
    expect(mockStop).toHaveBeenCalled();
  });

  it("ReadScreenButton reads the text a screen registered with useSpeakable", async () => {
    function Screen() { useSpeakable("Create your account"); return <><Text>screen</Text><ReadScreenButton /></>; }
    const { unmount } = await render(<Screen />);
    expect(getSpeakable()).toBe("Create your account");
    await fireEvent.press(screen.getByRole("button"));
    expect(mockSpeak.mock.calls[0][0]).toBe("Create your account");
    await unmount();
    expect(getSpeakable()).toBe("");
  });

  it("says nothing when the screen has no text", async () => {
    await render(<ReadScreenButton />);
    await fireEvent.press(screen.getByRole("button"));
    expect(mockSpeak).not.toHaveBeenCalled();
  });
});

describe("OfflineBanner", () => {
  it("shows a warning only while the phone has no internet", async () => {
    await render(<OfflineBanner />);
    const MSG = /No internet/;
    expect(screen.queryByText(MSG)).toBeNull();
    await act(async () => { netCb?.({ isConnected: false, isInternetReachable: false }); });
    expect(screen.getByText(MSG)).toBeTruthy();
    await act(async () => { netCb?.({ isConnected: true, isInternetReachable: true }); });
    expect(screen.queryByText(MSG)).toBeNull();
  });
});

describe("other components", () => {
  it("MicButton hides itself when the native speech module is missing (Expo Go)", async () => {
    const { toJSON } = await render(<MicButton onText={() => {}} />);
    expect(toJSON()).toBeNull();
  });
  it("Illustration renders without crashing", async () => {
    const { toJSON } = await render(<Illustration name="welcome" width={120} />);
    expect(toJSON()).not.toBeNull();
  });
});
