import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import GroupedSkillPicker from "../app/components/GroupedSkillPicker";
import { iconForCategory, orderCategories } from "../app/lib/skillIcons";

const categories = [
  { id: "SKC-PROG", name: "Programming Languages" }, { id: "SKC-EVERY", name: "Everyday & Practical Skills" }, { id: "SKC-NEW", name: "Brand New Category" },
];
const prog = Array.from({ length: 15 }, (_, i) => ({ id: `P${i}`, name: `Lang ${i + 1}`, parent_id: "SKC-PROG" }));
const skills = [...prog, { id: "E1", name: "Cooking", parent_id: "SKC-EVERY" }, { id: "E2", name: "Driving", parent_id: "SKC-EVERY" }, { id: "X1", name: "Loose skill", parent_id: null }] as any[];

function Harness() {
  const [sel, setSel] = useState<string[]>([]);
  return <GroupedSkillPicker title="Skills" hint="Pick" skills={skills} categories={categories as any} selected={sel}
    onToggle={(n) => setSel((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]))} onClear={() => setSel([])} />;
}

describe("skill umbrella cards", () => {
  it("orders practical categories first and gives every category an icon", () => {
    expect(orderCategories(categories).map((c) => c.id)).toEqual(["SKC-EVERY", "SKC-PROG", "SKC-NEW"]);
    expect(iconForCategory("SKC-EVERY")).toBe("🛠️");
    expect(iconForCategory("SKC-NEW")).toBe("📦");
  });

  it("shows one rectangle per category with its skills inside, plus a card for loose skills", () => {
    render(<Harness />);
    const cards = screen.getAllByRole("article");
    expect(cards.map((c) => c.getAttribute("aria-label"))).toEqual(["Everyday & Practical Skills", "Programming Languages", "Other skills"]);
    expect(within(cards[0]).getByRole("button", { name: /Cooking/ })).toBeInTheDocument();
    expect(screen.queryByText("Brand New Category")).toBeNull();      // empty categories are not shown
  });

  it("folds long categories, can show all, and keeps a chosen skill visible", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const prog = screen.getByRole("article", { name: "Programming Languages" });
    expect(within(prog).getAllByRole("button", { pressed: false })).toHaveLength(8);
    await user.click(within(prog).getByRole("button", { name: /Show all \(\+7\)/ }));
    expect(within(prog).getAllByRole("button", { pressed: false })).toHaveLength(15);
    await user.click(within(prog).getByRole("button", { name: "Show fewer" }));
    await user.click(within(prog).getByRole("button", { name: /Lang 3$/ }));
    expect(within(prog).getByText("1/15")).toBeInTheDocument();
  });

  it("search opens every matching card, also matches the category name, and Clear all empties the selection", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByRole("searchbox"), "lang 1");
    const prog = screen.getByRole("article", { name: "Programming Languages" });
    expect(within(prog).getAllByRole("button", { pressed: false }).length).toBe(7);      // Lang 1 and Lang 10-15
    expect(screen.queryByRole("article", { name: "Everyday & Practical Skills" })).toBeNull();
    await user.click(within(prog).getAllByRole("button", { pressed: false })[0]);
    expect(screen.getByText(/1 selected/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByText(/0 selected/)).toBeInTheDocument();
    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "practical");
    expect(screen.getByRole("article", { name: "Everyday & Practical Skills" })).toBeInTheDocument();
  });
});
