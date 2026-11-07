import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import SelectOther from "../app/components/SelectOther";

const OPTS = ["B.Tech", "B.Sc"];
function Harness({ start = "" }: { start?: string }) {
  const [v, setV] = useState(start);
  return (<><SelectOther id="degree" label="Degree" options={OPTS} value={v} onChange={setV} /><output data-testid="val">{v}</output></>);
}

describe("SelectOther", () => {
  it("picking a listed option shows no free-text box", async () => {
    render(<Harness />);
    await userEvent.selectOptions(screen.getByLabelText("Degree"), "B.Sc");
    expect(screen.getByTestId("val")).toHaveTextContent("B.Sc");
    expect(screen.queryByLabelText("Degree (Other)")).not.toBeInTheDocument();
  });
  it("choosing Other reveals a text box and passes typed text up", async () => {
    render(<Harness />);
    await userEvent.selectOptions(screen.getByLabelText("Degree"), "Other");
    const box = screen.getByLabelText("Degree (Other)");
    await userEvent.type(box, "B.Voc");
    expect(screen.getByTestId("val")).toHaveTextContent("B.Voc");
  });
  it("an existing unlisted value is kept and shown under Other", () => {
    render(<Harness start="Diploma in Mining" />);
    expect(screen.getByLabelText("Degree (Other)")).toHaveValue("Diploma in Mining");
  });
});
