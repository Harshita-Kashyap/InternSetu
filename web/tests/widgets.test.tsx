import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import ChipPicker from "../app/components/ChipPicker";
import ThemeToggle from "../app/components/ThemeToggle";
import HtmlLang from "../app/components/HtmlLang";
import RegisterSW from "../app/components/RegisterSW";
import { useToast } from "../app/components/Toast";

const OPTIONS = Array.from({ length: 20 }, (_, i) => `Skill ${i + 1}`);

function Picker() {
  const [sel, setSel] = useState<string[]>([]);
  return <ChipPicker kind="skill" title="Skills" hint="Pick some" options={OPTIONS} selected={sel}
    onToggle={(v) => setSel((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]))} />;
}

describe("ChipPicker", () => {
  it("shows the first 12 options, filters by search, and counts selections", async () => {
    const user = userEvent.setup();
    render(<Picker />);
    expect(screen.getAllByRole("button", { name: /Skill \d+$/ }).filter((b) => b.hasAttribute("aria-pressed"))).toHaveLength(12);
    await user.type(screen.getByRole("searchbox"), "Skill 2");
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(2);   // Skill 2 and Skill 20
    await user.click(screen.getByRole("button", { name: "+ Skill 20" }));
    expect(screen.getByText(/1 selected/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Skill 20" }));
    expect(screen.getByText(/0 selected/)).toBeInTheDocument();
  });
});

describe("ThemeToggle", () => {
  it("flips light and dark and remembers the choice", () => {
    document.documentElement.dataset.theme = "light";
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("internsetu_theme")).toBe("dark");
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});

describe("HtmlLang", () => {
  it("sets the page language for screen readers", () => {
    render(<HtmlLang locale="bn" />);
    expect(document.documentElement.lang).toBe("bn");
  });
});

describe("RegisterSW", () => {
  afterEach(() => { vi.unstubAllEnvs(); });
  it("registers the service worker only in production", () => {
    const register = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, "serviceWorker", { value: { register }, configurable: true });
    vi.stubEnv("NODE_ENV", "development");
    render(<RegisterSW />);
    expect(register).not.toHaveBeenCalled();
    vi.stubEnv("NODE_ENV", "production");
    render(<RegisterSW />);
    expect(register).toHaveBeenCalledWith("/sw.js");
  });
});

describe("useToast", () => {
  function Demo() {
    const { toast, show } = useToast();
    return <><button onClick={() => show("Saved", "success")}>ok</button><button onClick={() => show("Oops")}>bad</button>{toast}</>;
  }
  it("shows an error as an alert, a success as a status, and hides it after a few seconds", () => {
    vi.useFakeTimers();
    render(<Demo />);
    fireEvent.click(screen.getByText("bad"));
    expect(screen.getByRole("alert")).toHaveTextContent("Oops");
    fireEvent.click(screen.getByText("ok"));
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    act(() => { vi.advanceTimersByTime(3300); });
    expect(screen.queryByRole("status")).toBeNull();
    vi.useRealTimers();
  });
});
