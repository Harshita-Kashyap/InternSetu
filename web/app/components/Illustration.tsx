import { ART_ANIM, ArtName } from "../lib/illustrations";

/** Decorative, gently animated illustration (animation stops for people who prefer reduced motion;  the text next to it carries the meaning, so it is hidden from screen readers). */
export default function Illustration({ name, className = "" }: { name: ArtName; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`illus ${className}`} src={`data:image/svg+xml;utf8,${encodeURIComponent(ART_ANIM[name])}`} alt="" aria-hidden="true" width={240} height={180} />;
}
