import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import GroupedSkillPicker from "../src/components/GroupedSkillPicker";
import { iconForCategory, orderCategories } from "../src/skillIcons";

const categories = [{ id: "SKC-PROG", name: "Programming Languages" }, { id: "SKC-EVERY", name: "Everyday & Practical Skills" }, { id: "SKC-NEW", name: "Brand New Category" }] as any[];
const prog = Array.from({ length: 15 }, (_, i) => ({ id: `P${i}`, name: `Lang ${i + 1}`, parent_id: "SKC-PROG" }));
const skills = [...prog, { id: "E1", name: "Cooking", parent_id: "SKC-EVERY" }, { id: "X1", name: "Loose skill", parent_id: null }] as any[];

function Harness({ onChange }: { onChange?: (v: string[]) => void }) {
  const [sel, setSel] = useState<string[]>([]);
  return <GroupedSkillPicker skills={skills} categories={categories} selected={sel} onChange={(v) => { setSel(v); onChange?.(v); }} />;
}

describe("skill umbrella cards (mobile)", () => {
  it("puts practical categories first and gives each category an icon", () => {
    expect(orderCategories(categories).map((c: any) => c.id)).toEqual(["SKC-EVERY", "SKC-PROG", "SKC-NEW"]);
    expect(iconForCategory("SKC-EVERY")).toBe("🛠️");
    expect(iconForCategory("SKC-NEW")).toBe("📦");
  });

  it("shows a card per category with its skills inside, and a card for loose skills", async () => {
    await render(<Harness />);
    for (const name of ["Everyday & Practical Skills", "Programming Languages", "Other skills"]) expect(screen.getByLabelText(name)).toBeTruthy();
    expect(screen.queryByText("Brand New Category")).toBeNull();
    expect(screen.getByText("Cooking")).toBeTruthy();
  });

  it("folds long categories, can show all, counts picks and lists them in a tray", async () => {
    const seen: string[][] = [];
    await render(<Harness onChange={(v) => seen.push(v)} />);
    expect(screen.queryByText("Lang 12")).toBeNull();                 // only the first 8 of 15 are shown
    await fireEvent.press(screen.getByText("Show all (+7)"));
    expect(screen.getByText("Lang 12")).toBeTruthy();
    await fireEvent.press(screen.getByText("Lang 12"));
    expect(seen.at(-1)).toEqual(["Lang 12"]);
    expect(screen.getByText("1/15")).toBeTruthy();                      // card badge
    expect(screen.getByText("1 selected")).toBeTruthy();                // tray heading
    await fireEvent.press(screen.getByText("Show fewer"));
    expect(screen.getAllByText("Lang 12").length).toBeGreaterThan(0);   // a chosen skill stays visible when folded
  });

  it("search opens matching cards, and Clear all empties the selection", async () => {
    const seen: string[][] = [];
    await render(<Harness onChange={(v) => seen.push(v)} />);
    await fireEvent.changeText(screen.getByPlaceholderText("Search…"), "lang 1");
    expect(screen.queryByLabelText("Everyday & Practical Skills")).toBeNull();
    await fireEvent.press(screen.getByText("Lang 13"));
    expect(seen.at(-1)).toEqual(["Lang 13"]);
    await fireEvent.press(screen.getByLabelText("Clear all"));
    expect(seen.at(-1)).toEqual([]);
  });
});
