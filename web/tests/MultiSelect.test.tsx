import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import MultiSelect from "../app/components/MultiSelect";

const OPTS = [{ id: "S1", name: "Agriculture" }, { id: "S2", name: "Banking" }, { id: "S3", name: "Healthcare" }];
function Harness() {
  const [v, setV] = useState<string[]>([]);
  return (<><MultiSelect label="Sector" options={OPTS} value={v} onChange={setV} /><output data-testid="val">{v.join(",")}</output></>);
}

describe("MultiSelect", () => {
  it("selects several options and shows removable chips with a count", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: /Sector/ }));
    await userEvent.click(screen.getByLabelText("Agriculture"));
    await userEvent.click(screen.getByLabelText("Healthcare"));
    expect(screen.getByTestId("val")).toHaveTextContent("S1,S3");
    expect(screen.getByRole("button", { name: "Remove Agriculture" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove Agriculture" }));
    expect(screen.getByTestId("val")).toHaveTextContent("S3");
  });
  it("search narrows the list and shows an empty message", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: /Sector/ }));
    await userEvent.type(screen.getByRole("searchbox"), "bank");
    expect(screen.getByLabelText("Banking")).toBeInTheDocument();
    expect(screen.queryByLabelText("Agriculture")).not.toBeInTheDocument();
    await userEvent.clear(screen.getByRole("searchbox"));
    await userEvent.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.getByText("No matches found.")).toBeInTheDocument();
  });
  it("Escape closes the list", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: /Sector/ }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });
});
