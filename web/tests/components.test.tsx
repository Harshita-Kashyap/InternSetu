import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Ring from "../app/components/Ring";
import Illustration from "../app/components/Illustration";
import StepHero from "../app/components/StepHero";
import ReadAloud from "../app/components/ReadAloud";
import ReadPage from "../app/components/ReadPage";
import MicButton from "../app/components/MicButton";
import OfflineBanner from "../app/components/OfflineBanner";
import { ART, ART_ANIM } from "../app/lib/illustrations";

function fakeSpeech() {
  const speak = vi.fn(); const cancel = vi.fn();
  (window as any).speechSynthesis = { speak, cancel };
  (window as any).SpeechSynthesisUtterance = class { text: string; lang = ""; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(t: string) { this.text = t; } };
  return { speak, cancel };
}
const noSpeech = () => { delete (window as any).speechSynthesis; delete (window as any).SpeechRecognition; delete (window as any).webkitSpeechRecognition; };

describe("Ring", () => {
  it("shows the rounded percentage and an accessible label", () => {
    render(<Ring value={72.6} />);
    expect(screen.getByText("73%")).toBeInTheDocument();
    expect(screen.getByLabelText("72.6% match")).toBeInTheDocument();
  });
});

describe("illustrations", () => {
  it("has a static and an animated version of every scene, and the animated one respects reduced motion", () => {
    expect(Object.keys(ART).sort()).toEqual(Object.keys(ART_ANIM).sort());
    for (const k of Object.keys(ART) as (keyof typeof ART)[]) {
      expect(ART[k]).not.toContain("<style>");
      expect(ART_ANIM[k]).toContain("prefers-reduced-motion");
    }
  });
  it("renders as a decorative image that screen readers skip", () => {
    const { container } = render(<Illustration name="lock" />);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("alt")).toBe("");
    expect(img.getAttribute("aria-hidden")).toBe("true");
    expect(img.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
  });
  it("StepHero shows the question and help text", () => {
    render(<StepHero art="education" eyebrow="STEP 1 OF 3" title="Your education" text="Tell us what you studied." />);
    expect(screen.getByRole("heading", { name: "Your education" })).toBeInTheDocument();
    expect(screen.getByText("Tell us what you studied.")).toBeInTheDocument();
  });
});

describe("speech output", () => {
  afterEach(() => { noSpeech(); document.body.innerHTML = ""; });

  it("ReadAloud is hidden when the browser cannot speak", () => {
    noSpeech();
    const { container } = render(<ReadAloud text="hello" />);
    expect(container.querySelector("button")).toBeNull();
  });
  it("ReadAloud speaks only after a tap and stops on the second tap", async () => {
    const { speak, cancel } = fakeSpeech();
    render(<ReadAloud text="Hello there" />);
    const btn = await screen.findByRole("button");
    expect(speak).not.toHaveBeenCalled();
    fireEvent.click(btn);
    expect(speak).toHaveBeenCalledTimes(1);
    expect((speak.mock.calls[0][0] as { text: string; lang: string }).text).toBe("Hello there");
    expect((speak.mock.calls[0][0] as { lang: string }).lang).toBe("en-IN");
    fireEvent.click(btn);
    expect(cancel).toHaveBeenCalled();
  });
  it("ReadPage reads the text of <main>", async () => {
    const { speak } = fakeSpeech();
    render(<><main>Your internship matches</main><ReadPage /></>);
    fireEvent.click(await screen.findByRole("button"));
    expect((speak.mock.calls[0][0] as { text: string }).text).toContain("Your internship matches");
  });
});

describe("MicButton (speech input)", () => {
  afterEach(() => noSpeech());
  it("is hidden when speech recognition is not available", () => {
    noSpeech();
    const { container } = render(<MicButton onText={() => {}} />);
    expect(container.querySelector("button")).toBeNull();
  });
  it("passes the heard words to the callback", async () => {
    let inst: any;
    (window as any).webkitSpeechRecognition = class {
      lang = ""; interimResults = true; onresult: any; onend: any; onerror: any;
      constructor() { inst = this; }
      start() { this.onresult({ results: [[{ transcript: "  python  " }]] }); this.onend(); }
      stop() {}
    };
    const got: string[] = [];
    render(<MicButton onText={(t) => got.push(t)} />);
    await act(async () => { fireEvent.click(await screen.findByRole("button")); });
    expect(got).toEqual(["python"]);
    expect(inst.lang).toBe("en-IN");
  });
});

describe("OfflineBanner", () => {
  beforeEach(() => Object.defineProperty(navigator, "onLine", { value: true, configurable: true }));
  it("appears when the connection is lost and disappears when it returns", () => {
    render(<OfflineBanner />);
    expect(screen.queryByRole("status")).toBeNull();
    act(() => { Object.defineProperty(navigator, "onLine", { value: false, configurable: true }); window.dispatchEvent(new Event("offline")); });
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => { Object.defineProperty(navigator, "onLine", { value: true, configurable: true }); window.dispatchEvent(new Event("online")); });
    expect(screen.queryByRole("status")).toBeNull();
  });
});
