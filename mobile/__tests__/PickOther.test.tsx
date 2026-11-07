import React, { useState } from "react";
import { Text } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import PickOther from "../src/components/PickOther";

const OPTS = ["B.Tech", "B.Sc"];
function Harness({ start = "" }: { start?: string }) {
  const [v, setV] = useState(start);
  return (
    <>
      <PickOther label="Degree" options={OPTS} value={v} onChange={setV} otherPlaceholder="Type here" />
      <Text testID="val">{v}</Text>
    </>
  );
}

describe("PickOther", () => {
  it("picking a listed option stores it and shows no text box", async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByText("B.Sc"));
    expect(screen.getByTestId("val").props.children).toBe("B.Sc");
    expect(screen.queryByPlaceholderText("Type here")).toBeNull();
  });
  it("Other reveals a text box and passes typed text up", async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByText("Other"));
    await fireEvent.changeText(screen.getByPlaceholderText("Type here"), "B.Voc");
    expect(screen.getByTestId("val").props.children).toBe("B.Voc");
  });
  it("an existing unlisted value opens Other prefilled", async () => {
    await render(<Harness start="Diploma in Mining" />);
    expect(screen.getByPlaceholderText("Type here").props.value).toBe("Diploma in Mining");
  });
});
