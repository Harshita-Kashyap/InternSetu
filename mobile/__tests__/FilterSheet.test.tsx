import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import FilterSheet from "../src/components/FilterSheet";

const OPTS = ["Agriculture", "Banking", "Healthcare"];

describe("FilterSheet", () => {
  it("multi mode adds and removes values", async () => {
    const onChange = jest.fn();
    const { rerender } = await render(<FilterSheet visible title="Sector" options={OPTS} value={[]} onChange={onChange} onClose={() => {}} />);
    await fireEvent.press(screen.getByText("Agriculture"));
    expect(onChange).toHaveBeenLastCalledWith(["Agriculture"]);
    await rerender(<FilterSheet visible title="Sector" options={OPTS} value={["Agriculture"]} onChange={onChange} onClose={() => {}} />);
    await fireEvent.press(screen.getAllByText("Healthcare")[0]);
    expect(onChange).toHaveBeenLastCalledWith(["Agriculture", "Healthcare"]);
    await fireEvent.press(screen.getAllByText("Agriculture")[0]);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
  it("single mode keeps one value", async () => {
    const onChange = jest.fn();
    await render(<FilterSheet single visible title="Location" options={OPTS} value={["Banking"]} onChange={onChange} onClose={() => {}} />);
    await fireEvent.press(screen.getAllByText("Healthcare")[0]);
    expect(onChange).toHaveBeenLastCalledWith(["Healthcare"]);
  });
  it("Clear empties the selection and closes", async () => {
    const onChange = jest.fn(), onClose = jest.fn();
    await render(<FilterSheet visible title="Sector" options={OPTS} value={["Banking"]} onChange={onChange} onClose={onClose} />);
    await fireEvent.press(screen.getByText("Clear"));
    expect(onChange).toHaveBeenCalledWith([]);
    expect(onClose).toHaveBeenCalled();
  });
});
