import { HeroAppWord } from "./HeroAppWord";

/**
 * BACKUP hero headline — the playful rotating Tinder → Hinge → Bumble variant.
 *
 * Not wired into the live home, which uses the static
 * "Your dating data, finally visualized." headline. To bring this back, render
 * <HeroHeadlineRotating /> in place of that <h1> in the home Hero (and consider
 * switching the eyebrow back to "See how you stack up").
 */
export function HeroHeadlineRotating() {
  return (
    <h1 className="mt-5 text-[clamp(40px,6vw,68px)] leading-[1.02] font-bold tracking-[-0.035em] text-balance text-gray-900">
      Your <HeroAppWord /> data, finally visualized.
    </h1>
  );
}
