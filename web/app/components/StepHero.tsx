"use client";

import Illustration from "./Illustration";
import ReadAloud from "./ReadAloud";
import { ArtName } from "../lib/illustrations";

/** Top of a setup step: illustration, eyebrow, question and help text, plus a Read aloud button. Side by side on wide screens, stacked on phones. */
export default function StepHero({ art, eyebrow, title, text }: { art: ArtName; eyebrow?: string; title: string; text?: string }) {
  return (
    <div className="step-hero">
      <Illustration name={art} />
      <div className="step-hero-text">
        {eyebrow ? <p className="profile-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {text ? <p>{text}</p> : null}
        <ReadAloud text={[title, text].filter(Boolean).join(". ")} />
      </div>
    </div>
  );
}
